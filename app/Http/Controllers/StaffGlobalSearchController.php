<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\GuestApplicationDraft;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffGlobalSearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        if (mb_strlen($search) < 2) {
            return response()->json(['results' => []]);
        }

        $role = $this->role($request);

        return response()->json([
            'results' => collect()
                ->merge($this->applicationResults($request, $role, $search))
                ->merge($this->draftResults($request, $role, $search))
                ->merge($this->windowResults($role, $search))
                ->merge($this->studentResults($role, $search))
                ->merge($this->ticketResults($role, $search))
                ->take(12)
                ->values(),
        ]);
    }

    private function role(Request $request): string
    {
        if ($request->user('admin')) {
            return 'admin';
        }

        if ($request->user('coordinator')) {
            return 'coordinator';
        }

        return 'developer';
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function applicationResults(Request $request, string $role, string $search): array
    {
        $query = Application::query()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,middle_name,last_name,suffix',
                'department:id,name,code',
                'course:id,name,code,department_id',
                'window:id,title',
            ])
            ->where(function (Builder $query) use ($search): void {
                $query->where('application_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $userQuery) use ($search): void {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('student_id', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhereHas('profile', function (Builder $profileQuery) use ($search): void {
                                $profileQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('middle_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%")
                                    ->orWhere('suffix', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('department', function (Builder $departmentQuery) use ($search): void {
                        $departmentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('course', function (Builder $courseQuery) use ($search): void {
                        $courseQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });

        if ($role === 'coordinator') {
            $coordinator = $request->user('coordinator');

            $coordinator
                ? $coordinator->scopeApplicationsToAssignments($query)
                : $query->whereRaw('1 = 0');
        }

        return $query
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Application $application) => [
                'id' => 'application-'.$application->id,
                'type' => 'application',
                'title' => $application->application_number,
                'subtitle' => trim(implode(' - ', array_filter([
                    $this->applicationApplicantName($application),
                    $application->window?->title,
                    $application->course?->code ?? $application->course?->name,
                ]))),
                'url' => $this->applicationUrl($role, $application),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function draftResults(Request $request, string $role, string $search): array
    {
        $query = GuestApplicationDraft::query()
            ->with([
                'window:id,title',
                'application:id,application_number',
            ])
            ->where(function (Builder $query): void {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            })
            ->where(function (Builder $query) use ($search): void {
                $query->where('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhere('tracking_code', 'like', "%{$search}%")
                    ->orWhere('tracking_pin', 'like', "%{$search}%")
                    ->orWhere('payload->first_name', 'like', "%{$search}%")
                    ->orWhere('payload->middle_name', 'like', "%{$search}%")
                    ->orWhere('payload->last_name', 'like', "%{$search}%")
                    ->orWhere('payload', 'like', "%{$search}%")
                    ->orWhereHas('application', function (Builder $applicationQuery) use ($search): void {
                        $applicationQuery->where('application_number', 'like', "%{$search}%");
                    });
            });

        if ($role === 'coordinator') {
            $coordinator = $request->user('coordinator');

            $coordinator
                ? $coordinator->scopeDraftsToAssignments($query)
                : $query->whereRaw('1 = 0');
        }

        return $query
            ->latest('created_at')
            ->limit(4)
            ->get()
            ->map(fn (GuestApplicationDraft $draft) => [
                'id' => 'draft-'.$draft->id,
                'type' => 'draft',
                'title' => $this->draftApplicantName($draft->payload ?? []),
                'subtitle' => trim(implode(' - ', array_filter([
                    $this->draftVerificationStatus($draft),
                    $draft->application?->application_number,
                    $draft->ensureTrackingCode(),
                    $draft->student_id,
                    $draft->email,
                    $draft->window?->title,
                ]))),
                'url' => $this->draftUrl($role, $draft),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function windowResults(string $role, string $search): array
    {
        return ApplicationWindow::query()
            ->withCount('applications')
            ->where(function (Builder $query) use ($search): void {
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->latest('start_date')
            ->limit(3)
            ->get()
            ->map(fn (ApplicationWindow $window) => [
                'id' => 'window-'.$window->id,
                'type' => 'window',
                'title' => $window->title,
                'subtitle' => $window->applications_count.' applications',
                'url' => $this->windowUrl($role, $window),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function studentResults(string $role, string $search): array
    {
        if ($role !== 'admin') {
            return [];
        }

        return User::query()
            ->where(function (Builder $query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhereHas('profile', function (Builder $profileQuery) use ($search): void {
                        $profileQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            })
            ->orderBy('name')
            ->limit(3)
            ->get()
            ->map(fn (User $student) => [
                'id' => 'student-'.$student->id,
                'type' => 'student',
                'title' => $student->name,
                'subtitle' => trim(implode(' - ', array_filter([
                    $student->student_id,
                    $student->email,
                ]))),
                'url' => route('admin.students.show', $student, false),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function ticketResults(string $role, string $search): array
    {
        if ($role !== 'developer') {
            return [];
        }

        return SupportTicket::query()
            ->where(function (Builder $query) use ($search): void {
                $query->where('ticket_number', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('reporter_name', 'like', "%{$search}%")
                    ->orWhere('reporter_email', 'like', "%{$search}%");
            })
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (SupportTicket $ticket) => [
                'id' => 'ticket-'.$ticket->id,
                'type' => 'ticket',
                'title' => $ticket->ticket_number,
                'subtitle' => $ticket->subject,
                'url' => route('developer.tickets.show', $ticket, false),
            ])
            ->values()
            ->all();
    }

    private function applicationUrl(string $role, Application $application): string
    {
        return match ($role) {
            'admin' => route('admin.applications.show', $application, false),
            'coordinator' => route('coordinator.applications.show', $application, false),
            default => route('developer.applications.edit', $application, false),
        };
    }

    private function draftUrl(string $role, GuestApplicationDraft $draft): string
    {
        return match ($role) {
            'admin' => route('admin.unverified-applications.show', $draft, false),
            'coordinator' => route('coordinator.manual-verification.show', $draft, false),
            default => route('developer.drafts.show', $draft, false),
        };
    }

    private function windowUrl(string $role, ApplicationWindow $window): string
    {
        return match ($role) {
            'admin' => route('admin.windows.show', $window, false),
            'coordinator' => route('coordinator.windows.show', $window, false),
            default => route('developer.windows.show', $window, false),
        };
    }

    private function applicationApplicantName(Application $application): string
    {
        $profile = $application->user?->profile;

        if (! $profile) {
            return $application->user?->name ?? 'Unknown Applicant';
        }

        $name = trim(implode(' ', array_filter([
            $profile->first_name,
            $profile->middle_name,
            $profile->last_name,
            $profile->suffix,
        ])));

        return $name !== '' ? $name : ($application->user?->name ?? 'Unknown Applicant');
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

    private function draftVerificationStatus(GuestApplicationDraft $draft): string
    {
        if ($draft->verified_at && ! $draft->application_id) {
            return 'Needs application';
        }

        return 'Needs verification';
    }
}
