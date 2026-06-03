<?php

namespace App\Support;

use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DuplicateApplicationRecords
{
    /**
     * @var array<int, Department|null>
     */
    private array $departmentsById = [];

    /**
     * @var array<int, Course|null>
     */
    private array $coursesById = [];

    /**
     * @param  array<int, int>|null  $departmentIds
     * @return array<int, array<string, mixed>>
     */
    public function verifiedApplicationsForWindow(ApplicationWindow $window, ?array $departmentIds = null): array
    {
        return Application::query()
            ->with($this->applicationRelations())
            ->where('window_id', $window->getKey())
            ->when($departmentIds !== null, fn (Builder $query) => $query->whereIn('department_id', $departmentIds))
            ->latest('created_at')
            ->get()
            ->map(fn (Application $application) => $this->publicPayload($this->applicationRecord($application), true))
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int>|null  $departmentIds
     * @return array<int, array<string, mixed>>
     */
    public function unverifiedDraftsForWindow(ApplicationWindow $window, ?array $departmentIds = null): array
    {
        return $this->unfinalizedDraftsQuery($window, $departmentIds)
            ->latest('created_at')
            ->get()
            ->map(fn (GuestApplicationDraft $draft) => $this->publicPayload($this->draftRecord($draft), true))
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int>|null  $departmentIds
     * @return array<int, array<string, mixed>>
     */
    public function duplicatePairsForWindow(ApplicationWindow $window, ?array $departmentIds = null): array
    {
        $seenPairs = [];

        return $this->recordsGroupedByMatchKey($this->duplicateRecordsForWindow($window, $departmentIds))
            ->filter(fn (Collection $group) => $group->count() > 1)
            ->flatMap(function (Collection $group, string $matchKey) use (&$seenPairs): array {
                $records = $group->values();
                $pairs = [];

                for ($leftIndex = 0; $leftIndex < $records->count(); $leftIndex++) {
                    for ($rightIndex = $leftIndex + 1; $rightIndex < $records->count(); $rightIndex++) {
                        $left = $records->get($leftIndex);
                        $right = $records->get($rightIndex);
                        $pairKey = collect([$left['key'], $right['key']])
                            ->sort()
                            ->implode('__');

                        if (isset($seenPairs[$pairKey])) {
                            continue;
                        }

                        $seenPairs[$pairKey] = true;

                        $pairs[] = [
                            'id' => $left['key'].'__'.$right['key'],
                            'left' => $this->publicPayload($left, true),
                            'right' => $this->publicPayload($right, true),
                            'match' => $this->matchPayload($left, $right, $matchKey),
                        ];
                    }
                }

                return $pairs;
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function resolve(string $key): ?array
    {
        if (preg_match('/^(application|draft)-(\d+)$/', $key, $matches) !== 1) {
            return null;
        }

        $id = (int) $matches[2];

        if ($matches[1] === 'application') {
            $application = Application::query()
                ->with($this->applicationRelations())
                ->find($id);

            return $application ? $this->applicationRecord($application) : null;
        }

        $draft = GuestApplicationDraft::query()
            ->with($this->draftRelations())
            ->find($id);

        return $draft ? $this->draftRecord($draft) : null;
    }

    /**
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     */
    public function recordsMatch(array $left, array $right): bool
    {
        return count(array_intersect($this->matchKeys($left), $this->matchKeys($right))) > 0;
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    public function publicPayload(array $record, bool $includeDeveloperLinks = false): array
    {
        $payload = [
            'key' => $record['key'],
            'type' => $record['type'],
            'id' => $record['id'],
            'record_label' => $record['record_label'],
            'applicant_name' => $record['applicant_name'],
            'first_name' => $record['first_name'],
            'last_name' => $record['last_name'],
            'student_id' => $record['student_id'],
            'email' => $record['email'],
            'window_id' => $record['window_id'],
            'window_title' => $record['window_title'],
            'department_id' => $record['department_id'],
            'department_code' => $record['department_code'],
            'department_name' => $record['department_name'],
            'course_code' => $record['course_code'],
            'course_name' => $record['course_name'],
            'status' => $record['status'],
            'application_number' => $record['application_number'],
            'tracking_code' => $record['tracking_code'],
            'tracking_pin' => $record['tracking_pin'],
            'verification_status' => $record['verification_status'],
            'created_at' => $record['created_at'],
            'verified_at' => $record['verified_at'],
        ];

        if ($includeDeveloperLinks) {
            $payload['developer_url'] = $record['developer_url'];
        }

        return $payload;
    }

    /**
     * @param  array<int, array<string, mixed>>  $records
     * @return Collection<int, object>
     */
    public function notifiablesForRecords(array $records): Collection
    {
        return collect($records)
            ->map(function (array $record): ?object {
                $model = $record['model'] ?? null;

                if ($model instanceof Application) {
                    $model->loadMissing('user');

                    return $model->user;
                }

                if ($model instanceof GuestApplicationDraft) {
                    return $model;
                }

                return null;
            })
            ->filter(fn (?object $notifiable) => $notifiable && $this->notifiableEmail($notifiable) !== null)
            ->unique(fn (object $notifiable) => Str::lower((string) $this->notifiableEmail($notifiable)))
            ->values();
    }

    /**
     * @param  array<string, mixed>  $record
     */
    public function deleteRecord(array $record): void
    {
        $model = $record['model'] ?? null;

        if ($model instanceof Model && $model->exists) {
            $model->delete();
        }
    }

    /**
     * @param  array<int, int>|null  $departmentIds
     * @return Collection<int, array<string, mixed>>
     */
    private function duplicateRecordsForWindow(ApplicationWindow $window, ?array $departmentIds = null): Collection
    {
        $applications = Application::query()
            ->with($this->applicationRelations())
            ->where('window_id', $window->getKey())
            ->when($departmentIds !== null, fn (Builder $query) => $query->whereIn('department_id', $departmentIds))
            ->latest('created_at')
            ->get()
            ->map(fn (Application $application) => $this->applicationRecord($application));

        $drafts = $this->unfinalizedDraftsQuery($window, $departmentIds)
            ->latest('created_at')
            ->get()
            ->map(fn (GuestApplicationDraft $draft) => $this->draftRecord($draft));

        return $applications->concat($drafts)->values();
    }

    /**
     * @param  array<int, int>|null  $departmentIds
     */
    private function unfinalizedDraftsQuery(ApplicationWindow $window, ?array $departmentIds = null): Builder
    {
        return GuestApplicationDraft::query()
            ->with($this->draftRelations())
            ->where('window_id', $window->getKey())
            ->when($departmentIds !== null, fn (Builder $query) => $query->whereIn('payload->department_id', $departmentIds))
            ->where(function ($query): void {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            });
    }

    /**
     * @return array<int, string>
     */
    private function applicationRelations(): array
    {
        return [
            'user:id,name,email,student_id',
            'user.profile:id,user_id,first_name,middle_name,last_name,suffix,date_of_birth',
            'window:id,title',
            'department:id,name,code',
            'course:id,name,code,department_id',
        ];
    }

    /**
     * @return array<int, string>
     */
    private function draftRelations(): array
    {
        return [
            'window:id,title',
            'application:id,application_number,user_id,window_id,department_id,course_id,status,created_at',
            'application.user:id,name,email,student_id',
            'application.user.profile:id,user_id,first_name,middle_name,last_name,suffix,date_of_birth',
            'application.department:id,name,code',
            'application.course:id,name,code,department_id',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function applicationRecord(Application $application): array
    {
        $application->loadMissing($this->applicationRelations());

        $profile = $application->user?->profile;
        $firstName = trim((string) ($profile?->first_name ?? ''));
        $lastName = trim((string) ($profile?->last_name ?? ''));
        $dateOfBirth = $this->normalizeDate($profile?->date_of_birth);

        return [
            'key' => 'application-'.$application->getKey(),
            'type' => 'application',
            'id' => $application->getKey(),
            'user_id' => $application->user_id,
            'model' => $application,
            'record_label' => $application->application_number,
            'applicant_name' => $this->applicationApplicantName($application),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'student_id' => $application->user?->student_id,
            'email' => $application->user?->email,
            'window_id' => $application->window_id,
            'window_title' => $application->window?->title ?? 'Unavailable',
            'department_id' => $application->department_id,
            'department_code' => $application->department?->code,
            'department_name' => $application->department?->name,
            'course_code' => $application->course?->code,
            'course_name' => $application->course?->name,
            'status' => $application->status,
            'application_number' => $application->application_number,
            'tracking_code' => null,
            'tracking_pin' => null,
            'verification_status' => 'verified',
            'created_at' => $application->created_at?->toIso8601String(),
            'verified_at' => $application->created_at?->toIso8601String(),
            'normalized' => [
                'user_id' => $this->normalizeNumericId($application->user_id),
                'first_name' => $this->normalizeName($firstName),
                'last_name' => $this->normalizeName($lastName),
                'student_id' => $this->normalizeStudentId($application->user?->student_id),
                'email' => $this->normalizeEmail($application->user?->email),
                'date_of_birth' => $dateOfBirth,
            ],
            'developer_url' => route('developer.applications.edit', $application, false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function draftRecord(GuestApplicationDraft $draft): array
    {
        $draft->loadMissing($this->draftRelations());

        $payload = $draft->payload ?? [];
        $firstName = trim((string) ($payload['first_name'] ?? ''));
        $lastName = trim((string) ($payload['last_name'] ?? ''));
        $dateOfBirth = $this->normalizeDate($payload['date_of_birth'] ?? null);
        $departmentId = (int) ($payload['department_id'] ?? 0);
        $courseId = (int) ($payload['course_id'] ?? 0);
        $department = $draft->application?->department ?? $this->departmentFromPayload($departmentId);
        $course = $draft->application?->course ?? $this->courseFromPayload($courseId);

        return [
            'key' => 'draft-'.$draft->getKey(),
            'type' => 'draft',
            'id' => $draft->getKey(),
            'user_id' => $draft->application?->user_id,
            'model' => $draft,
            'record_label' => $draft->ensureTrackingCode(),
            'applicant_name' => $this->draftApplicantName($payload),
            'first_name' => $firstName,
            'last_name' => $lastName,
            'student_id' => $draft->student_id,
            'email' => $draft->email,
            'window_id' => $draft->window_id,
            'window_title' => $draft->window?->title ?? 'Unavailable',
            'department_id' => $department?->id ?: ($departmentId ?: null),
            'department_code' => $department?->code,
            'department_name' => $department?->name,
            'course_code' => $course?->code,
            'course_name' => $course?->name,
            'status' => $this->draftVerificationStatus($draft),
            'application_number' => $draft->application?->application_number,
            'tracking_code' => $draft->ensureTrackingCode(),
            'tracking_pin' => $draft->ensureTrackingPin(),
            'verification_status' => $this->draftVerificationStatus($draft),
            'created_at' => $draft->created_at?->toIso8601String(),
            'verified_at' => $draft->verified_at?->toIso8601String(),
            'normalized' => [
                'user_id' => $this->normalizeNumericId($draft->application?->user_id),
                'first_name' => $this->normalizeName($firstName),
                'last_name' => $this->normalizeName($lastName),
                'student_id' => $this->normalizeStudentId($draft->student_id),
                'email' => $this->normalizeEmail($draft->email),
                'date_of_birth' => $dateOfBirth,
            ],
            'developer_url' => route('developer.manual-verification', ['search' => $draft->ensureTrackingCode(), 'window_id' => $draft->window_id], false),
        ];
    }

    private function departmentFromPayload(int $departmentId): ?Department
    {
        if ($departmentId <= 0) {
            return null;
        }

        if (! array_key_exists($departmentId, $this->departmentsById)) {
            $this->departmentsById[$departmentId] = Department::query()
                ->select(['id', 'name', 'code'])
                ->find($departmentId);
        }

        return $this->departmentsById[$departmentId];
    }

    private function courseFromPayload(int $courseId): ?Course
    {
        if ($courseId <= 0) {
            return null;
        }

        if (! array_key_exists($courseId, $this->coursesById)) {
            $this->coursesById[$courseId] = Course::query()
                ->select(['id', 'name', 'code', 'department_id'])
                ->find($courseId);
        }

        return $this->coursesById[$courseId];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $records
     * @return Collection<string, Collection<int, array<string, mixed>>>
     */
    private function recordsGroupedByMatchKey(Collection $records): Collection
    {
        return $records
            ->flatMap(function (array $record): array {
                return collect($this->matchKeys($record))
                    ->map(fn (string $matchKey) => [
                        'match_key' => $matchKey,
                        'record' => $record,
                    ])
                    ->all();
            })
            ->groupBy('match_key')
            ->map(fn (Collection $group) => $group->pluck('record')->unique('key')->values());
    }

    /**
     * @param  array<string, mixed>  $record
     * @return array<int, string>
     */
    private function matchKeys(array $record): array
    {
        $normalized = $record['normalized'] ?? [];
        $firstName = $normalized['first_name'] ?? '';
        $lastName = $normalized['last_name'] ?? '';
        $studentId = $normalized['student_id'] ?? '';
        $email = $normalized['email'] ?? '';
        $dateOfBirth = $normalized['date_of_birth'] ?? '';
        $userId = $normalized['user_id'] ?? '';
        $keys = [];

        if ($userId !== '') {
            $keys[] = 'user:'.$userId;
        }

        if ($studentId !== '') {
            $keys[] = 'student_id:'.$studentId;
        }

        if ($email !== '') {
            $keys[] = 'email:'.$email;
        }

        if ($firstName !== '' && $lastName !== '' && $dateOfBirth !== '') {
            $keys[] = implode(':', ['name_dob', $firstName, $lastName, $dateOfBirth]);
        }

        return array_values(array_unique($keys));
    }

    /**
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     * @return array<string, string|null>
     */
    private function matchPayload(array $left, array $right, string $matchKey): array
    {
        return [
            'matched_on' => $this->matchLabel($matchKey),
            'first_name' => $left['first_name'] ?: $right['first_name'],
            'last_name' => $left['last_name'] ?: $right['last_name'],
            'student_id' => $left['student_id'] ?: $right['student_id'],
            'email' => $left['email'] ?: $right['email'],
        ];
    }

    private function matchLabel(string $matchKey): string
    {
        return match (Str::before($matchKey, ':')) {
            'user' => 'Applicant account',
            'student_id' => 'Student ID',
            'email' => 'Email address',
            'name_dob' => 'Name and birth date',
            default => 'Identity details',
        };
    }

    private function normalizeName(?string $value): string
    {
        return Str::of((string) $value)
            ->squish()
            ->lower()
            ->toString();
    }

    private function normalizeStudentId(?string $value): string
    {
        return $this->normalizeIdentityValue($value);
    }

    private function normalizeEmail(?string $value): string
    {
        $email = $this->normalizeIdentityValue($value);

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
    }

    private function normalizeNumericId(int|string|null $value): string
    {
        $id = (int) $value;

        return $id > 0 ? (string) $id : '';
    }

    private function normalizeDate(mixed $value): string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        $date = trim((string) $value);

        if ($date === '') {
            return '';
        }

        $timestamp = strtotime($date);

        return $timestamp ? date('Y-m-d', $timestamp) : '';
    }

    private function normalizeIdentityValue(?string $value): string
    {
        $normalized = Str::of((string) $value)
            ->squish()
            ->lower()
            ->toString();

        return in_array($normalized, ['n/a', 'na', 'none', 'null', 'not applicable', '-', '--'], true)
            ? ''
            : $normalized;
    }

    private function notifiableEmail(object $notifiable): ?string
    {
        $email = $notifiable->email ?? null;

        return $email ? (string) $email : null;
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
        if ($draft->hasBeenVerified()) {
            return 'verified';
        }

        if ($draft->verified_at && ! $draft->application_id) {
            return 'needs_application';
        }

        return 'pending';
    }
}
