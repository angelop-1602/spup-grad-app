<?php

namespace App\Support;

use App\Models\Application;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;

class GuestApplicationDraftDetails
{
    /**
     * @return array<string, mixed>
     */
    public function draftPayload(GuestApplicationDraft $draft, string $role): array
    {
        $draft->loadMissing([
            'window:id,title,start_date,end_date',
            'application:id,application_number,user_id,department_id,course_id,window_id,major,degree_title,presence,status,subject_code,subject_title,units,thesis_dissertation_title,thesis_dissertation_adviser,created_at,updated_at',
            'application.user:id,email,student_id',
            'application.user.profile',
            'application.department:id,name,code',
            'application.course:id,name,code,department_id',
            'application.subjectEnrollments',
        ]);

        $payload = $draft->payload ?? [];
        $application = $draft->application;
        $department = $application?->department ?? $this->departmentFromPayload($payload);
        $course = $application?->course ?? $this->courseFromPayload($payload);

        return [
            'draft' => [
                'id' => $draft->id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'verification_status' => $this->verificationStatus($draft),
                'created_at' => $draft->created_at?->toIso8601String(),
                'verified_at' => $draft->verified_at?->toIso8601String(),
            ],
            'tracking' => $this->trackingForDraft($draft),
            'application' => [
                'id' => $application?->id,
                'application_number' => $application?->application_number,
                'window' => [
                    'id' => $draft->window?->id,
                    'title' => $draft->window?->title ?? 'Unavailable',
                    'start_date' => $draft->window?->start_date?->toIso8601String(),
                    'end_date' => $draft->window?->end_date?->toIso8601String(),
                ],
                'department' => [
                    'id' => $department?->id,
                    'name' => $department?->name ?? 'Unavailable',
                    'code' => $department?->code,
                ],
                'course' => [
                    'id' => $course?->id,
                    'name' => $course?->name ?? 'Unavailable',
                    'code' => $course?->code,
                ],
                'major' => $application?->major ?? ($payload['major'] ?? null),
                'degree_title' => $application?->degree_title ?? ($payload['degree_title'] ?? null),
                'presence' => $application?->presence ?? ($payload['presence'] ?? null),
                'status' => $application?->status ?? $this->verificationStatus($draft),
                'subject_code' => $application?->subject_code ?? ($payload['graduate_subjects'][0]['subject_code'] ?? null),
                'subject_title' => $application?->subject_title ?? ($payload['graduate_subjects'][0]['subject_title'] ?? null),
                'units' => $application?->units ?? ($payload['graduate_subjects'][0]['units'] ?? null),
                'thesis_dissertation_title' => $application?->thesis_dissertation_title ?? ($payload['thesis_dissertation_title'] ?? null),
                'thesis_dissertation_adviser' => $application?->thesis_dissertation_adviser ?? ($payload['thesis_dissertation_adviser'] ?? null),
                'subject_enrollments' => $this->subjectEnrollments($draft),
                'created_at' => $application?->created_at?->toIso8601String() ?? $draft->created_at?->toIso8601String(),
                'updated_at' => $application?->updated_at?->toIso8601String() ?? $draft->updated_at?->toIso8601String(),
            ],
            'user' => [
                'email' => $application?->user?->email ?? $draft->email,
                'student_id' => $application?->user?->student_id ?? $draft->student_id,
            ],
            'profile' => $this->profilePayload($draft),
            'application_url' => $application ? $this->applicationUrl($role, $application) : null,
        ];
    }

    /**
     * @return array<string, string|null>|null
     */
    public function trackingForApplication(Application $application): ?array
    {
        $draft = GuestApplicationDraft::query()
            ->where('application_id', $application->id)
            ->latest('id')
            ->first();

        return $this->trackingForDraft($draft);
    }

