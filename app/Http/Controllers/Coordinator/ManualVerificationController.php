<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\GuestApplicationDraft;
use App\Models\SystemHealthCheck;
use App\Notifications\GuestApplicationAccessNotification;
use App\Support\ApplicationWorkflowService;
use App\Support\SystemEventLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ManualVerificationController extends Controller
{
    public function index(Request $request): Response
    {
        $departmentIds = $this->assignedDepartmentIds();

        $query = GuestApplicationDraft::query()
            ->with(['window:id,title', 'application:id,application_number'])
            ->where(function (Builder $query) {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            });

        $this->scopeDraftsToDepartments($query, $departmentIds);

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function (Builder $query) use ($search) {
                $query->where('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhere('tracking_code', 'like', "%{$search}%")
                    ->orWhere('tracking_pin', 'like', "%{$search}%");
            });
        }

        $drafts = $query
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (GuestApplicationDraft $draft) => [
                'id' => $draft->id,
                'applicant_name' => $this->draftApplicantName($draft->payload ?? []),
                'email' => $draft->email,
                'student_id' => $draft->student_id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'window_title' => $draft->window?->title ?? 'Unavailable',
                'department_id' => $draft->payload['department_id'] ?? null,
                'application_number' => $draft->application?->application_number,
                'created_at' => $draft->created_at?->toIso8601String(),
            ]);

        return Inertia::render('coordinator/manual-verification/index', [
            'drafts' => $drafts,
            'filters' => [
                'search' => $request->string('search')->toString(),
            ],
        ]);
    }

    public function verify(GuestApplicationDraft $draft, ApplicationWorkflowService $workflow): RedirectResponse
    {
        $this->authorizeDraftDepartment($draft);

        [$draft, $newlyFinalized] = $workflow->finalizeGuestDraft($draft);

        $draft->loadMissing('application');

        if (! $newlyFinalized) {
            app(SystemEventLogger::class)->log(
                module: 'graduation_application',
                action: 'coordinator.draft.manual_verify.skipped',
                message: 'Coordinator manual verification skipped because the draft was already verified.',
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
            action: 'coordinator.draft.manually_verified',
            message: 'Coordinator manually verified a guest application draft.',
            subject: $draft->application ?? $draft,
            meta: [
                'draft_id' => $draft->id,
                'tracking_code' => $draft->ensureTrackingCode(),
            ],
        );

        if (! $this->sendManualVerificationAccessEmail($draft)) {
            return back()->with('warning', 'Draft manually verified, but the access email could not be sent.');
        }

        return back()->with('success', 'Draft manually verified and an access email was sent.');
    }

    /**
     * @return array<int, int>
     */
    private function assignedDepartmentIds(): array
    {
        $coordinator = Auth::guard('coordinator')->user();

        if (! $coordinator) {
            return [];
        }

        return $coordinator
            ->departments()
            ->pluck('departments.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  array<int, int>  $departmentIds
     */
    private function scopeDraftsToDepartments(Builder $query, array $departmentIds): void
    {
        if ($departmentIds === []) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->whereIn('payload->department_id', $departmentIds);
    }

    private function authorizeDraftDepartment(GuestApplicationDraft $draft): void
    {
        $departmentId = (int) ($draft->payload['department_id'] ?? 0);

        if (! in_array($departmentId, $this->assignedDepartmentIds(), true)) {
            abort(403, 'Unauthorized access to this draft.');
        }
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
            SystemHealthCheck::record('mail', 'ok', 'Coordinator manual verification access email sent.', $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'coordinator.manual_verification.access_sent',
                message: 'Coordinator manual verification access email sent.',
                subject: $draft,
                meta: $mailMeta,
            );

            return true;
        } catch (\Throwable $e) {
            SystemHealthCheck::record('mail', 'critical', $e->getMessage(), $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'coordinator.manual_verification.access_failed',
                message: 'Coordinator manual verification access email failed.',
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
