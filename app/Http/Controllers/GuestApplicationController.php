<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGuestApplicationRequest;
use App\Http\Requests\UpdateGuestApplicationRequest;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\User;
use App\Notifications\GuestApplicationAccessNotification;
use App\Notifications\GuestApplicationVerificationNotification;
use App\Support\ApplicationWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $draft->notify(new GuestApplicationVerificationNotification($draft));
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

        if ($draft->application_id) {
            $draft->loadMissing('application');

            if ($draft->application) {
                $this->grantPortalAccess($request, $draft->application->id);

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
            if ($draft->hasBeenVerified()) {
                $draft->notify(new GuestApplicationAccessNotification($draft));
            } else {
                $draft->notify(new GuestApplicationVerificationNotification($draft));
            }
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
            $draft->notify(new GuestApplicationAccessNotification($draft));

            return redirect()->route('apply.pending.show', $draft)
                ->with('status', 'A fresh guest portal access link has been sent to your email.');
        }

        $draft->notify(new GuestApplicationVerificationNotification($draft));

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

        $existingDraft = GuestApplicationDraft::query()
            ->where('window_id', $draft->window_id)
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

        $userForStudentId = User::query()
            ->where('student_id', $draft->student_id)
            ->first();

        if ($userForStudentId && strcasecmp($userForStudentId->email, $newEmail) !== 0) {
            return redirect()->route('apply.pending.show', $draft)
                ->withErrors(['email' => 'This student ID is already associated with another email address.']);
        }

        $draft->update(['email' => $newEmail]);
        $this->rememberDraft($request, $draft);
        $draft->notify(new GuestApplicationVerificationNotification($draft));

        return redirect()->route('apply.pending.show', $draft)
            ->with('status', 'Your email address has been updated and a new verification email has been sent.');
    }

    public function verify(Request $request, GuestApplicationDraft $draft, string $hash, ApplicationWorkflowService $workflow): Response
    {
        if (! hash_equals($hash, sha1($draft->email))) {
            abort(403, 'Invalid verification link.');
        }

        [$draft, $newlyFinalized] = $this->finalizeDraft($draft, $workflow);

        $this->rememberDraft($request, $draft);

        if ($newlyFinalized) {
            $draft->notify(new GuestApplicationAccessNotification($draft));
        }

        return Inertia::render('apply/verified', [
            'draft' => [
                'id' => $draft->id,
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
        return ApplicationController::generatePdf($application);
    }

    public function downloadPhoto(Application $application): BinaryFileResponse
    {
        return ApplicationController::generateProfilePhotoDownload($application);
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

        return redirect()->route('apply.portal.show', $application)
            ->with('success', 'File uploaded successfully.');
    }

    /**
     * @return array{0: GuestApplicationDraft, 1: bool}
     */
    private function finalizeDraft(GuestApplicationDraft $draft, ApplicationWorkflowService $workflow): array
    {
        return DB::transaction(function () use ($draft, $workflow) {
            $lockedDraft = GuestApplicationDraft::query()
                ->whereKey($draft->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedDraft->hasBeenVerified()) {
                $lockedDraft->load('application');

                return [$lockedDraft, false];
            }

            $payload = $lockedDraft->payload ?? [];
            $payload['window_id'] = $lockedDraft->window_id;

            $user = User::query()
                ->whereRaw('lower(email) = ?', [$lockedDraft->email])
                ->lockForUpdate()
                ->first();

            $studentUser = User::query()
                ->where('student_id', $lockedDraft->student_id)
                ->lockForUpdate()
                ->first();

            if ($user && $user->student_id && strcasecmp((string) $user->student_id, $lockedDraft->student_id) !== 0) {
                abort(409, 'This email is already associated with a different student ID.');
            }

            if ($studentUser && (! $user || $studentUser->id !== $user->id)) {
                abort(409, 'This student ID is already associated with another email address.');
            }

            if (! $user) {
                $user = User::create([
                    'student_id' => $lockedDraft->student_id,
                    'name' => $workflow->buildUserName($payload, $lockedDraft->student_id),
                    'email' => $lockedDraft->email,
                    'password' => bin2hex(random_bytes(16)),
                    'email_verified_at' => now(),
                ]);
            } else {
                $updates = [
                    'name' => $workflow->buildUserName($payload, $user->name ?: $lockedDraft->student_id),
                ];

                if (! $user->student_id) {
                    $updates['student_id'] = $lockedDraft->student_id;
                }

                if (! $user->email_verified_at) {
                    $updates['email_verified_at'] = now();
                }

                $user->forceFill($updates)->save();
            }

            $workflow->syncProfileForUser($user, $payload);

            $application = $lockedDraft->application_id
                ? Application::find($lockedDraft->application_id)
                : $user->applications()->where('window_id', $lockedDraft->window_id)->first();

            if (! $application) {
                $application = $workflow->createApplicationForUser($user, $payload);
            } else {
                $workflow->updateApplicationForUser($application, $payload);
            }

            $lockedDraft->forceFill([
                'verified_at' => $lockedDraft->verified_at ?? now(),
                'user_id' => $user->id,
                'application_id' => $application->id,
            ])->save();

            $lockedDraft->load('application');

            return [$lockedDraft, true];
        });
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
}
