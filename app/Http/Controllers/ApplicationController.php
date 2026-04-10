<?php

namespace App\Http\Controllers;

use App\Http\Requests\Application\StoreApplicationRequest;
use App\Http\Requests\Application\UpdateApplicationRequest;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Support\ApplicationWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpWord\TemplateProcessor;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApplicationController extends Controller
{
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
    public function show(Request $request, Application $application, ApplicationWorkflowService $workflow): Response
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
        ]);
    }

    /**
     * Generate a DOCX file from the application data.
     *
     * This method always uses the latest application data, including any recent updates.
     * The form is generated dynamically each time it's downloaded, ensuring it reflects
     * the current state of the application, requirements, and user profile.
     *
     * Note: Any changes made to the application will be automatically reflected in
     * the downloadable DOCX the next time it is generated.
     */
    public static function generateDocx(Application $application): BinaryFileResponse
    {
        // Always load fresh data to ensure the form reflects the latest application state
        $application->loadMissing([
            'window',
            'department',
            'course',
            'subjectEnrollments',
            'requirements.approvedByCoordinator',
            'user.profile',
            'approvedByCoordinator',
            'approvedByCoordinator.departments',
        ]);

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
            ? $application->created_at 
            : \Carbon\Carbon::parse($application->created_at);
        $createdAt->setTimezone('Asia/Manila');
        $replacements['application_created_at'] = $createdAt->format('m/d/Y h:i A');
        
        // Format application updated date with timezone conversion and AM/PM
        $updatedAt = $application->updated_at instanceof \Carbon\Carbon 
            ? $application->updated_at 
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

        // Format college information: combine degree and school if both exist, or show individually
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
                ? $approvalDate 
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
            // TemplateProcessor expects keys without ${}
            // Set empty values to empty string to remove placeholders
            $templateProcessor->setValue($key, (string) $value);
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

        // Build a friendly file name using the student's full name.
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

        $fileName = 'GraduationApplication_'.$safeName.'.docx';

        return response()->download($tempDocx, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    public static function generateProfilePhotoDownload(Application $application): BinaryFileResponse
    {
        $application->loadMissing('user.profile');

        $profile = $application->user?->profile;
        $photoPath = $profile?->photo_path;

        if (! $photoPath || ! Storage::disk('public')->exists($photoPath)) {
            abort(404, 'Profile photo not found.');
        }

        $fullName = trim(implode(' ', array_filter([
            $profile->first_name,
            $profile->middle_name,
            $profile->last_name,
            $profile->suffix,
        ]))) ?: ($application->user->name ?? 'Student');

        $safeName = preg_replace('/[\\\\\\/:\*\?"<>\|]+/', '', $fullName) ?: 'Student';
        $extension = strtolower(pathinfo($photoPath, PATHINFO_EXTENSION) ?: 'jpg');
        $fileName = Str::of($safeName)->trim()->append('.'.$extension)->toString();

        return response()->download(Storage::disk('public')->path($photoPath), $fileName);
    }

    /**
     * Download for student (ensures ownership, then delegates to generator).
     */
    public function download(Request $request, Application $application): BinaryFileResponse
    {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        return self::generateDocx($application);
    }

    public function downloadPhoto(Request $request, Application $application): BinaryFileResponse
    {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        return self::generateProfilePhotoDownload($application);
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
