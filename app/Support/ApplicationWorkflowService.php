<?php

namespace App\Support;

use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\GuestApplicationDraft;
use App\Models\User;
use App\Notifications\ApplicationSubmitted;
use App\Notifications\RequirementFileUploaded;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ApplicationWorkflowService
{
    /**
     * @var list<string>
     */
    private const PROFILE_FIELDS = [
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

    /**
     * @return array{0: GuestApplicationDraft, 1: bool}
     */
    public function finalizeGuestDraft(GuestApplicationDraft $draft): array
    {
        return DB::transaction(function () use ($draft) {
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

            $emailUser = User::query()
                ->whereRaw('lower(email) = ?', [$lockedDraft->email])
                ->lockForUpdate()
                ->first();

            $studentUser = User::query()
                ->where('student_id', $lockedDraft->student_id)
                ->lockForUpdate()
                ->first();

            if ($emailUser && $emailUser->student_id && strcasecmp((string) $emailUser->student_id, $lockedDraft->student_id) !== 0) {
                abort(409, 'This email is already associated with a different student ID.');
            }

            $applicationForEmail = $emailUser
                ? $emailUser->applications()->where('window_id', $lockedDraft->window_id)->first()
                : null;

            if ($applicationForEmail && strcasecmp((string) $emailUser->student_id, $lockedDraft->student_id) !== 0) {
                abort(409, 'This email already has an application for the current graduation window.');
            }

            $applicationForStudentId = $studentUser
                ? $studentUser->applications()->where('window_id', $lockedDraft->window_id)->first()
                : null;

            if ($applicationForStudentId && strcasecmp((string) $studentUser->email, $lockedDraft->email) !== 0) {
                abort(409, 'This student ID already has an application for the current graduation window.');
            }

            if ($emailUser && $studentUser && $emailUser->id !== $studentUser->id) {
                abort(409, 'This email is already associated with a different student ID.');
            }

            $user = $studentUser ?: $emailUser;

            if (! $user) {
                $user = User::create([
                    'student_id' => $lockedDraft->student_id,
                    'name' => $this->buildUserName($payload, $lockedDraft->student_id),
                    'email' => $lockedDraft->email,
                    'password' => bin2hex(random_bytes(16)),
                    'email_verified_at' => now(),
                ]);
            } else {
                $updates = [
                    'name' => $this->buildUserName($payload, $user->name ?: $lockedDraft->student_id),
                ];

                if (! $user->student_id) {
                    $updates['student_id'] = $lockedDraft->student_id;
                }

                if (strcasecmp($user->email, $lockedDraft->email) !== 0) {
                    $updates['email'] = $lockedDraft->email;
                }

                if (! $user->email_verified_at) {
                    $updates['email_verified_at'] = now();
                }

                $user->forceFill($updates)->save();
            }

            $this->syncProfileForUser($user, $payload);

            $application = $lockedDraft->application_id
                ? Application::find($lockedDraft->application_id)
                : $user->applications()->where('window_id', $lockedDraft->window_id)->first();

            if (! $application) {
                $application = $this->createApplicationForUser($user, $payload);
            } else {
                $this->updateApplicationForUser($application, $payload);
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

    public function createApplicationForUser(User $user, array $applicationData, ?UploadedFile $photo = null): Application
    {
        $this->syncUserIdentity($user, $applicationData);

        $application = $user->applications()->create($this->extractApplicationAttributes($applicationData));

        $this->syncSubjectEnrollments($application, $applicationData, false);
        $this->initializeRequirements($application);
        $this->syncProfileForUser($user, $applicationData, $photo);
        $this->notifyApplicationSubmitted($application);

        return $application;
    }

    public function updateApplicationForUser(Application $application, array $applicationData, ?UploadedFile $photo = null): Application
    {
        $this->syncUserIdentity($application->user, $applicationData);

        $application->update($this->extractApplicationAttributes($applicationData));
        $this->syncSubjectEnrollments($application, $applicationData, true);
        $this->syncProfileForUser($application->user, $applicationData, $photo);

        return $application;
    }

    /**
     * @return array<string, mixed>
     */
    public function profileData(array $applicationData): array
    {
        return Arr::only($applicationData, self::PROFILE_FIELDS);
    }

    public function syncProfileForUser(User $user, array $applicationData, ?UploadedFile $photo = null): void
    {
        $profileData = $this->profileData($applicationData);
        $existingPhotoPath = $user->profile?->photo_path;

        if ($photo) {
            $profileData['photo_path'] = $this->storeProfilePhoto(
                $photo,
                $applicationData,
                (string) ($user->student_id ?? 'unknown'),
                $existingPhotoPath,
            );
        }

        if ($profileData === []) {
            return;
        }

        $user->profile()->updateOrCreate([], $profileData);
    }

    public function storeProfilePhoto(
        UploadedFile $file,
        array $applicationData,
        string $studentId,
        ?string $currentPhotoPath = null,
    ): string {
        $normalizedCurrentPhotoPath = ProfilePhoto::storagePath($currentPhotoPath);

        if ($normalizedCurrentPhotoPath && Storage::disk('public')->exists($normalizedCurrentPhotoPath)) {
            Storage::disk('public')->delete($normalizedCurrentPhotoPath);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');
        $sanitizedName = Str::slug($this->buildUserName($applicationData, $studentId)) ?: 'student';
        $safeStudentId = Str::of($studentId)->trim()->replace(' ', '-')->toString() ?: 'unknown';
        $filename = $sanitizedName.'_'.$safeStudentId.'.'.$extension;

        return $file->storeAs('profile-photos', $filename, 'public');
    }

    public function ensureRequirements(Application $application): void
    {
        if (! $application->relationLoaded('requirements')) {
            $application->load('requirements.children');
        }

        if ($application->requirements->isEmpty()) {
            $this->initializeRequirements($application);
            $application->load('requirements.children');
        }
    }

    public function storeRequirementFile(Application $application, ApplicationRequirement $requirement, UploadedFile $file): ApplicationRequirement
    {
        if ($requirement->file_path && Storage::disk('public')->exists($requirement->file_path)) {
            Storage::disk('public')->delete($requirement->file_path);
        }

        $filePath = $file->store('requirement-files', 'public');

        $updateData = ['file_path' => $filePath];
        if ($requirement->status === 'required') {
            $updateData['status'] = 'pending';
        }

        $requirement->update($updateData);

        $this->syncIdPictureToProfilePhoto($application, $requirement, $file, $filePath);

        $application->load(['requirements.children']);

        if ($requirement->parent_id) {
            $this->updateParentRequirementStatus($application);
        }

        if ($application->status === 'incomplete') {
            $hasRequired = $application->requirements->contains(fn ($req) => $req->status === 'required');
            if (! $hasRequired) {
                $application->update(['status' => 'pending']);
            }
        }

        return $requirement->fresh();
    }

    public function notifyRequirementUploaded(Application $application, ApplicationRequirement $requirement): void
    {
        $application->load([
            'user.profile',
            'department.coordinators',
            'course',
            'requirements.children',
        ]);

        $studentName = $application->user->profile
            ? trim($application->user->profile->first_name.' '.($application->user->profile->middle_name ? $application->user->profile->middle_name.' ' : '').$application->user->profile->last_name.($application->user->profile->suffix ? ' '.$application->user->profile->suffix : ''))
            : $application->user->name;

        $notification = new RequirementFileUploaded($application, $requirement, $studentName);

        $coordinators = $application->department->coordinators;
        if ($coordinators->isNotEmpty()) {
            Notification::send($coordinators, $notification);
        }

        $admins = \App\Models\Admin::all();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, $notification);
        }
    }

    public function notifyApplicationSubmitted(Application $application): void
    {
        $application->load([
            'user.profile',
            'department.coordinators',
            'course',
        ]);

        $studentName = $application->user?->profile
            ? trim($application->user->profile->first_name.' '.($application->user->profile->middle_name ? $application->user->profile->middle_name.' ' : '').$application->user->profile->last_name.($application->user->profile->suffix ? ' '.$application->user->profile->suffix : ''))
            : ($application->user?->name ?? 'Unknown Student');

        $notification = new ApplicationSubmitted($application, $studentName);

        $coordinators = $application->department?->coordinators ?? collect();
        if ($coordinators->isNotEmpty()) {
            Notification::send($coordinators, $notification);
        }

        $admins = \App\Models\Admin::all();
        if ($admins->isNotEmpty()) {
            Notification::send($admins, $notification);
        }
    }

    public function buildUserName(array $applicationData, string $fallback = 'Guest Applicant'): string
    {
        $parts = array_filter([
            $applicationData['first_name'] ?? null,
            $applicationData['middle_name'] ?? null,
            $applicationData['last_name'] ?? null,
            $applicationData['suffix'] ?? null,
        ]);

        return trim(implode(' ', $parts)) ?: $fallback;
    }

    /**
     * @return array<string, mixed>
     */
    private function extractApplicationAttributes(array $applicationData): array
    {
        $attributes = Arr::except($applicationData, ['email', 'student_id', 'photo', 'graduate_subjects', 'subject_enrollments']);
        $graduateSubjects = $applicationData['graduate_subjects'] ?? [];

        if (! empty($graduateSubjects)) {
            $firstSubject = $graduateSubjects[0];
            $attributes['subject_code'] = $firstSubject['subject_code'] ?? null;
            $attributes['subject_title'] = $firstSubject['subject_title'] ?? null;
            $attributes['units'] = $firstSubject['units'] ?? null;
        } elseif (array_key_exists('graduate_subjects', $applicationData)) {
            $attributes['subject_code'] = null;
            $attributes['subject_title'] = null;
            $attributes['units'] = null;
        }

        return $attributes;
    }

    private function syncUserIdentity(User $user, array $applicationData): void
    {
        $updates = [];

        if (array_key_exists('student_id', $applicationData)) {
            $studentId = trim((string) $applicationData['student_id']);
            if ($studentId !== '' && strcasecmp((string) $user->student_id, $studentId) !== 0) {
                $updates['student_id'] = $studentId;
            }
        }

        $name = $this->buildUserName($applicationData, (string) ($user->name ?: $user->student_id ?: 'Student'));
        if ($name !== '' && $name !== $user->name) {
            $updates['name'] = $name;
        }

        if ($updates !== []) {
            $user->forceFill($updates)->save();
        }
    }

    private function syncIdPictureToProfilePhoto(
        Application $application,
        ApplicationRequirement $requirement,
        UploadedFile $file,
        string $filePath,
    ): void {
        if ($requirement->requirement_key !== 'id_picture') {
            return;
        }

        if (! Str::startsWith((string) $file->getMimeType(), 'image/')) {
            return;
        }

        $application->loadMissing('user.profile');

        if (! $application->user) {
            return;
        }

        $application->user->profile()->updateOrCreate([], [
            'photo_path' => $filePath,
        ]);
    }

    private function syncSubjectEnrollments(Application $application, array $applicationData, bool $replaceExisting): void
    {
        if ($replaceExisting) {
            $application->subjectEnrollments()->delete();
        }

        foreach ($applicationData['subject_enrollments'] ?? [] as $index => $enrollment) {
            $application->subjectEnrollments()->create([
                'subject_name' => $enrollment['subject_name'],
                'units' => $enrollment['units'],
                'order' => $index,
            ]);
        }

        foreach ($applicationData['graduate_subjects'] ?? [] as $index => $subject) {
            $application->subjectEnrollments()->create([
                'subject_name' => ($subject['subject_code'] ?? '').' - '.($subject['subject_title'] ?? ''),
                'units' => $subject['units'] ?? 0,
                'order' => $index,
            ]);
        }
    }

    private function initializeRequirements(Application $application): void
    {
        if ($application->requirements()->exists()) {
            return;
        }

        $entryParent = $application->requirements()->create([
            'requirement_key' => 'entry_requirements',
            'requirement_label' => 'Entry Requirements',
            'status' => 'pending',
            'parent_id' => null,
        ]);

        $entryChildren = [
            [
                'requirement_key' => 'tor',
                'requirement_label' => 'Transcript of Records (TOR)',
                'status' => 'pending',
                'parent_id' => $entryParent->id,
            ],
            [
                'requirement_key' => 'form_137',
                'requirement_label' => 'Form 137',
                'status' => 'pending',
                'parent_id' => $entryParent->id,
            ],
            [
                'requirement_key' => 'psa_birth_certificate',
                'requirement_label' => 'PSA Birth Certificate',
                'status' => 'pending',
                'parent_id' => $entryParent->id,
            ],
            [
                'requirement_key' => 'marriage_certificate',
                'requirement_label' => 'Marriage Certificate (if applicable)',
                'status' => 'pending',
                'parent_id' => $entryParent->id,
            ],
        ];

        foreach ($entryChildren as $child) {
            $application->requirements()->create($child);
        }

        $otherRequirements = [
            [
                'requirement_key' => 'complete_grades',
                'requirement_label' => 'Complete Grades',
            ],
            [
                'requirement_key' => 'hardbound_copies',
                'requirement_label' => 'Hardbound Copies of Theses/Dissertation Books with CDs',
            ],
            [
                'requirement_key' => 'id_picture',
                'requirement_label' => '2x2 ID Picture with white background and nametag',
            ],
            [
                'requirement_key' => 'reviewer_certification',
                'requirement_label' => 'Dissertation/Thesis Reviewer\'s Certification signed by the In-Charge of Language Editing of Thesis/Dissertation Papers',
            ],
            [
                'requirement_key' => 'journal_publication',
                'requirement_label' => 'Certificate of Journal Publication signed by the CPRINT Director',
            ],
        ];

        foreach ($otherRequirements as $requirement) {
            $application->requirements()->create([
                ...$requirement,
                'status' => 'pending',
                'parent_id' => null,
            ]);
        }
    }

    private function updateParentRequirementStatus(Application $application): void
    {
        $entryRequirement = $application->requirements()
            ->where('requirement_key', 'entry_requirements')
            ->whereNull('parent_id')
            ->first();

        if (! $entryRequirement) {
            return;
        }

        $children = $entryRequirement->children;
        if ($children->isEmpty()) {
            return;
        }

        $allApproved = $children->every(fn ($child) => $child->status === 'approved');
        $hasRequired = $children->contains(fn ($child) => $child->status === 'required');
        $allPending = $children->every(fn ($child) => $child->status === 'pending');

        if ($allApproved) {
            $entryRequirement->update(['status' => 'approved']);
        } elseif ($hasRequired) {
            $entryRequirement->update(['status' => 'required']);
        } elseif ($allPending) {
            $entryRequirement->update(['status' => 'pending']);
        }
    }
}
