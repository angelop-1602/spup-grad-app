<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApplicationWindow;
use App\Models\GuestApplicationDraft;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnverifiedApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $selectedWindowId = $this->selectedWindowId($request);
        $search = trim($request->string('search')->toString());

        $query = GuestApplicationDraft::query()
            ->with(['window:id,title', 'application:id,application_number'])
            ->when($selectedWindowId, fn (Builder $query) => $query->where('window_id', $selectedWindowId))
            ->where(function (Builder $query) {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            });

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                $query->where('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhere('tracking_code', 'like', "%{$search}%")
                    ->orWhere('tracking_pin', 'like', "%{$search}%")
                    ->orWhere('payload->first_name', 'like', "%{$search}%")
                    ->orWhere('payload->middle_name', 'like', "%{$search}%")
                    ->orWhere('payload->last_name', 'like', "%{$search}%")
                    ->orWhereHas('application', function (Builder $applicationQuery) use ($search): void {
                        $applicationQuery->where('application_number', 'like', "%{$search}%");
                    });
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
                'application_number' => $draft->application?->application_number,
                'application_edit_url' => $draft->application
                    ? route('admin.applications.edit', $draft->application->application_number, false)
                    : null,
                'verification_status' => $this->draftVerificationStatus($draft),
                'created_at' => $draft->created_at?->toIso8601String(),
                'verified_at' => $draft->verified_at?->toIso8601String(),
            ]);

        $currentWindow = ApplicationWindow::current();

        return Inertia::render('admin/unverified-applications/index', [
            'drafts' => $drafts,
            'applicationWindows' => $this->applicationWindowOptions(),
            'currentWindow' => $this->windowPayload($currentWindow),
            'selectedWindowId' => $selectedWindowId,
            'filters' => [
                'search' => $search,
                'window_id' => $selectedWindowId ? (string) $selectedWindowId : 'all',
            ],
        ]);
    }

    private function selectedWindowId(Request $request): ?int
    {
        if ($request->has('window_id')) {
            $value = $request->string('window_id')->toString();

            if ($value === 'all' || $value === '') {
                return null;
            }

            $windowId = (int) $value;

            return ApplicationWindow::query()->whereKey($windowId)->exists()
                ? $windowId
                : ApplicationWindow::currentOrLatest()?->id;
        }

        return ApplicationWindow::currentOrLatest()?->id;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function applicationWindowOptions(): array
    {
        return ApplicationWindow::query()
            ->withCount('applications')
            ->orderedForSelection()
            ->get()
            ->map(fn (ApplicationWindow $window) => [
                'id' => $window->id,
                'title' => $window->title,
                'status' => $window->status,
                'start_date' => $window->start_date?->toDateString(),
                'end_date' => $window->end_date?->toDateString(),
                'applications_count' => $window->applications_count,
            ])
            ->values()
            ->all();
    }

    private function windowPayload(?ApplicationWindow $window): ?array
    {
        if (! $window) {
            return null;
        }

        return [
            'id' => $window->id,
            'title' => $window->title,
            'status' => $window->status,
            'start_date' => $window->start_date?->toDateString(),
            'end_date' => $window->end_date?->toDateString(),
        ];
    }

    private function draftVerificationStatus(GuestApplicationDraft $draft): string
    {
        if ($draft->hasBeenVerified()) {
            return 'verified';
        }

        if ($draft->verified_at && ! $draft->application_id) {
            return 'needs_application';
        }

        return 'pending';
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
}
