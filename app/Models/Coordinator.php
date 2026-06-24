<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class Coordinator extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\CoordinatorFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Get the departments assigned to this coordinator.
     */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'coordinator_assignments')
            ->withTimestamps();
    }

    /**
     * Get the courses assigned to this coordinator.
     */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'coordinator_course_assignments')
            ->withTimestamps();
    }

    /**
     * @return array<int, int>
     */
    public function assignedDepartmentIds(): array
    {
        return $this->departments()
            ->pluck('departments.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @return array<int, int>
     */
    public function assignedCourseIds(): array
    {
        $courseIds = $this->courses()
            ->pluck('courses.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($courseIds !== []) {
            return $courseIds;
        }

        $departmentIds = $this->assignedDepartmentIds();

        if ($departmentIds === []) {
            return [];
        }

        return Course::query()
            ->whereIn('department_id', $departmentIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function scopeApplicationsToAssignments(Builder $query): Builder
    {
        $departmentIds = $this->assignedDepartmentIds();

        if ($departmentIds === []) {
            return $query->whereRaw('1 = 0');
        }

        $query->whereIn('department_id', $departmentIds);

        $courseIds = $this->assignedCourseIds();

        if ($courseIds !== []) {
            $query->whereIn('course_id', $courseIds);
        }

        return $query;
    }

    public function scopeDraftsToAssignments(Builder $query): Builder
    {
        $departmentIds = $this->assignedDepartmentIds();

        if ($departmentIds === []) {
            return $query->whereRaw('1 = 0');
        }

        $query->whereIn('payload->department_id', $departmentIds);

        $courseIds = $this->assignedCourseIds();

        if ($courseIds !== []) {
            $query->whereIn('payload->course_id', $courseIds);
        }

        return $query;
    }

    public function canAccessApplication(Application $application): bool
    {
        $departmentId = (int) $application->department_id;
        $courseId = (int) $application->course_id;

        if (! in_array($departmentId, $this->assignedDepartmentIds(), true)) {
            return false;
        }

        $courseIds = $this->assignedCourseIds();

        return $courseIds === [] || in_array($courseId, $courseIds, true);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function canAccessDraftPayload(array $payload): bool
    {
        $departmentId = (int) ($payload['department_id'] ?? 0);
        $courseId = (int) ($payload['course_id'] ?? 0);

        if (! in_array($departmentId, $this->assignedDepartmentIds(), true)) {
            return false;
        }

        $courseIds = $this->assignedCourseIds();

        return $courseIds === [] || in_array($courseId, $courseIds, true);
    }
}
