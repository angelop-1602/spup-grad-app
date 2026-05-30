<?php

namespace App\Support;

use App\Models\Application;
use App\Models\SystemEvent;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DashboardOverview
{
    /**
     * @return array<string, mixed>
     */
    public function applicantPayload(Application $application, string $showRouteName): array
    {
        $application->loadMissing(['user.profile', 'window', 'department', 'course']);

        return [
            'id' => $application->id,
            'application_number' => $application->application_number,
            'student_name' => $this->studentName($application),
            'student_id' => $application->user?->student_id,
            'email' => $application->user?->email,
            'department_name' => $application->department?->name,
            'department_code' => $application->department?->code,
            'course_name' => $application->course?->name,
            'major' => $application->major,
            'status' => $application->status,
            'window_title' => $application->window?->title,
            'submitted_at' => $application->created_at?->toIso8601String(),
            'show_url' => route($showRouteName, $application, absolute: false),
        ];
    }

    /**
     * @param  Collection<int, SystemEvent>  $events
     * @return array<int, array<string, mixed>>
     */
    public function auditTrailPayload(Collection $events, string $applicationRouteName): array
    {
        $applications = Application::query()
            ->whereIn(
                'id',
                $events
                    ->where('subject_type', Application::class)
                    ->pluck('subject_id')
                    ->filter()
                    ->unique()
                    ->values()
                    ->all()
            )
            ->get()
            ->keyBy('id');

        return $events
            ->map(function (SystemEvent $event) use ($applications, $applicationRouteName) {
                $application = $event->subject_type === Application::class && $event->subject_id
                    ? $applications->get($event->subject_id)
                    : null;

                return [
                    'id' => $event->id,
                    'module' => $event->module,
                    'action' => $event->action,
                    'action_label' => $this->actionLabel($event->action),
                    'status' => $event->status,
                    'severity' => $event->severity,
                    'actor_label' => $event->actor_label,
                    'actor_guard' => $event->actor_guard,
                    'message' => $event->message,
                    'created_at' => $event->created_at?->toIso8601String(),
                    'subject_label' => $application?->application_number,
                    'subject_url' => $application
                        ? route($applicationRouteName, $application, absolute: false)
                        : null,
                ];
            })
            ->values()
            ->all();
    }

    private function studentName(Application $application): string
    {
        $profile = $application->user?->profile;

        if (! $profile) {
            return $application->user?->name ?? 'Unknown Student';
        }

        $name = trim(implode(' ', array_filter([
            $profile->first_name,
            $profile->middle_name,
            $profile->last_name,
            $profile->suffix,
        ])));

        return $name !== '' ? $name : ($application->user?->name ?? 'Unknown Student');
    }

    private function actionLabel(string $action): string
    {
        return Str::of($action)
            ->replace(['admin.', 'coordinator.', 'developer.', 'guest.', 'student.'], '')
            ->replace(['.', '_'], ' ')
            ->headline()
            ->toString();
    }
}
