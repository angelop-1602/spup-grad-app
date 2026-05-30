<?php

namespace App\Support;

use App\Models\Application;
use Illuminate\Database\Eloquent\Builder;

class PossibleDuplicateApplications
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function forApplication(
        Application $application,
        string $showRouteName,
        ?string $editRouteName = null,
        ?string $deleteRouteName = null,
    ): array {
        $application->loadMissing('user.profile');

        $profile = $application->user?->profile;
        $firstName = $this->normalizeNamePart($profile?->first_name);
        $lastName = $this->normalizeNamePart($profile?->last_name);

        if ($firstName === '' || $lastName === '') {
            return [];
        }

        return Application::query()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,middle_name,last_name,suffix',
                'window:id,title',
                'department:id,name,code',
                'course:id,name,code,department_id',
            ])
            ->whereKeyNot($application->getKey())
            ->whereHas('user.profile', function (Builder $query) use ($firstName, $lastName): void {
                $query->whereRaw('lower(trim(first_name)) = ?', [$firstName])
                    ->whereRaw('lower(trim(last_name)) = ?', [$lastName]);
            })
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(fn (Application $candidate) => [
                'id' => $candidate->id,
                'application_number' => $candidate->application_number,
                'applicant_name' => $this->displayName($candidate),
                'student_id' => $candidate->user?->student_id,
                'email' => $candidate->user?->email,
                'window_title' => $candidate->window?->title,
                'department_code' => $candidate->department?->code ?: $candidate->department?->name,
                'course_name' => $candidate->course?->name,
                'status' => $candidate->status,
                'created_at' => $candidate->created_at?->toIso8601String(),
                'show_url' => route($showRouteName, $candidate->application_number, false),
                'edit_url' => $editRouteName ? route($editRouteName, $candidate->application_number, false) : null,
                'delete_url' => $deleteRouteName ? route($deleteRouteName, $candidate->application_number, false) : null,
            ])
            ->values()
            ->all();
    }

    private function normalizeNamePart(?string $value): string
    {
        return strtolower(trim((string) $value));
    }

    private function displayName(Application $application): string
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
}
