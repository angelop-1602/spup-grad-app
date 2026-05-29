<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuestApplicationDraft;
use App\Models\SystemHealthCheck;
use App\Models\User;
use App\Notifications\GuestApplicationAccessNotification;
use App\Support\ApplicationWorkflowService;
use App\Support\ProfilePhoto;
use App\Support\SystemEventLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    /**
     * Display a listing of students.
     */
    public function index(Request $request): Response
    {
        $query = User::query()->with('profile');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhereHas('profile', function (Builder $profileQuery) use ($search) {
                        $profileQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('suffix', 'like', "%{$search}%");
                    });
            });
        }

        $students = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('admin/students/index', [
            'students' => $students,
            'filters' => [
                'search' => $request->string('search')->toString(),
            ],
            'manualVerificationDrafts' => $this->manualVerificationDrafts(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/students/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'string', 'max:255', 'unique:users,student_id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $student = User::create([
            'student_id' => $validated['student_id'],
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()->route('admin.students.show', $student)
            ->with('success', 'Student created successfully.');
    }

    /**
     * Display the specified student.
     */
    public function show(User $student): Response
    {
        $student->load([
            'profile',
            'applications.window',
            'applications.department',
            'applications.course',
        ]);

        return Inertia::render('admin/students/show', [
            'student' => $student,
        ]);
    }

    public function edit(User $student): Response
    {
        return Inertia::render('admin/students/edit', [
            'student' => $student->only([
                'id',
                'student_id',
                'name',
                'email',
            ]),
        ]);
    }

    public function update(Request $request, User $student): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'student_id')->ignore($student->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($student->id),
            ],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $updates = [
            'student_id' => $validated['student_id'],
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];

        if (! empty($validated['password'])) {
            $updates['password'] = Hash::make($validated['password']);
        }

        $student->forceFill($updates)->save();

        return redirect()->route('admin.students.show', $student)
            ->with('success', 'Student updated successfully.');
    }

    /**
     * Get applications for a specific student.
     */
    public function applications(User $student): \Illuminate\Http\JsonResponse
    {
        $applications = $student->applications()
            ->with(['window', 'department', 'course'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($applications);
    }

    public function verifyDraft(GuestApplicationDraft $draft, ApplicationWorkflowService $workflow): RedirectResponse
    {
        [$draft, $newlyFinalized] = $workflow->finalizeGuestDraft($draft);

        $draft->loadMissing('application');

        if (! $newlyFinalized) {
            app(SystemEventLogger::class)->log(
                module: 'graduation_application',
                action: 'admin.draft.manual_verify.skipped',
                message: 'Admin manual verification skipped because the draft was already verified.',
                subject: $draft->application ?? $draft,
                meta: [
                    'draft_id' => $draft->id,
                    'tracking_code' => $draft->ensureTrackingCode(),
                ],
            );

            return back()->with('info', 'This draft was already verified.');
        }

        app(SystemEventLogger::class)->log(
            module: 'graduation_application',
            action: 'admin.draft.manually_verified',
            message: 'Admin manually verified a guest application draft.',
            subject: $draft->application ?? $draft,
            meta: [
                'draft_id' => $draft->id,
                'tracking_code' => $draft->ensureTrackingCode(),
            ],
        );

        $emailSent = $this->sendManualVerificationAccessEmail($draft);

        if (! $emailSent) {
            return back()->with('warning', 'Draft manually verified, but the access email could not be sent.');
        }

        return back()->with('success', 'Draft manually verified and an access email was sent.');
    }

    /**
     * Remove the specified student from storage.
     */
    public function destroy(User $student): RedirectResponse
    {
        if ($student->profile) {
            $photoPath = ProfilePhoto::storagePath($student->profile->photo_path);
            if ($photoPath && Storage::disk('public')->exists($photoPath)) {
                Storage::disk('public')->delete($photoPath);
            }
            $student->profile->delete();
        }

        $student->delete();

        return redirect()->route('admin.students.index')
            ->with('success', 'Student deleted successfully.');
    }

    /**
     * Manually reset the student's password entered by the admin.
     */
    public function resetPassword(Request $request, User $student): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $student->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        return redirect()->back()->with('success', 'Password updated successfully for '.$student->student_id.'.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function manualVerificationDrafts(): array
    {
        return GuestApplicationDraft::query()
            ->with(['window:id,title', 'application:id,application_number'])
            ->where(function (Builder $query) {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            })
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(fn (GuestApplicationDraft $draft) => [
                'id' => $draft->id,
                'applicant_name' => $this->draftApplicantName($draft->payload ?? []),
                'email' => $draft->email,
                'student_id' => $draft->student_id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'window_title' => $draft->window?->title ?? 'Unavailable',
                'application_number' => $draft->application?->application_number,
                'created_at' => $draft->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function draftApplicantName(array $payload): string
    {
        $name = trim(implode(' ', array_filter([
            $payload['first_name'] ?? null,
            $payload['middle_name'] ?? null,
            $payload['last_name'] ?? null,
            $payload['suffix'] ?? null,
        ])));

        return $name !== '' ? $name : 'Guest Applicant';
    }

    private function sendManualVerificationAccessEmail(GuestApplicationDraft $draft): bool
    {
        $notification = new GuestApplicationAccessNotification($draft);
        $mailMeta = [
            'notification' => $notification::class,
            'mailer' => config('mail.default'),
            'delivery_mode' => is_subclass_of($notification::class, \Illuminate\Contracts\Queue\ShouldQueue::class)
                ? 'queued'
                : 'sync',
        ];

        try {
            $draft->notify($notification);
            SystemHealthCheck::record('mail', 'ok', 'Admin manual verification access email sent.', $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'admin.manual_verification.access_sent',
                message: 'Admin manual verification access email sent.',
                subject: $draft,
                meta: $mailMeta,
            );

            return true;
        } catch (\Throwable $e) {
            SystemHealthCheck::record('mail', 'critical', $e->getMessage(), $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'admin.manual_verification.access_sent',
                message: 'Admin manual verification access email failed.',
                status: 'failed',
                severity: 'error',
                subject: $draft,
                meta: [
                    ...$mailMeta,
                    'error' => $e->getMessage(),
                ],
            );

            return false;
        }
    }
}