    /**
     * @return array<string, string|null>|null
     */
    public function trackingForDraft(?GuestApplicationDraft $draft): ?array
    {
        if (! $draft) {
            return null;
        }

        return [
            'tracking_code' => $draft->ensureTrackingCode(),
            'tracking_pin' => $draft->ensureTrackingPin(),
            'verification_status' => $this->verificationStatus($draft),
            'created_at' => $draft->created_at?->toIso8601String(),
            'verified_at' => $draft->verified_at?->toIso8601String(),
        ];
    }

    public function verificationStatus(GuestApplicationDraft $draft): string
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
     * @return array<string, mixed>
     */
    private function profilePayload(GuestApplicationDraft $draft): array
    {
        $profile = $draft->application?->user?->profile;
        $payload = $draft->payload ?? [];

        $fields = [
            'last_name',
            'first_name',
            'middle_name',
            'suffix',
            'date_of_birth',
            'place_of_birth',
            'sex',
            'civil_status',
            'religion',
            'nationality',
            'permanent_address',
            'contact_number',
            'photo_path',
            'photo_url',
            'highest_education_level',
            'grade_1_school', 'grade_1_year',
            'grade_2_school', 'grade_2_year',
            'grade_3_school', 'grade_3_year',
            'grade_4_school', 'grade_4_year',
            'grade_5_school', 'grade_5_year',
            'grade_6_school', 'grade_6_year',
            'jhs_1_school', 'jhs_1_year',
            'jhs_2_school', 'jhs_2_year',
            'jhs_3_school', 'jhs_3_year',
            'jhs_4_school', 'jhs_4_year',
            'shs_11_school', 'shs_11_year',
            'shs_12_school', 'shs_12_year',
            'college_degree',
            'college_school_name',
            'college_year_graduated',
            'college_transferee_note',
            'is_transferee',
            'grad_masteral_school', 'grad_masteral_year',
            'grad_doctoral_school', 'grad_doctoral_year',
        ];

        $data = [];

        foreach ($fields as $field) {
            $data[$field] = $payload[$field] ?? $profile?->{$field} ?? null;
        }

        return $data;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function subjectEnrollments(GuestApplicationDraft $draft): array
    {
        if ($draft->application?->subjectEnrollments) {
            return $draft->application->subjectEnrollments
                ->map(fn ($subject) => [
                    'id' => $subject->id,
                    'subject_name' => $subject->subject_name,
                    'units' => $subject->units,
                    'order' => $subject->order,
                ])
                ->values()
                ->all();
        }

        $payload = $draft->payload ?? [];
        $subjects = [];

        foreach ($payload['subject_enrollments'] ?? [] as $index => $subject) {
            $subjects[] = [
                'id' => $index + 1,
                'subject_name' => $subject['subject_name'] ?? '',
                'units' => $subject['units'] ?? 0,
                'order' => $index,
            ];
        }

        foreach ($payload['graduate_subjects'] ?? [] as $index => $subject) {
            $subjects[] = [
                'id' => count($subjects) + 1,
                'subject_name' => trim(($subject['subject_code'] ?? '').' - '.($subject['subject_title'] ?? ''), ' -'),
                'units' => $subject['units'] ?? 0,
                'order' => $index,
            ];
        }

        return $subjects;
    }

    private function departmentFromPayload(array $payload): ?Department
    {
        $departmentId = (int) ($payload['department_id'] ?? 0);

        return $departmentId > 0
            ? Department::query()->select(['id', 'name', 'code'])->find($departmentId)
            : null;
    }

    private function courseFromPayload(array $payload): ?Course
    {
        $courseId = (int) ($payload['course_id'] ?? 0);

        return $courseId > 0
            ? Course::query()->select(['id', 'name', 'code', 'department_id'])->find($courseId)
            : null;
    }

    private function applicationUrl(string $role, Application $application): string
    {
        return match ($role) {
            'admin' => route('admin.applications.show', $application, false),
            'coordinator' => route('coordinator.applications.show', $application, false),
            default => route('developer.applications.edit', $application, false),
        };
    }
}
