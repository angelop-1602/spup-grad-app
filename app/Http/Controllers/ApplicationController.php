<?php

namespace App\Http\Controllers;

use App\Http\Requests\Application\StoreApplicationRequest;
use App\Http\Requests\Application\UpdateApplicationRequest;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\SystemHealthCheck;
use App\Support\ApplicationWorkflowService;
use App\Support\GuestApplicationDraftDetails;
use App\Support\ProfilePhoto;
use App\Support\RequirementFileStorage;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Client\Response as HttpResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\TemplateProcessor;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApplicationController extends Controller
{
    private const APPLICATION_PDF_CACHE_DISK = 'local';

    private const APPLICATION_PDF_CACHE_DIR = 'application-pdf-cache';

    private const APPLICATION_PDF_CACHE_VERSION = 'v4';

    private const FREECONVERT_TRANSIENT_STATUSES = [408, 425, 429, 500, 502, 503, 504];

    private const COLLEGE_EXPORT_MEDIUM_FONT_LIMIT = 55;

    private const COLLEGE_EXPORT_SMALL_FONT_LIMIT = 70;

    private const COLLEGE_EXPORT_NORMAL_FONT_SIZE = 9;

    private const COLLEGE_EXPORT_MEDIUM_FONT_SIZE = 8;

    private const COLLEGE_EXPORT_SMALL_FONT_SIZE = 7;

    /**
     * The application template is a fixed one-page form. Long user-provided
     * values must stay visually compact so table rows do not push the PDF onto
     * a blank second page during DOCX conversion.
     */
    private const COMPACT_EXPORT_NORMAL_LIMIT = 32;

    private const COMPACT_EXPORT_MEDIUM_LIMIT = 50;

    private const COMPACT_EXPORT_SMALL_LIMIT = 70;

    /**
     * Display the dashboard.
     */
    public function dashboard(Request $request): Response
    {
        $currentWindow = ApplicationWindow::current();
        $currentApplication = null;

        if ($currentWindow) {
            $currentApplication = $request->user()
                ->applications()
                ->where('window_id', $currentWindow->id)
                ->with(['window', 'department', 'course', 'subjectEnrollments'])
                ->first();
        }

        return Inertia::render('dashboard', [
            'currentApplication' => $currentApplication,
            'currentWindow' => $currentWindow,
        ]);
    }

    /**
     * Display a listing of the user's applications.
     */
    public function index(Request $request): Response
    {
        $currentWindow = ApplicationWindow::current();
        $user = $request->user();

        // Get all applications with relationships
        $allApplications = $user->applications()
            ->with([
                'window',
                'department',
                'course',
                'subjectEnrollments',
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,last_name,middle_name,suffix,photo_path',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Separate into current and past applications
        $currentApplications = collect();
        $pastApplications = collect();

        foreach ($allApplications as $application) {
            if ($currentWindow && $application->window_id === $currentWindow->id) {
                $currentApplications->push($application);
            } else {
                $pastApplications->push($application);
            }
        }

        return Inertia::render('applications/index', [
            'currentApplications' => $currentApplications,
            'pastApplications' => $pastApplications,
            'currentWindow' => $currentWindow,
        ]);
    }

    /**
     * Show the form for creating a new application.
     */
    public function create(Request $request): Response
    {
        $currentWindow = ApplicationWindow::current();

        if (! $currentWindow) {
            return redirect()->route('applications.index')
                ->with('error', 'No active application window.');
        }

        // Check if user already has an application for this window
        $existingApplication = $request->user()
            ->applications()
            ->where('window_id', $currentWindow->id)
            ->first();

        if ($existingApplication) {
            return redirect()->route('applications.edit', $existingApplication)
                ->with('info', 'You already have an application for this window. You can edit it here.');
        }

        $profile = $request->user()->profile;
        $departments = \App\Models\Department::with([
            'courses' => function ($query) {
                $query->active()->orderBy('name');
            },
            'courses.majors' => function ($query) {
                $query->active()->orderBy('name');
            },
        ])->active()->orderBy('name')->get();

        return Inertia::render('applications/create', [
            'window' => $currentWindow,
            'profile' => $profile,
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created application.
     */
    public function store(StoreApplicationRequest $request, ApplicationWorkflowService $workflow): RedirectResponse
    {
        $user = $request->user();

        // Check if user already has an application for this window
        $existingApplication = $user->applications()
            ->where('window_id', $request->window_id)
            ->first();

        if ($existingApplication) {
            return redirect()->route('applications.edit', $existingApplication)
                ->with('error', 'You already have an application for this window.');
        }

        $workflow->createApplicationForUser($user, $request->validated(), $request->file('photo'));

        return redirect()->route('applications.index')
            ->with('success', 'Application submitted successfully. Your profile has been updated with the information you provided.');
    }

    /**
     * Display the specified application.
     */
    public function show(
        Request $request,
        Application $application,
        ApplicationWorkflowService $workflow,
        GuestApplicationDraftDetails $draftDetails,
    ): Response
    {
        // Ensure the application belongs to the user
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        $application->load([
            'window',
            'department',
            'course',
            'subjectEnrollments',
            'requirements.children',
            'user.profile',
        ]);

        $workflow->ensureRequirements($application);

        return Inertia::render('applications/show', [
            'application' => $application,
            'profile' => $request->user()->profile,
            'tracking' => $draftDetails->trackingForApplication($application),
        ]);
    }

    /**
     * Generate an application form download from the latest application data.
     *
     * This method reuses a cached PDF when the application, requirements, subjects,
     * user profile, and template have not changed. Data changes produce a new cache
     * key, so the next download regenerates the document.
     *
     * Note: DOCX fallback downloads are not cached because they represent a failed
     * conversion attempt and should be retried later.
     */
    public static function generatePdf(Application $application): BinaryFileResponse
    {
        self::loadApplicationExportData($application);

        $fileName = self::applicationExportFileName($application, 'pdf');
        $pdfCachePath = self::applicationPdfCachePath($application);

        if (Storage::disk(self::APPLICATION_PDF_CACHE_DISK)->exists($pdfCachePath)) {
            return self::downloadStoredApplicationPdf($pdfCachePath, $fileName);
        }

        $docx = self::buildApplicationDocx($application);

        try {
            $pdfPath = self::convertDocxToPdf($docx['path']);
        } catch (\Throwable $e) {
            Log::warning('Application PDF conversion failed; returning DOCX fallback.', [
                'message' => $e->getMessage(),
            ]);
            SystemHealthCheck::record('pdf_conversion', 'warning', 'PDF conversion failed; DOCX fallback was returned.');
            app(SystemEventLogger::class)->log(
                module: 'document',
                action: 'pdf_conversion.fallback_docx',
                message: 'Application PDF conversion failed; DOCX fallback was returned.',
                status: 'warning',
                severity: 'warning',
                subject: $application,
                meta: ['error' => $e->getMessage()],
            );

            return self::downloadApplicationDocx($docx);
        }

        @unlink($docx['path']);
        $storedPdfPath = self::storeApplicationPdfCache($application, $pdfPath, $pdfCachePath);
        SystemHealthCheck::record('pdf_conversion', 'ok', 'Application DOCX converted to PDF successfully.');
        app(SystemEventLogger::class)->log(
            module: 'document',
            action: 'pdf_conversion.success',
            message: 'Application DOCX converted to PDF successfully.',
            subject: $application,
            meta: ['cached' => (bool) $storedPdfPath],
        );

        if ($storedPdfPath) {
            @unlink($pdfPath);

            return self::downloadStoredApplicationPdf($storedPdfPath, $fileName);
        }

        return response()->download($pdfPath, $fileName, [
            'Content-Type' => 'application/pdf',
        ])->deleteFileAfterSend(true);
    }

    /**
     * @param  array{path: string, file_name: string}  $docx
     */
    private static function downloadApplicationDocx(array $docx): BinaryFileResponse
    {
        return response()->download($docx['path'], $docx['file_name'], [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    private static function downloadStoredApplicationPdf(string $storagePath, string $fileName): BinaryFileResponse
    {
        return response()->download(Storage::disk(self::APPLICATION_PDF_CACHE_DISK)->path($storagePath), $fileName, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private static function storeApplicationPdfCache(Application $application, string $pdfPath, string $cachePath): ?string
    {
        $contents = file_get_contents($pdfPath);

        if ($contents === false || ! str_starts_with($contents, '%PDF')) {
            return null;
        }

        $disk = Storage::disk(self::APPLICATION_PDF_CACHE_DISK);

        if (! $disk->put($cachePath, $contents)) {
            return null;
        }

        self::pruneApplicationPdfCache($application, $cachePath);

        return $cachePath;
    }

    private static function pruneApplicationPdfCache(Application $application, string $keepPath): void
    {
        $disk = Storage::disk(self::APPLICATION_PDF_CACHE_DISK);
        $directory = self::APPLICATION_PDF_CACHE_DIR.'/'.$application->getKey();

        foreach ($disk->files($directory) as $path) {
            if ($path !== $keepPath && str_ends_with($path, '.pdf')) {
                $disk->delete($path);
            }
        }
    }

    private static function applicationPdfCachePath(Application $application): string
    {
        return self::APPLICATION_PDF_CACHE_DIR.'/'.$application->getKey().'/'.self::applicationPdfCacheKey($application).'.pdf';
    }

    private static function applicationPdfCacheKey(Application $application): string
    {
        $application = Application::query()
            ->with([
                'window',
                'department',
                'course',
                'subjectEnrollments',
                'requirements.approvedByCoordinator.departments',
                'user.profile',
                'approvedByCoordinator.departments',
            ])
            ->find($application->getKey()) ?? self::loadApplicationExportData($application);

        $templatePath = public_path('GraduationApplicationFormTemplate.docx');
        $profile = $application->user?->profile;

        $payload = [
            'version' => self::APPLICATION_PDF_CACHE_VERSION,
            'template_mtime' => file_exists($templatePath) ? filemtime($templatePath) : null,
            'application' => self::modelExportAttributes($application),
            'user' => self::modelExportAttributes($application->user, ['id', 'name', 'email', 'student_id', 'updated_at']),
            'profile' => self::modelExportAttributes($profile),
            'window' => self::modelExportAttributes($application->window),
            'department' => self::modelExportAttributes($application->department),
            'course' => self::modelExportAttributes($application->course),
            'approved_by_coordinator' => self::modelExportAttributes($application->approvedByCoordinator, ['id', 'name', 'updated_at']),
            'approved_by_coordinator_departments' => $application->approvedByCoordinator?->departments
                ?->map(fn ($department) => self::modelExportAttributes($department, ['id', 'name', 'updated_at']))
                ->values()
                ->all(),
            'subject_enrollments' => $application->subjectEnrollments
                ->map(fn ($subject) => self::modelExportAttributes($subject))
                ->values()
                ->all(),
            'requirements' => $application->requirements
                ->map(fn ($requirement) => [
                    'requirement' => self::modelExportAttributes($requirement),
                    'approved_by_coordinator' => self::modelExportAttributes($requirement->approvedByCoordinator, ['id', 'name', 'updated_at']),
                    'approved_by_coordinator_departments' => $requirement->approvedByCoordinator?->departments
                        ?->map(fn ($department) => self::modelExportAttributes($department, ['id', 'name', 'updated_at']))
                        ->values()
                        ->all(),
                ])
                ->values()
                ->all(),
        ];

        return sha1((string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    /**
     * @param  array<int, string>|null  $keys
     * @return array<string, mixed>|null
     */
    private static function modelExportAttributes(?object $model, ?array $keys = null): ?array
    {
        if (! $model || ! method_exists($model, 'getAttributes')) {
            return null;
        }

        $attributes = method_exists($model, 'attributesToArray')
            ? $model->attributesToArray()
            : $model->getAttributes();

        if ($keys !== null) {
            $attributes = array_intersect_key($attributes, array_flip($keys));
        }

        ksort($attributes);

        return $attributes;
    }

    /**
     * Build the filled DOCX source file used for downloads and PDF conversion.
     *
     * @return array{path: string, file_name: string}
     */
    private static function buildApplicationDocx(Application $application): array
    {
        // Always load fresh data to ensure the form reflects the latest application state.
        self::loadApplicationExportData($application);

        $profile = $application->user->profile;

        $templatePath = public_path('GraduationApplicationFormTemplate.docx');

        if (! file_exists($templatePath)) {
            abort(404, 'Template not found.');
        }

        // Build placeholder replacements (keys without braces)
        $replacements = [];

        // Personal data
        if ($profile) {
            $middleInitial = $profile->middle_name ? mb_substr($profile->middle_name, 0, 1).'. ' : '';
            $suffix = $profile->suffix ? ' '.$profile->suffix : '';
            $replacements['student_full_name'] = trim($profile->first_name.' '.$middleInitial.$profile->last_name.$suffix);
            $replacements['student_last_name'] = $profile->last_name;
            $replacements['student_first_name'] = $profile->first_name;
            $replacements['student_middle_name'] = $profile->middle_name ?? '';
            $replacements['student_suffix'] = $profile->suffix ?? '';
            $replacements['date_of_birth'] = optional($profile->date_of_birth)
                ? \Carbon\Carbon::parse($profile->date_of_birth)->format('m/d/Y')
                : '';
            $replacements['place_of_birth'] = $profile->place_of_birth ?? '';
            $replacements['sex'] = $profile->sex ?? '';
            $replacements['civil_status'] = $profile->civil_status ?? '';
            $replacements['religion'] = $profile->religion ?? '';
            $replacements['nationality'] = $profile->nationality ?? '';
            $replacements['permanent_address'] = $profile->permanent_address ?? '';
            $replacements['contact_number'] = $profile->contact_number ?? '';
        }

        $replacements['student_id'] = $application->user->student_id ?? '';
        $replacements['student_email'] = $application->user->email ?? '';

        // Program / application
        $replacements['application_window_title'] = $application->window->title ?? '';
        $replacements['application_window_start_date'] = \Carbon\Carbon::parse($application->window->start_date)->format('m/d/Y');
        $replacements['application_window_end_date'] = \Carbon\Carbon::parse($application->window->end_date)->format('m/d/Y');
        $replacements['application_status'] = ucfirst(str_replace('_', ' ', $application->status));
        $replacements['course_name'] = $application->course->name ?? '';
        $replacements['major_name'] = $application->major ?? '';
        $replacements['department_name'] = $application->department->name ?? '';
        $replacements['graduation_appearance'] = $application->presence === 'attending' ? 'Attending' : 'Not Attending';
        // Format application created date with timezone conversion and AM/PM
        $createdAt = $application->created_at instanceof \Carbon\Carbon 
            ? $application->created_at->copy()
            : \Carbon\Carbon::parse($application->created_at);
        $createdAt->setTimezone('Asia/Manila');
        $replacements['application_created_at'] = $createdAt->format('m/d/Y h:i A');
        
        // Format application updated date with timezone conversion and AM/PM
        $updatedAt = $application->updated_at instanceof \Carbon\Carbon 
            ? $application->updated_at->copy()
            : \Carbon\Carbon::parse($application->updated_at);
        $updatedAt->setTimezone('Asia/Manila');
        $replacements['application_updated_at'] = $updatedAt->format('m/d/Y h:i A');

        // Graduate program
        $replacements['thesis_title'] = $application->thesis_dissertation_title ?? '';
        $replacements['thesis_adviser'] = $application->thesis_dissertation_adviser ?? '';

        // Graduate subjects (first 6)
        $subjects = $application->subjectEnrollments()->orderBy('order')->take(6)->get();
        $subjectCount = $subjects->count();
        
        // Initialize all 6 subject slots as empty first
        for ($n = 1; $n <= 6; $n++) {
            $replacements["subject_{$n}_code"] = '';
            $replacements["subject_{$n}_title"] = '';
            $replacements["subject_{$n}_units"] = '';
        }
        
        // Fill in subjects that exist
        foreach ($subjects as $index => $subject) {
            $n = $index + 1;
            // Expect subject_name encoded as "CODE - TITLE" for graduate entries
            $parts = explode(' - ', $subject->subject_name, 2);
            $code = trim($parts[0] ?? '');
            $title = trim($parts[1] ?? $subject->subject_name);
            
            // If code exists, separate code and title
            if ($code && $code !== '-') {
                $replacements["subject_{$n}_code"] = $code;
                $replacements["subject_{$n}_title"] = $title ?: '';
            } else {
                // If no code or code is just "-", put everything in title and leave code blank
                $replacements["subject_{$n}_code"] = '';
                $replacements["subject_{$n}_title"] = trim($subject->subject_name) ?: '';
            }
            $replacements["subject_{$n}_units"] = (string) ($subject->units ?? '');
        }

        // Educational background (simple mapping, if present)
        $mapEdu = function (?string $school, $year): string {
            if (! $school) {
                return '';
            }

            return $year ? "{$school} ({$year})" : $school;
        };

        $replacements['grade_1_school'] = $profile->grade_1_school ?? '';
        $replacements['grade_1_year'] = (string) ($profile->grade_1_year ?? '');
        $replacements['grade_2_school'] = $profile->grade_2_school ?? '';
        $replacements['grade_2_year'] = (string) ($profile->grade_2_year ?? '');
        $replacements['grade_3_school'] = $profile->grade_3_school ?? '';
        $replacements['grade_3_year'] = (string) ($profile->grade_3_year ?? '');
        $replacements['grade_4_school'] = $profile->grade_4_school ?? '';
        $replacements['grade_4_year'] = (string) ($profile->grade_4_year ?? '');
        $replacements['grade_5_school'] = $profile->grade_5_school ?? '';
        $replacements['grade_5_year'] = (string) ($profile->grade_5_year ?? '');
        $replacements['grade_6_school'] = $profile->grade_6_school ?? '';
        $replacements['grade_6_year'] = (string) ($profile->grade_6_year ?? '');

        $replacements['jhs_1_school'] = $profile->jhs_1_school ?? '';
        $replacements['jhs_1_year'] = (string) ($profile->jhs_1_year ?? '');
        $replacements['jhs_2_school'] = $profile->jhs_2_school ?? '';
        $replacements['jhs_2_year'] = (string) ($profile->jhs_2_year ?? '');
        $replacements['jhs_3_school'] = $profile->jhs_3_school ?? '';
        $replacements['jhs_3_year'] = (string) ($profile->jhs_3_year ?? '');
        $replacements['jhs_4_school'] = $profile->jhs_4_school ?? '';
        $replacements['jhs_4_year'] = (string) ($profile->jhs_4_year ?? '');

        $replacements['shs_11_school'] = $profile->shs_11_school ?? '';
        $replacements['shs_11_year'] = (string) ($profile->shs_11_year ?? '');
        $replacements['shs_12_school'] = $profile->shs_12_school ?? '';
        $replacements['shs_12_year'] = (string) ($profile->shs_12_year ?? '');

        // Build a simple fallback first; fixed-space export formatting overrides this below.
        $collegeSchool = $profile->college_school_name ?? '';
        $collegeDegree = $profile->college_degree ?? '';
        
        if ($collegeDegree && $collegeSchool) {
            // Both exist: "Degree – School"
            $replacements['college_school_name'] = "{$collegeDegree} – {$collegeSchool}";
        } elseif ($collegeDegree) {
            // Only degree exists: just "Degree"
            $replacements['college_school_name'] = $collegeDegree;
        } elseif ($collegeSchool) {
            // Only school exists: just "School"
            $replacements['college_school_name'] = $collegeSchool;
        } else {
            // Neither exists: empty
            $replacements['college_school_name'] = '';
        }
        
        $collegeExportLines = self::collegeExportLines(
            $collegeDegree,
            $collegeSchool,
            (bool) ($profile->is_transferee ?? false)
        );
        $replacements['college_school_name'] = implode("\n", $collegeExportLines);
        $replacements['college_degree'] = $collegeDegree; // Keep separate for backward compatibility
        $replacements['college_year_graduated'] = (string) ($profile->college_year_graduated ?? '');
        $replacements['masters_school'] = $profile->grad_masteral_school ?? '';
        $replacements['masters_year'] = (string) ($profile->grad_masteral_year ?? '');
        $replacements['doctoral_school'] = $profile->grad_doctoral_school ?? '';
        $replacements['doctoral_year'] = (string) ($profile->grad_doctoral_year ?? '');

        // Requirements status (simple text values, or marks if you prefer)
        $requirementsByKey = $application->requirements->keyBy('requirement_key');
        $statusLabel = static function (?string $status): string {
            // For the template we show checkboxes:
            // [ ✔ ] for approved, [ ✘ ] for anything not completed.
            return $status === 'approved' ? '[✔]' : '[✘]';
        };

        // Verbose requirement placeholders (backwards compatible)
        $replacements['req_entry_requirements_status'] = $statusLabel(optional($requirementsByKey->get('entry_requirements'))->status);
        $replacements['req_complete_grades_status'] = $statusLabel(optional($requirementsByKey->get('complete_grades'))->status);
        $replacements['req_hardbound_copies_status'] = $statusLabel(optional($requirementsByKey->get('hardbound_copies'))->status);
        $replacements['req_id_picture_status'] = $statusLabel(optional($requirementsByKey->get('id_picture'))->status);
        $replacements['req_reviewer_cert_status'] = $statusLabel(optional($requirementsByKey->get('reviewer_certification'))->status);
        $replacements['req_journal_publication_status'] = $statusLabel(optional($requirementsByKey->get('journal_publication'))->status);

        // Short numeric placeholders (${1} … ${6}) for requirements, in the fixed order:
        // 1: entry requirements, 2: complete grades, 3: hardbound copies,
        // 4: ID picture, 5: reviewer certification, 6: journal publication.
        $replacements['1'] = $replacements['req_entry_requirements_status'];
        $replacements['2'] = $replacements['req_complete_grades_status'];
        $replacements['3'] = $replacements['req_hardbound_copies_status'];
        $replacements['4'] = $replacements['req_id_picture_status'];
        $replacements['5'] = $replacements['req_reviewer_cert_status'];
        $replacements['6'] = $replacements['req_journal_publication_status'];

        $missing = $application->requirements
            ->where('status', '!=', 'approved')
            ->pluck('requirement_label')
            ->implode('; ');
        $replacements['missing_requirements_list'] = $missing;

        // Coordinator / approval info
        // Get the coordinator who last approved any requirement, or fall back to application-level approval
        // Order by approved_at DESC, then by id DESC to get the most recent approval
        // We need to query fresh from database to ensure we get the latest data
        $lastApprovedRequirement = $application->requirements()
            ->whereNotNull('approved_by_coordinator_id')
            ->whereNotNull('approved_at')
            ->orderBy('approved_at', 'desc')
            ->orderBy('id', 'desc') // Secondary sort to break ties
            ->with('approvedByCoordinator.departments')
            ->first();
        
        $coordinator = $lastApprovedRequirement?->approvedByCoordinator ?? $application->approvedByCoordinator;
        $approvalDate = $lastApprovedRequirement?->approved_at ?? $application->approved_at;
        
        if ($coordinator && $approvalDate) {
            $replacements['coordinator_name'] = $coordinator->name;
            $replacements['coordinator_department'] = optional($coordinator->departments()->first())->name ?? '';
            // Use the actual approval timestamp from the requirement - ensure it's a Carbon instance
            $approvalDateTime = $approvalDate instanceof \Carbon\Carbon 
                ? $approvalDate->copy()
                : \Carbon\Carbon::parse($approvalDate);
            
            // Convert from UTC to Asia/Manila timezone (Philippines timezone)
            // The database stores in UTC, but we want to display in local time
            $approvalDateTime->setTimezone('Asia/Manila');
            
            $replacements['approval_date'] = $approvalDateTime->format('m/d/Y');
            $replacements['approval_datetime'] = $approvalDateTime->format('m/d/Y h:i A');
        } else {
            $replacements['coordinator_name'] = '';
            $replacements['coordinator_department'] = '';
            $replacements['approval_date'] = '';
            $replacements['approval_datetime'] = '';
        }

        // Ensure temporary directory exists
        $tmpDir = storage_path('app/tmp');
        if (! is_dir($tmpDir)) {
            mkdir($tmpDir, 0755, true);
        }

        // Use PhpWord TemplateProcessor to safely replace placeholders.
        // IMPORTANT: In the DOCX template, placeholders should be written as ${placeholder_name}
        // (for example: ${student_full_name}, ${student_id}, etc).
        $templateProcessor = new TemplateProcessor($templatePath);

        foreach ($replacements as $key => $value) {
            if ($key === 'college_school_name') {
                continue;
            }

            $value = (string) $value;
            $singleLineValue = self::singleLineExportText($value);
            $isFixedLineValue = self::isFixedLineExportField($key);

            if ($singleLineValue !== '' && $isFixedLineValue && ($fontStyle = self::compactExportFontStyle($key, $singleLineValue))) {
                $templateProcessor->setComplexValue(
                    $key,
                    self::singleLineExportTextRun($singleLineValue, $fontStyle)
                );

                continue;
            }

            if ($isFixedLineValue && $singleLineValue !== $value) {
                $templateProcessor->setValue($key, $singleLineValue);

                continue;
            }

            // TemplateProcessor expects keys without ${}
            // Set empty values to empty string to remove placeholders
            $templateProcessor->setValue($key, $value);
        }

        if ($collegeExportLines !== []) {
            $templateProcessor->setComplexValue(
                'college_school_name',
                self::collegeExportTextRun($collegeExportLines)
            );
        } else {
            $templateProcessor->setValue('college_school_name', '');
        }

        // Save filled DOCX
        $tempDocx = $tmpDir.'/GraduationApplication_'.$application->id.'_'.time().'.docx';
        $templateProcessor->saveAs($tempDocx);
        
        // Remove any remaining placeholders that weren't replaced
        // PhpWord doesn't remove unreplaced placeholders, so we need to manually clean the XML
        try {
            $zip = new \ZipArchive();
            if ($zip->open($tempDocx) === true) {
                // Clean document.xml
                $content = $zip->getFromName('word/document.xml');
                if ($content !== false) {
                    // Remove any remaining ${placeholder} patterns
                    $content = preg_replace('/\$\{[^}]+\}/', '', $content);
                    // Remove standalone "-" characters that appear in empty table cells
                    // This regex matches "-" that appears alone between <w:t> tags (with optional whitespace)
                    $content = preg_replace('/(<w:t[^>]*>)\s*-\s*(<\/w:t>)/', '$1$2', $content);
                    // Also handle cases with xml:space="preserve"
                    $content = preg_replace('/(<w:t[^>]*xml:space="preserve"[^>]*>)\s*-\s*(<\/w:t>)/', '$1$2', $content);
                    $zip->deleteName('word/document.xml');
                    $zip->addFromString('word/document.xml', $content);
                }
                
                // Also clean header and footer files if they exist
                for ($i = 1; $i <= 3; $i++) {
                    $headerFile = "word/header{$i}.xml";
                    if ($zip->locateName($headerFile) !== false) {
                        $headerContent = $zip->getFromName($headerFile);
                        if ($headerContent !== false) {
                            $headerContent = preg_replace('/\$\{[^}]+\}/', '', $headerContent);
                            $headerContent = preg_replace('/(<w:t[^>]*>)\s*-\s*(<\/w:t>)/', '$1$2', $headerContent);
                            $zip->deleteName($headerFile);
                            $zip->addFromString($headerFile, $headerContent);
                        }
                    }
                    
                    $footerFile = "word/footer{$i}.xml";
                    if ($zip->locateName($footerFile) !== false) {
                        $footerContent = $zip->getFromName($footerFile);
                        if ($footerContent !== false) {
                            $footerContent = preg_replace('/\$\{[^}]+\}/', '', $footerContent);
                            $footerContent = preg_replace('/(<w:t[^>]*>)\s*-\s*(<\/w:t>)/', '$1$2', $footerContent);
                            $zip->deleteName($footerFile);
                            $zip->addFromString($footerFile, $footerContent);
                        }
                    }
                }
                
                $zip->close();
            }
        } catch (\Exception $e) {
            // If cleanup fails, continue with the document as is
        }

        $fileName = self::applicationExportFileName($application, 'docx');

        return [
            'path' => $tempDocx,
            'file_name' => $fileName,
        ];
    }

    private static function loadApplicationExportData(Application $application): Application
    {
        return $application->load([
            'window',
            'department',
            'course',
            'subjectEnrollments',
            'requirements.approvedByCoordinator.departments',
            'requirements.children.approvedByCoordinator.departments',
            'user.profile',
            'approvedByCoordinator.departments',
        ]);
    }

    private static function applicationExportFileName(Application $application, string $extension): string
    {
        $profileName = '';
        if ($application->user && $application->user->profile) {
            $p = $application->user->profile;
            $middleInitial = $p->middle_name ? mb_substr($p->middle_name, 0, 1).'. ' : '';
            $suffix = $p->suffix ? ' '.$p->suffix : '';
            $profileName = trim($p->first_name.' '.$middleInitial.$p->last_name.$suffix);
        } else {
            $profileName = $application->user->name ?? 'Student';
        }

        // Make filename safe for filesystems
        $safeName = preg_replace('/[^A-Za-z0-9_\- ]/', '', $profileName) ?: 'Student';
        $safeName = str_replace(' ', '_', $safeName);

        return 'GraduationApplication_'.$safeName.'.'.$extension;
    }

    /**
     * @return list<string>
     */
    private static function collegeExportLines(?string $degree, ?string $school, bool $graduatedInSpup): array
    {
        $degree = self::cleanCollegeExportText($degree);
        $school = $graduatedInSpup ? '' : self::cleanCollegeExportText($school);

        if ($degree !== '' && $school !== '') {
            return ["{$degree} - {$school}"];
        }

        if ($degree !== '') {
            return [$degree];
        }

        if ($school !== '') {
            return [$school];
        }

        return [];
    }

    private static function collegeExportTextRun(array $lines): TextRun
    {
        $fontStyle = self::collegeExportFontStyle($lines);
        $textRun = new TextRun(['spaceBefore' => 0, 'spaceAfter' => 0]);

        foreach ($lines as $index => $line) {
            if ($index > 0) {
                $textRun->addTextBreak();
            }

            $textRun->addText($line, $fontStyle);
        }

        return $textRun;
    }

    private static function singleLineExportTextRun(string $text, array $fontStyle): TextRun
    {
        $textRun = new TextRun(['spaceBefore' => 0, 'spaceAfter' => 0]);
        $textRun->addText($text, $fontStyle);

        return $textRun;
    }

    private static function compactExportFontStyle(string $key, string $value): ?array
    {
        $length = mb_strlen($value);

        if (preg_match('/^subject_\d+_title$/', $key) === 1) {
            return self::compactExportStyleForLength($length, 8, 28, 42, 58);
        }

        $normalSize = match ($key) {
            'student_full_name' => 12,
            'course_name',
            'major_name',
            'permanent_address',
            'place_of_birth',
            'student_email',
            'masters_school',
            'doctoral_school' => 9,
            'thesis_title',
            'thesis_adviser' => 8,
            default => null,
        };

        if ($normalSize === null) {
            return null;
        }

        return self::compactExportStyleForLength($length, $normalSize);
    }

    private static function isFixedLineExportField(string $key): bool
    {
        if (preg_match('/^subject_\d+_title$/', $key) === 1) {
            return true;
        }

        return in_array($key, [
            'student_full_name',
            'course_name',
            'major_name',
            'permanent_address',
            'place_of_birth',
            'student_email',
            'masters_school',
            'doctoral_school',
            'thesis_title',
            'thesis_adviser',
        ], true);
    }

    private static function compactExportStyleForLength(
        int $length,
        int $normalSize,
        int $normalLimit = self::COMPACT_EXPORT_NORMAL_LIMIT,
        int $mediumLimit = self::COMPACT_EXPORT_MEDIUM_LIMIT,
        int $smallLimit = self::COMPACT_EXPORT_SMALL_LIMIT,
    ): ?array {
        if ($length <= $normalLimit) {
            return null;
        }

        $fontStyle = [
            'name' => 'Times New Roman',
            'size' => max(6, $normalSize - 1),
            'scale' => 94,
            'spacing' => -1,
        ];

        if ($length > $smallLimit) {
            $fontStyle['size'] = max(6, $normalSize - 3);
            $fontStyle['scale'] = 76;
            $fontStyle['spacing'] = -3;
        } elseif ($length > $mediumLimit) {
            $fontStyle['size'] = max(6, $normalSize - 2);
            $fontStyle['scale'] = 84;
            $fontStyle['spacing'] = -2;
        }

        return $fontStyle;
    }

    private static function collegeExportFontStyle(array $lines): array
    {
        $longestLine = self::longestExportLineLength($lines);
        $fontStyle = [
            'name' => 'Times New Roman',
            'size' => self::collegeExportFontSize($lines),
        ];

        if ($longestLine > self::COLLEGE_EXPORT_SMALL_FONT_LIMIT) {
            $fontStyle['scale'] = 80;
            $fontStyle['spacing'] = -2;
        } elseif ($longestLine > self::COLLEGE_EXPORT_MEDIUM_FONT_LIMIT) {
            $fontStyle['scale'] = 90;
            $fontStyle['spacing'] = -1;
        }

        return $fontStyle;
    }

    private static function collegeExportFontSize(array $lines): int
    {
        $longestLine = self::longestExportLineLength($lines);

        if ($longestLine > self::COLLEGE_EXPORT_SMALL_FONT_LIMIT) {
            return self::COLLEGE_EXPORT_SMALL_FONT_SIZE;
        }

        if ($longestLine > self::COLLEGE_EXPORT_MEDIUM_FONT_LIMIT) {
            return self::COLLEGE_EXPORT_MEDIUM_FONT_SIZE;
        }

        return self::COLLEGE_EXPORT_NORMAL_FONT_SIZE;
    }

    private static function longestExportLineLength(array $lines): int
    {
        return collect($lines)
            ->map(fn (string $line) => mb_strlen($line))
            ->max() ?? 0;
    }

    private static function singleLineExportText(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    private static function cleanCollegeExportText(?string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', (string) $text));
    }

    private static function convertDocxToPdf(string $docxPath): string
    {
        try {
            if ($pdfPath = self::convertDocxToPdfWithFreeConvert($docxPath)) {
                return $pdfPath;
            }
        } catch (\Throwable $e) {
            Log::warning('FreeConvert DOCX to PDF conversion failed.', [
                'message' => $e->getMessage(),
            ]);
            SystemHealthCheck::record('freeconvert', 'warning', $e->getMessage());
            app(SystemEventLogger::class)->log(
                module: 'document',
                action: 'freeconvert.failed',
                message: 'FreeConvert DOCX to PDF conversion failed.',
                status: 'failed',
                severity: 'warning',
                meta: ['error' => $e->getMessage()],
            );
        }

        throw new \RuntimeException('No configured FreeConvert API key could convert the DOCX to PDF.');
    }

    private static function convertDocxToPdfWithFreeConvert(string $docxPath): ?string
    {
        $apiKeys = self::freeConvertApiKeys();

        if ($apiKeys === []) {
            return null;
        }

        $baseUrl = rtrim((string) config('services.freeconvert.base_url', 'https://api.freeconvert.com/v1'), '/');
        $timeout = self::freeConvertTimeout();
        $pollInterval = max(1, (int) config('services.freeconvert.poll_interval', 2));
        $maxAttempts = max(1, (int) config('services.freeconvert.max_attempts', 3));
        $retryDelayMs = max(1, (int) config('services.freeconvert.retry_delay_ms', 1000));
        $pdfPath = dirname($docxPath).'/'.pathinfo($docxPath, PATHINFO_FILENAME).'.pdf';
        $outputFileName = basename($pdfPath);
        $errors = [];

        foreach ($apiKeys as $index => $apiKey) {
            @unlink($pdfPath);

            try {
                return self::convertDocxToPdfWithFreeConvertKey(
                    $docxPath,
                    $apiKey,
                    $baseUrl,
                    $timeout,
                    $pollInterval,
                    $maxAttempts,
                    $retryDelayMs,
                    $pdfPath,
                    $outputFileName
                );
            } catch (\Throwable $e) {
                $keyIndex = $index + 1;
                $errors[] = "key {$keyIndex}: ".$e->getMessage();

                Log::warning('FreeConvert API key conversion attempt failed.', [
                    'key_index' => $keyIndex,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        throw new \RuntimeException('All configured FreeConvert API keys failed. '.implode(' | ', $errors));
    }

    /**
     * @return list<string>
     */
    private static function freeConvertApiKeys(): array
    {
        $configuredKeys = config('services.freeconvert.api_keys', []);
        $keys = is_array($configuredKeys)
            ? $configuredKeys
            : preg_split('/[\s,]+/', (string) $configuredKeys);

        $legacyKeys = config('services.freeconvert.legacy_api_keys', '');

        if (! is_array($legacyKeys)) {
            $legacyKeys = preg_split('/[\s,]+/', (string) $legacyKeys) ?: [];
        }

        $keys = array_merge($keys ?: [], $legacyKeys);

        $legacyKey = trim((string) config('services.freeconvert.legacy_api_key', ''));

        if ($legacyKey !== '') {
            $keys[] = $legacyKey;
        }

        return array_values(array_unique(array_filter(
            array_map(fn ($key) => trim((string) $key), $keys ?: []),
            fn (string $key) => $key !== ''
        )));
    }

    private static function freeConvertTimeout(): int
    {
        $configuredTimeout = max(5, (int) config('services.freeconvert.timeout', 25));
        $maxExecutionTime = (int) ini_get('max_execution_time');

        if ($maxExecutionTime <= 0) {
            return $configuredTimeout;
        }

        return max(5, min($configuredTimeout, $maxExecutionTime - 5));
    }

    private static function convertDocxToPdfWithFreeConvertKey(
        string $docxPath,
        string $apiKey,
        string $baseUrl,
        int $timeout,
        int $pollInterval,
        int $maxAttempts,
        int $retryDelayMs,
        string $pdfPath,
        string $outputFileName,
    ): string {
        $jobId = null;

        try {
            $jobResponse = self::freeConvertRequestWithRetry(
                fn () => Http::baseUrl($baseUrl)
                    ->acceptJson()
                    ->asJson()
                    ->withToken($apiKey)
                    ->timeout($timeout)
                    ->post('/process/jobs', [
                        'tag' => 'graduation-application-'.((string) Str::uuid()),
                        'tasks' => [
                            'import-docx' => [
                                'operation' => 'import/upload',
                            ],
                            'convert-pdf' => [
                                'operation' => 'convert',
                                'input' => 'import-docx',
                                'input_format' => 'docx',
                                'output_format' => 'pdf',
                            ],
                            'export-pdf' => [
                                'operation' => 'export/url',
                                'input' => 'convert-pdf',
                                'filename' => $outputFileName,
                            ],
                        ],
                    ]),
                'FreeConvert job creation failed',
                $maxAttempts,
                $retryDelayMs
            );

            $job = $jobResponse->json();
            $jobId = data_get($job, 'id');
            $uploadTask = self::findFreeConvertTask($job, 'import-docx', 'import/upload');
            $uploadUrl = data_get($uploadTask, 'result.form.url');
            $uploadParameters = data_get($uploadTask, 'result.form.parameters', []);

            if (! $jobId || ! $uploadUrl || ! is_array($uploadParameters)) {
                throw new \RuntimeException('FreeConvert upload task did not include upload details.');
            }

            $uploadResponse = self::freeConvertRequestWithRetry(
                function () use ($apiKey, $docxPath, $timeout, $uploadParameters, $uploadUrl): HttpResponse {
                    $fileHandle = fopen($docxPath, 'r');

                    if ($fileHandle === false) {
                        throw new \RuntimeException('Unable to open generated DOCX for FreeConvert upload.');
                    }

                    try {
                        return Http::withToken($apiKey)
                            ->timeout($timeout)
                            ->withOptions(['allow_redirects' => true])
                            ->attach(
                                'file',
                                $fileHandle,
                                basename($docxPath),
                                ['Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                            )
                            ->post($uploadUrl, $uploadParameters);
                    } finally {
                        fclose($fileHandle);
                    }
                },
                'FreeConvert file upload failed',
                $maxAttempts,
                $retryDelayMs
            );

            if (! $uploadResponse->successful()) {
                throw new \RuntimeException('FreeConvert file upload failed with status '.$uploadResponse->status().'.');
            }

            $completedJob = self::waitForFreeConvertJob($baseUrl, $apiKey, $jobId, $timeout, $pollInterval, $maxAttempts, $retryDelayMs);
            $exportTask = self::findFreeConvertTask($completedJob, 'export-pdf', 'export/url');
            $downloadUrl = self::freeConvertResultUrl($exportTask);

            if (! $downloadUrl) {
                throw new \RuntimeException('FreeConvert export task did not return a download URL.');
            }

            $downloadResponse = self::freeConvertRequestWithRetry(
                fn () => Http::timeout($timeout)->get($downloadUrl),
                'FreeConvert PDF download failed',
                $maxAttempts,
                $retryDelayMs
            );

            $body = $downloadResponse->body();

            if (! str_starts_with($body, '%PDF')) {
                throw new \RuntimeException('FreeConvert download response was not a PDF.');
            }

            if (file_put_contents($pdfPath, $body) === false || ! file_exists($pdfPath)) {
                throw new \RuntimeException('Unable to save converted PDF from FreeConvert.');
            }

            return $pdfPath;
        } finally {
            if ($jobId) {
                try {
                    Http::baseUrl($baseUrl)
                        ->withToken($apiKey)
                        ->timeout(10)
                        ->delete('/process/jobs/'.$jobId);
                } catch (\Throwable) {
                    // Cleanup is best-effort; downloaded PDFs should still be returned.
                }
            }
        }
    }

    private static function waitForFreeConvertJob(
        string $baseUrl,
        string $apiKey,
        string $jobId,
        int $timeout,
        int $pollInterval,
        int $maxAttempts,
        int $retryDelayMs,
    ): array {
        $deadline = time() + $timeout;

        do {
            $response = self::freeConvertRequestWithRetry(
                fn () => Http::baseUrl($baseUrl)
                    ->acceptJson()
                    ->withToken($apiKey)
                    ->timeout(max(5, min($timeout, 30)))
                    ->get('/process/jobs/'.$jobId),
                'FreeConvert job lookup failed',
                $maxAttempts,
                $retryDelayMs
            );

            $job = $response->json();
            $status = data_get($job, 'status');

            if ($status === 'completed') {
                return $job;
            }

            if ($status === 'failed') {
                throw new \RuntimeException('FreeConvert job failed.');
            }

            sleep($pollInterval);
        } while (time() < $deadline);

        throw new \RuntimeException('FreeConvert job timed out.');
    }

    private static function freeConvertRequestWithRetry(callable $request, string $failureMessage, int $maxAttempts, int $retryDelayMs): HttpResponse
    {
        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $request();

                if ($response->successful()) {
                    return $response;
                }

                $lastError = $failureMessage.' with status '.$response->status().self::freeConvertResponseDetails($response);

                if (! self::shouldRetryFreeConvertResponse($response) || $attempt === $maxAttempts) {
                    throw new \RuntimeException($lastError);
                }

                self::sleepBeforeFreeConvertRetry($response, $retryDelayMs, $attempt);
            } catch (\Throwable $e) {
                if ($e instanceof \RuntimeException && is_string($lastError) && $e->getMessage() === $lastError) {
                    throw $e;
                }

                $lastError = $failureMessage.': '.$e->getMessage();

                if ($attempt === $maxAttempts) {
                    throw new \RuntimeException($lastError, 0, $e);
                }

                self::sleepBeforeFreeConvertRetry(null, $retryDelayMs, $attempt);
            }
        }

        throw new \RuntimeException($lastError ?: $failureMessage);
    }

    private static function shouldRetryFreeConvertResponse(HttpResponse $response): bool
    {
        return in_array($response->status(), self::FREECONVERT_TRANSIENT_STATUSES, true);
    }

    private static function sleepBeforeFreeConvertRetry(?HttpResponse $response, int $retryDelayMs, int $attempt): void
    {
        $retryAfter = $response?->header('Retry-After');

        if (is_numeric($retryAfter)) {
            usleep(min((int) $retryAfter, 10) * 1_000_000);

            return;
        }

        $delayMs = min($retryDelayMs * (2 ** max(0, $attempt - 1)), 10_000);
        usleep((int) $delayMs * 1000);
    }

    private static function freeConvertResponseDetails(HttpResponse $response): string
    {
        $message = data_get($response->json(), 'message')
            ?? data_get($response->json(), 'error')
            ?? data_get($response->json(), 'errors.0.message');

        if (is_string($message) && $message !== '') {
            return " ({$message}).";
        }

        $body = trim($response->body());

        if ($body === '') {
            return '.';
        }

        return ' ('.Str::limit($body, 240).').';
    }

    private static function findFreeConvertTask(array $job, string $name, string $operation): ?array
    {
        $tasks = data_get($job, 'tasks', []);

        if (! is_array($tasks)) {
            return null;
        }

        foreach ($tasks as $taskName => $task) {
            if (! is_array($task)) {
                continue;
            }

            if ($taskName === $name || data_get($task, 'name') === $name) {
                return $task;
            }
        }

        foreach ($tasks as $task) {
            if (is_array($task) && data_get($task, 'operation') === $operation) {
                return $task;
            }
        }

        return null;
    }

    private static function freeConvertResultUrl(?array $task): ?string
    {
        if (! $task) {
            return null;
        }

        $url = data_get($task, 'result.url')
            ?? data_get($task, 'result.files.0.url')
            ?? data_get($task, 'result.file.url');

        return is_string($url) && $url !== '' ? $url : null;
    }

    public static function generateProfilePhotoDownload(Application $application): BinaryFileResponse
    {
        $application->loadMissing('user.profile');

        $profile = $application->user?->profile;
        $photoPath = $profile?->photo_path;
        $resolvedPhotoPath = ProfilePhoto::path($photoPath);

        if (! $resolvedPhotoPath) {
            abort(404, 'Profile photo not found.');
        }

        $fullName = trim(implode(' ', array_filter([
            $profile->first_name,
            $profile->middle_name,
            $profile->last_name,
            $profile->suffix,
        ]))) ?: ($application->user->name ?? 'Student');

        $safeName = trim(preg_replace('/[\\\\\\/:\*\?"<>\|]+/', '', $fullName) ?: 'Student', " \t\n\r\0\x0B.");
        $extension = strtolower(pathinfo($photoPath, PATHINFO_EXTENSION) ?: 'jpg');
        $fileName = Str::of($safeName)->trim()->append('.'.$extension)->toString();

        return response()->download($resolvedPhotoPath, $fileName);
    }

    /**
     * Download for student (ensures ownership, then delegates to generator).
     */
    public function download(Request $request, Application $application): BinaryFileResponse
    {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        return self::generatePdf($application);
    }

    public function downloadPhoto(Request $request, Application $application): BinaryFileResponse
    {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        return self::generateProfilePhotoDownload($application);
    }

    public function requirementFile(
        Request $request,
        Application $application,
        ApplicationRequirement $requirement,
        RequirementFileStorage $files,
    ): BinaryFileResponse {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($requirement->application_id !== $application->id) {
            abort(403);
        }

        return $files->response($requirement, $request);
    }

    /**
     * Show the form for editing the specified application.
     * Applications can now be edited even if approved, as long as the window is active.
     */
    public function edit(Request $request, Application $application): Response
    {
        // Ensure the application belongs to the user
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        // Students can now edit applications regardless of window status
        $application->load(['window', 'department', 'course', 'subjectEnrollments']);
        $profile = $request->user()->profile;
        $departments = \App\Models\Department::with([
            'courses' => function ($query) {
                $query->active()->orderBy('name');
            },
            'courses.majors' => function ($query) {
                $query->active()->orderBy('name');
            },
        ])->active()->orderBy('name')->get();

        // Check if application is approved to show informative alert
        $isApproved = $application->status === 'approved';

        return Inertia::render('applications/edit', [
            'application' => $application,
            'profile' => $profile,
            'departments' => $departments,
            'isApproved' => $isApproved,
        ]);
    }

    /**
     * Update the specified application.
     */
    public function update(UpdateApplicationRequest $request, Application $application, ApplicationWorkflowService $workflow): RedirectResponse
    {
        // Ensure the application belongs to the user
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        $workflow->updateApplicationForUser($application, $request->validated(), $request->file('photo'));

        // Recalculate application status based on requirements checklist
        // This ensures status always reflects the current state of requirements
        // Note: If application was approved but requirements changed, status will update accordingly
        $application->load('requirements.children');
        $oldStatus = $application->status;
        $application->recalculateStatusBasedOnRequirements();
        $newStatus = $application->fresh()->status;

        // Prepare success message
        $message = 'Application updated successfully.';
        if ($oldStatus !== $newStatus) {
            $message .= " Application status updated from '{$oldStatus}' to '{$newStatus}' based on requirements checklist.";
        }

        // If application was approved and is being edited, show informative message
        $wasApproved = $oldStatus === 'approved';
        if ($wasApproved) {
            $message .= ' Note: Editing an approved application may change its status based on requirements.';
        }

        // Add note about profile sync
        $message .= ' Your profile has been updated with the changes you made.';

        return redirect()->route('applications.index')
            ->with('success', $message);
    }

    /**
     * Remove the specified application from storage.
     */
    public function destroy(Request $request, Application $application): RedirectResponse
    {
        // Ensure the application belongs to the user
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        if (! $application->canBeDeleted()) {
            return redirect()->route('applications.show', $application)
                ->with('error', 'This application can no longer be deleted.');
        }

        $application->delete();

        return redirect()->route('applications.index')
            ->with('success', 'Application deleted successfully.');
    }

    /**
     * Upload a file for a requirement.
     */
    public function uploadRequirement(Request $request, Application $application, ApplicationRequirement $requirement, ApplicationWorkflowService $workflow): RedirectResponse
    {
        // Ensure the application belongs to the user
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        // Ensure the requirement belongs to the application
        if ($requirement->application_id !== $application->id) {
            abort(403);
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,jpg,jpeg,png'],
        ]);

        $updatedRequirement = $workflow->storeRequirementFile($application, $requirement, $request->file('file'));
        $workflow->notifyRequirementUploaded($application, $updatedRequirement);

        return redirect()
            ->route('applications.show', $application->application_number)
            ->with('success', 'File uploaded successfully.');
    }

}
