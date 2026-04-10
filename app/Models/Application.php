<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Application extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_number',
        'user_id',
        'window_id',
        'department_id',
        'course_id',
        'major',
        'degree_title',
        'presence',
        'status',
        'notes',
        'approved_by_coordinator_id',
        'approved_at',
        'subject_code',
        'subject_title',
        'units',
        'thesis_dissertation_title',
        'thesis_dissertation_adviser',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'units' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'application_number';
    }

    protected static function booted(): void
    {
        static::creating(function (Application $application): void {
            if ($application->application_number) {
                return;
            }

            $year = now()->year;

            do {
                $random = Str::upper(Str::random(6));
                $code = "GA_{$year}_{$random}";
            } while (static::where('application_number', $code)->exists());

            $application->application_number = $code;
        });
    }

    /**
     * Get the user that owns the application.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the application window.
     */
    public function window(): BelongsTo
    {
        return $this->belongsTo(ApplicationWindow::class, 'window_id');
    }

    /**
     * Get the coordinator who approved the application.
     */
    public function approvedByCoordinator(): BelongsTo
    {
        return $this->belongsTo(Coordinator::class, 'approved_by_coordinator_id');
    }

    /**
     * Get the department.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the course.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get all subject enrollments for this application.
     */
    public function subjectEnrollments(): HasMany
    {
        return $this->hasMany(SubjectEnrollment::class)->orderBy('order');
    }

    /**
     * Get all requirements for this application.
     */
    public function requirements(): HasMany
    {
        return $this->hasMany(ApplicationRequirement::class)->orderBy('id');
    }

    /**
     * Check if the application can be edited.
     * Students can now edit applications even when the window is not active.
     */
    public function canBeEdited(): bool
    {
        return true; // Allow editing regardless of window status
    }

    /**
     * Check if the application can be deleted by the student.
     *
     * Students may delete their application only while the window is active
     * and before a coordinator has reviewed it.
     */
    public function canBeDeleted(): bool
    {
        // Only allow deletion while the window is still active
        if (! ($this->window?->isCurrentlyActive() ?? false)) {
            return false;
        }

        // If a coordinator has already approved or changed the status,
        // prevent deletion. We treat any status other than "submitted"
        // as already reviewed.
        if ($this->status !== 'submitted') {
            return false;
        }

        return true;
    }

    /**
     * Check if review has started for this application.
     * Review is considered started if:
     * - Any requirement has notes (coordinator/admin has reviewed it)
     * - Any requirement status is not 'pending' (review has started)
     * - Any requirement has been modified (updated_at != created_at)
     */
    public function hasReviewStarted(): bool
    {
        if (! $this->relationLoaded('requirements')) {
            $this->load('requirements');
        }

        return $this->requirements->contains(function ($req) {
            // Review has started if:
            // 1. Any requirement has notes (someone has reviewed it)
            // 2. Any requirement status is not 'pending' (review has started)
            // 3. Any requirement has been modified (updated_at != created_at)
            return ! empty($req->notes)
                || $req->status !== 'pending'
                || $req->updated_at->ne($req->created_at);
        });
    }

    /**
     * Recalculate and update application status based on requirements checklist.
     * Status is always determined by the requirements, not manually set.
     *
     * Priority order:
     * 1. If any requirement is "required" → status = "incomplete"
     * 2. If all top-level requirements are "approved" → status = "approved"
     * 3. If all top-level requirements are "pending" → check if review started
     *    - If review NOT started and current status is "submitted" → keep "submitted"
     *    - If review started OR current status is not "submitted" → status = "pending"
     * 4. Otherwise → status = "pending" (mixed states default to pending)
     */
    public function recalculateStatusBasedOnRequirements(): void
    {
        // Ensure requirements are loaded with children
        if (! $this->relationLoaded('requirements')) {
            $this->load('requirements.children');
        }

        // Only check top-level requirements (those without parent_id)
        $topLevelRequirements = $this->requirements->whereNull('parent_id');

        if ($topLevelRequirements->isEmpty()) {
            // No requirements yet, keep current status or default to pending
            return;
        }

        // Check if all top-level requirements are approved
        // For requirements with children, all children must be approved
        // For requirements without children, the requirement itself must be approved
        $allApproved = $topLevelRequirements->every(function ($req) {
            if ($req->children && $req->children->isNotEmpty()) {
                return $req->children->every(fn ($child) => $child->status === 'approved');
            }

            return $req->status === 'approved';
        });

        // Check if any requirement is marked as required
        // For parent requirements with children, check children only
        // For requirements without children, check the requirement itself
        $hasRequired = $topLevelRequirements->contains(function ($req) {
            if ($req->children && $req->children->isNotEmpty()) {
                return $req->children->contains(fn ($child) => $child->status === 'required');
            }

            return $req->status === 'required';
        });

        // Check if all top-level requirements are pending
        $allPending = $topLevelRequirements->every(function ($req) {
            if ($req->children && $req->children->isNotEmpty()) {
                return $req->children->every(fn ($child) => $child->status === 'pending');
            }

            return $req->status === 'pending';
        });

        // Determine new status based on requirements (always recalculate, regardless of current status)
        $newStatus = null;
        if ($hasRequired) {
            // If any requirement is marked as "required", set application to incomplete
            $newStatus = 'incomplete';
        } elseif ($allApproved) {
            // If all requirements are approved, set application to approved
            $newStatus = 'approved';
        } elseif ($allPending) {
            // If all requirements are still pending:
            // - If review has NOT started and current status is "submitted", keep it as "submitted"
            // - If review has started OR current status is not "submitted", set to "pending"
            $reviewStarted = $this->hasReviewStarted();
            if (! $reviewStarted && $this->status === 'submitted') {
                $newStatus = 'submitted';
            } else {
                $newStatus = 'pending';
            }
        } else {
            // Mixed states (some approved, some pending, but none required)
            // Default to pending to indicate review is in progress
            $newStatus = 'pending';
        }

        // Always update status if it's different (ensures status always reflects requirements)
        // But preserve "submitted" status if all requirements are pending and review hasn't started
        if ($newStatus && $this->status !== $newStatus) {
            $this->update(['status' => $newStatus]);
        }
    }
}
