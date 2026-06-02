<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuestApplicationRequest;
use App\Http\Requests\UpdateGuestApplicationRequest;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\SystemHealthCheck;
use App\Models\User;
use App\Notifications\GuestApplicationAccessNotification;
use App\Notifications\GuestApplicationVerificationNotification;
use App\Support\ApplicationWorkflowService;
use App\Support\RequirementFileStorage;
use App\Support\SystemEventLogger;
use App\Support\VerificationLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class GuestApplicationController extends Controller
{
    private const DRAFT_SESSION_KEY = 'guest_application_draft_id';

    private const ACCESS_SESSION_KEY = 'guest_application_access';

    public function index(Request $request): Response
    {
        $currentWindow = ApplicationWindow::current();
        $departments = $currentWindow ? $this->departments() : collect();

        return Inertia::render('apply/index', [
            'currentWindow' => $currentWindow,
            'canApply' => (bool) $currentWindow,
            'departments' => $departments,
        ]);
    }

    public function store(StoreGuestApplicationRequest $request, ApplicationWorkflowService $workflow): RedirectResponse
    {
        $currentWindow = ApplicationWindow::current();

        if (! $currentWindow || $currentWindow->id !== (int) $request->validated('window_id')) {
            return redirect()->route('apply.index')
                ->withErrors(['window_id' => 'No active application window is currently open.']);
        }

        $validated = $request->validated();
        $email = strtolower($validated['email']);
        $draftPayload = $request->draftPayload();

        if ($request->hasFile('photo')) {
            $draftPayload['photo_path'] = $workflow->storeProfilePhoto(
                $request->file('photo'),
                $validated,
                (string) $validated['student_id'],
            );
        }

        $draft = GuestApplicationDraft::query()
            ->where('window_id', $validated['window_id'])
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if ($draft) {
            $this->rememberDraft($request, $draft);
            $this->logGuestEvent($draft, 'graduation_application', 'guest.draft.reused', 'Guest reopened an existing application draft.');

            return redirect()->route('apply.pending.show', $draft)
                ->with('status', $draft->hasBeenVerified()
                    ? 'An application for this email already exists for the current window. Use the access options below.'
                    : 'You already started an application for this email. Verify it or resend the email below.');
        }

        $existingUser = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if ($existingUser) {
            $existingApplication = $existingUser->applications()
                ->where('window_id', $validated['window_id'])
                ->first();

            if ($existingApplication) {
                $draft = GuestApplicationDraft::create([
                    'window_id' => $validated['window_id'],
                    'email' => $email,
                    'student_id' => $validated['student_id'],
                    'payload' => $draftPayload,
                    'verified_at' => $existingUser->email_verified_at ?? now(),
                    'user_id' => $existingUser->id,
                    'application_id' => $existingApplication->id,
                ]);

                $this->rememberDraft($request, $draft);
                $this->logGuestEvent($draft, 'graduation_application', 'guest.existing_application.found', 'Guest matched an existing application for this window.', subject: $existingApplication);

                return redirect()->route('apply.pending.show', $draft)
                    ->with('status', 'An application already exists for this email and graduation window.');
            }
        }

        $draft = GuestApplicationDraft::create([
            'window_id' => $validated['window_id'],
            'email' => $email,
            'student_id' => $validated['student_id'],
            'payload' => $draftPayload,
        ]);

        $this->logGuestEvent($draft, 'graduation_application', 'guest.draft.created', 'Guest application draft was created.');
        $this->notifyDraft($draft, new GuestApplicationVerificationNotification($draft), 'email.verification.sent', 'Verification email sent to guest applicant.');
        $this->rememberDraft($request, $draft);

        return redirect()->route('apply.pending.show', $draft)
            ->with('status', 'Your draft has been saved. Check your email to verify and submit your application.');
    }

    public function pending(Request $request, GuestApplicationDraft $draft): Response|RedirectResponse
    {
        $guard = $this->ensureDraftAccess($request, $draft);
        if ($guard) {
            return $guard;
        }

        return Inertia::render('apply/pending', [
            'draft' => $this->pendingPayload($draft),
        ]);
    }

    public function track(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tracking_code' => ['required', 'string', 'max:50'],
            'tracking_pin' => ['required', 'digits:6'],
        ], [
            'tracking_code.required' => 'Enter the tracking code from your email.',
            'tracking_pin.required' => 'Enter the 6-digit tracking PIN from your email.',
            'tracking_pin.digits' => 'The tracking PIN must be exactly 6 digits.',
        ]);

        $trackingCode = GuestApplicationDraft::normalizeTrackingCode($validated['tracking_code']);
        $trackingPin = (string) $validated['tracking_pin'];

        $draft = GuestApplicationDraft::query()
            ->where('tracking_code', $trackingCode)
            ->first();

        if (! $draft || ! hash_equals($draft->ensureTrackingPin(), $trackingPin)) {
            app(SystemEventLogger::class)->log(
                module: 'graduation_application',
                action: 'guest.tracking.failed',
                message: 'Guest tracking lookup failed.',
                status: 'failed',
                severity: 'warning',
                meta: ['tracking_code' => $trackingCode],
            );

            return redirect()->route('home')
                ->withErrors([
                    'tracking_code' => 'We could not find an application that matches that tracking code and PIN.',
                ])
                ->withInput([
                    'tracking_code' => Str::upper($validated['tracking_code']),
                    'tracking_pin' => $trackingPin,
                ]);
        }

        $this->rememberDraft($request, $draft);
        $this->logGuestEvent($draft, 'graduation_application', 'guest.tracking.success', 'Guest tracking lookup succeeded.');

        if ($draft->application_id) {
            $draft->loadMissing('application');

            if ($draft->application) {
                $this->grantPortalAccess($request, $draft->application->id);
                $this->logGuestEvent($draft, 'graduation_application', 'guest.portal.opened_from_tracking', 'Guest opened the application portal from tracking.', subject: $draft->application);

                return redirect()->route('apply.portal.show', $draft->application);
            }
        }

        return redirect()->route('apply.pending.show', $draft);
    }

    public function recoverTracking(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ], [
            'email.required' => 'Enter the email you used for your application.',
            'email.email' => 'Enter a valid email address.',
        ]);

        $email = Str::lower($validated['email']);

        $draftQuery = GuestApplicationDraft::query()
            ->whereRaw('lower(email) = ?', [$email]);

        if ($currentWindow = ApplicationWindow::current()) {
            $draftQuery->orderByRaw('case when window_id = ? then 0 else 1 end', [$currentWindow->id]);
        }

        $draft = $draftQuery
            ->orderByDesc('id')
            ->first();

        if ($draft) {
            $this->logGuestEvent($draft, 'graduation_application', 'guest.tracking.recovery_requested', 'Guest requested tracking recovery.');

            if ($draft->hasBeenVerified()) {
                $this->notifyDraft($draft, new GuestApplicationAccessNotification($draft), 'email.access.sent', 'Guest portal access email sent.');
            } else {
                $this->notifyDraft($draft, new GuestApplicationVerificationNotification($draft), 'email.verification.sent', 'Verification email sent to guest applicant.');
            }
        } else {
            app(SystemEventLogger::class)->log(
                module: 'graduation_application',
                action: 'guest.tracking.recovery_requested',
                message: 'Guest requested tracking recovery for an unknown email.',
                meta: SystemEventLogger::emailMeta($email),
            );
        }

        return redirect()->route('home')
            ->with('success', 'If we found an application for that email, we sent your tracking details and the next link to continue.');
    }

    public function resend(Request $request, GuestApplicationDraft $draft): RedirectResponse
    {
        if ($guard = $this->ensureDraftAccess($request, $draft)) {
            return $guard;
        }

        if ($draft->hasBeenVerified()) {
            $this->notifyDraft($draft, new GuestApplicationAccessNotification($draft), 'email.access.sent', 'Guest portal access email sent.');

            return redirect()->route('apply.pending.show', $draft)
                ->with('status', 'A fresh guest portal access link has been sent to your email.');
        }

        $this->notifyDraft($draft, new GuestApplicationVerificationNotification($draft), 'email.verification.sent', 'Verification email sent to guest applicant.');

        return redirect()->route('apply.pending.show', $draft)
            ->with('status', 'A fresh verification email has been sent.');
    }

    public function changeEmail(Request $request, GuestApplicationDraft $draft): RedirectResponse
    {
        if ($guard = $this->ensureDraftAccess($request, $draft)) {
            return $guard;
        }

        if ($draft->hasBeenVerified()) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['email' => 'Verified applications can no longer change email from this screen.']);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $newEmail = strtolower($validated['email']);
        $duplicateWindowId = ApplicationWindow::current()?->id ?? $draft->window_id;

        $existingDraft = GuestApplicationDraft::query()
            ->where('window_id', $duplicateWindowId)
            ->whereKeyNot($draft->id)
            ->whereRaw('lower(email) = ?', [$newEmail])
            ->first();

        if ($existingDraft) {
            $this->rememberDraft($request, $existingDraft);

            return redirect()->route('apply.pending.show', $existingDraft)
                ->with('status', 'That email already has an application draft for this graduation window.');
        }

        $userForEmail = User::query()
            ->whereRaw('lower(email) = ?', [$newEmail])
            ->first();

        if ($userForEmail && $userForEmail->student_id && strcasecmp((string) $userForEmail->student_id, $draft->student_id) !== 0) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['email' => 'This email is already associated with a different student ID.']);
        }

        $applicationForEmail = Application::query()
            ->where('window_id', $duplicateWindowId)
            ->whereHas('user', fn ($query) => $query->whereRaw('lower(email) = ?', [$newEmail]))
            ->with('user:id,student_id,email')
            ->first();

        if ($applicationForEmail?->user?->student_id && strcasecmp((string) $applicationForEmail->user->student_id, $draft->student_id) !== 0) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['email' => 'This email already has an application for the current graduation window.']);
        }

        $applicationForStudentId = Application::query()
            ->where('window_id', $duplicateWindowId)
            ->whereHas('user', fn ($query) => $query->where('student_id', $draft->student_id))
            ->with('user:id,student_id,email')
            ->first();

        if ($applicationForStudentId?->user?->email && strcasecmp($applicationForStudentId->user->email, $newEmail) !== 0) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['email' => 'This student ID already has an application for the current graduation window.']);
        }

        $oldEmail = $draft->email;
        $draft->update(['email' => $newEmail]);
        $this->rememberDraft($request, $draft);
        $this->logGuestEvent($draft, 'graduation_application', 'guest.email.changed', 'Guest application email was changed.', meta: [
            'old_email' => SystemEventLogger::emailMeta($oldEmail),
            'new_email' => SystemEventLogger::emailMeta($newEmail),
        ]);
        $this->notifyDraft($draft, new GuestApplicationVerificationNotification($draft), 'email.verification.sent', 'Verification email sent to guest applicant.');

        return redirect()->route('apply.pending.show', $draft)
            ->with('status', 'Your email address has been updated and a new verification email has been sent.');
    }

    public function verify(Request $request, GuestApplicationDraft $draft, string $hash, ApplicationWorkflowService $workflow): Response|RedirectResponse
    {
        if (! hash_equals($hash, sha1($draft->email))) {
            abort(403, 'Invalid verification link.');
        }

        if (! VerificationLinks::hasValidSignature($request)) {
            return $this->handleInvalidVerificationLink($request, $draft);
        }

        [$draft, $newlyFinalized] = $workflow->finalizeGuestDraft($draft);

        $this->rememberDraft($request, $draft);

        if ($newlyFinalized) {
            $this->logGuestEvent($draft, 'graduation_application', 'guest.application.verified', 'Guest verified and finalized the graduation application.', subject: $draft->application);
            $this->notifyDraft($draft, new GuestApplicationAccessNotification($draft), 'email.access.sent', 'Guest portal access email sent.');
        } else {
            $this->logGuestEvent($draft, 'graduation_application', 'guest.application.already_verified', 'Guest opened an already verified application link.', subject: $draft->application);
        }

        return Inertia::render('apply/verified', [
            'draft' => [
                'id' => $draft->id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'access_url' => $this->guestAccessUrl($draft),
            ],
            'alreadyVerified' => ! $newlyFinalized,
        ]);
    }

    public function access(Request $request, GuestApplicationDraft $draft): RedirectResponse
    {
        if (! $draft->application) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['application' => 'This application is not available yet.']);
        }

        $this->rememberDraft($request, $draft);
        $this->grantPortalAccess($request, $draft->application->id);
        $this->logGuestEvent($draft, 'graduation_application', 'guest.portal.accessed', 'Guest opened the application portal from an access link.', subject: $draft->application);

        return redirect()->route('apply.portal.show', $draft->application);
    }

    public function show(Request $request, Application $application, ApplicationWorkflowService $workflow): Response
    {
        $application->load([
            'window',
            'department',
            'course',
            'subjectEnrollments',
            'requirements.children',
            'user.profile',
        ]);

        $workflow->ensureRequirements($application);

        $draft = null;
        $currentDraftId = $request->session()->get(self::DRAFT_SESSION_KEY);

        if ($currentDraftId) {
            $draft = GuestApplicationDraft::query()
                ->whereKey($currentDraftId)
                ->where('application_id', $application->id)
                ->first();
        }

        if (! $draft) {
            $draft = GuestApplicationDraft::query()
                ->where('application_id', $application->id)
                ->latest('id')
                ->first();
        }

        return Inertia::render('applications/show', [
            'application' => $application,
            'profile' => $application->user->profile,
            'portalMode' => 'guest',
        ]);
    }

    public function download(Application $application): BinaryFileResponse
    {
        $this->logApplicationGuestEvent($application, 'graduation_application', 'guest.application.downloaded', 'Guest downloaded the application document.');

        return ApplicationController::generatePdf($application);
    }

    public function downloadPhoto(Application $application): BinaryFileResponse
    {
        $this->logApplicationGuestEvent($application, 'graduation_application', 'guest.photo.downloaded', 'Guest downloaded the profile photo.');

        return ApplicationController::generateProfilePhotoDownload($application);
    }

    public function requirementFile(
        Request $request,
        Application $application,
        ApplicationRequirement $requirement,
        RequirementFileStorage $files,
    ): BinaryFileResponse {
        if ($requirement->application_id !== $application->id) {
            abort(403);
        }

        $this->logApplicationGuestEvent($application, 'graduation_application', 'guest.requirement_file.viewed', 'Guest viewed a requirement file.', subject: $requirement);

        return $files->response($requirement, $request);
    }

    public function edit(Application $application): Response
    {
        $application->load(['window', 'department', 'course', 'subjectEnrollments', 'user.profile']);

        return Inertia::render('applications/edit', [
            'application' => $application,
            'profile' => $application->user->profile,
            'departments' => $this->departments(),
            'isApproved' => $application->status === 'approved',
            'portalMode' => 'guest',
        ]);
    }

    public function update(UpdateGuestApplicationRequest $request, Application $application, ApplicationWorkflowService $workflow): RedirectResponse
    {
        $workflow->updateApplicationForUser($application, $request->validated(), $request->file('photo'));

        $application->load('requirements.children');
        $oldStatus = $application->status;
        $application->recalculateStatusBasedOnRequirements();
        $newStatus = $application->fresh()->status;

        $message = 'Application updated successfully.';
        if ($oldStatus !== $newStatus) {
            $message .= " Application status updated from '{$oldStatus}' to '{$newStatus}' based on requirements checklist.";
        }

        $this->logApplicationGuestEvent($application, 'graduation_application', 'guest.application.updated', 'Guest updated the graduation application.', meta: [
            'old_status' => $oldStatus,
            'new_status' => $newStatus,
        ]);

        return redirect()->route('apply.portal.show', $application)
            ->with('success', $message.' Your profile has been updated with the changes you made.');
    }

    public function uploadRequirement(Request $request, Application $application, ApplicationRequirement $requirement, ApplicationWorkflowService $workflow): RedirectResponse
    {
        if ($requirement->application_id !== $application->id) {
            abort(403);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,jpg,jpeg,png'],
        ]);

        $updatedRequirement = $workflow->storeRequirementFile($application, $requirement, $request->file('file'));
        $workflow->notifyRequirementUploaded($application, $updatedRequirement);
        $this->logApplicationGuestEvent($application, 'graduation_application', 'guest.requirement.uploaded', 'Guest uploaded a requirement file.', subject: $updatedRequirement, meta: [
            'requirement_label' => $updatedRequirement->requirement_label,
            'mime_type' => $request->file('file')?->getMimeType(),
            'size' => $request->file('file')?->getSize(),
        ]);

        return redirect()->route('apply.portal.show', $application)
            ->with('success', 'File uploaded successfully.');
    }

    private function ensureDraftAccess(Request $request, GuestApplicationDraft $draft): ?RedirectResponse
    {
        $currentDraftId = $request->session()->get(self::DRAFT_SESSION_KEY);
        $allowedIds = $request->session()->get(self::ACCESS_SESSION_KEY, []);

        if ($currentDraftId === $draft->id) {
            return null;
        }

        if ($draft->application_id && in_array($draft->application_id, $allowedIds, true)) {
            return null;
        }

        return redirect()->route('apply.index')
            ->with('error', 'This guest application session has expired. Start again to continue.');
    }

    private function handleInvalidVerificationLink(Request $request, GuestApplicationDraft $draft): RedirectResponse
    {
        $this->rememberDraft($request, $draft);

        $this->logGuestEvent($draft, 'graduation_application', 'guest.verification_link_invalid', 'Guest opened an expired or invalid verification link.', status: 'failed', severity: 'warning', meta: [
            'expired' => VerificationLinks::hasExpired($request),
            'has_correct_signature' => VerificationLinks::hasCorrectSignature($request),
        ]);

        if ($draft->hasBeenVerified()) {
            return redirect()->route('apply.pending.show', $draft)
                ->with('status', 'This verification link is no longer valid, but your application is already verified. Use the application access option below.');
        }

        $message = VerificationLinks::hasExpired($request)
            ? 'This verification link has expired. Please request a fresh verification email below.'
            : 'This verification link is no longer valid. Please request a fresh verification email below.';

        return redirect()->route('apply.pending.show', $draft)
            ->with('error', $message);
    }

    private function rememberDraft(Request $request, GuestApplicationDraft $draft): void
    {
        $request->session()->put(self::DRAFT_SESSION_KEY, $draft->id);
    }

    private function grantPortalAccess(Request $request, int $applicationId): void
    {
        $allowed = $request->session()->get(self::ACCESS_SESSION_KEY, []);
        if (! in_array($applicationId, $allowed, true)) {
            $allowed[] = $applicationId;
        }

        $request->session()->put(self::ACCESS_SESSION_KEY, array_values(array_unique($allowed)));
    }

    private function guestAccessUrl(GuestApplicationDraft $draft): string
    {
        return URL::temporarySignedRoute(
            'apply.access',
            now()->addDays(30),
            ['draft' => $draft->getKey()]
        );
    }

    private function pendingPayload(GuestApplicationDraft $draft): array
    {
        $draft->loadMissing('application');

        $application = $draft->application;

        return [
            'id' => $draft->id,
            'email' => $draft->email,
            'tracking_code' => $draft->ensureTrackingCode(),
            'tracking_pin' => $draft->ensureTrackingPin(),
            'verified_at' => $draft->verified_at?->toIso8601String(),
            'access_url' => $application ? $this->guestAccessUrl($draft) : null,
        ];
    }

    private function departments()
    {
        return Department::with([
            'courses' => function ($query) {
                $query->active()->orderBy('name');
            },
            'courses.majors' => function ($query) {
                $query->active()->orderBy('name');
            },
        ])->active()->orderBy('name')->get();
    }

    private function notifyDraft(GuestApplicationDraft $draft, object $notification, string $action, string $message): void
    {
        $mailMeta = [
            'notification' => $notification::class,
            'mailer' => config('mail.default'),
            'delivery_mode' => is_subclass_of($notification::class, \Illuminate\Contracts\Queue\ShouldQueue::class)
                ? 'queued'
                : 'sync',
        ];

        try {
            $draft->notify($notification);
            SystemHealthCheck::record('mail', 'ok', $message, $mailMeta);
            $this->logGuestEvent($draft, 'email', $action, $message, meta: $mailMeta);
        } catch (\Throwable $e) {
            SystemHealthCheck::record('mail', 'critical', $e->getMessage(), $mailMeta);
            $this->logGuestEvent($draft, 'email', $action, $message, status: 'failed', severity: 'error', meta: [
                ...$mailMeta,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function logApplicationGuestEvent(Application $application, string $module, string $action, string $message, string $status = 'success', string $severity = 'info', ?object $subject = null, array $meta = []): void
    {
        $draft = GuestApplicationDraft::query()->where('application_id', $application->id)->latest('id')->first();

        if ($draft) {
            $this->logGuestEvent($draft, $module, $action, $message, $status, $severity, $subject instanceof \Illuminate\Database\Eloquent\Model ? $subject : $application, $meta);
        }
    }

    private function logGuestEvent(GuestApplicationDraft $draft, string $module, string $action, string $message, string $status = 'success', string $severity = 'info', ?object $subject = null, array $meta = []): void
    {
        app(SystemEventLogger::class)->log(
            module: $module,
            action: $action,
            message: $message,
            status: $status,
            severity: $severity,
            subject: $subject instanceof \Illuminate\Database\Eloquent\Model ? $subject : $draft,
            meta: $meta,
            actor: SystemEventLogger::studentGuest($draft),
        );
    }
}
