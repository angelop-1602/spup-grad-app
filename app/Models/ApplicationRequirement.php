<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationRequirement extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'requirement_key',
        'requirement_label',
        'status',
        'notes',
        'file_path',
        'parent_id',
        'approved_by_coordinator_id',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * Get the application that owns this requirement.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    /**
     * Get the parent requirement.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ApplicationRequirement::class, 'parent_id');
    }

    /**
     * Get the child requirements.
     */
    public function children()
    {
        return $this->hasMany(ApplicationRequirement::class, 'parent_id');
    }

    /**
     * Get the coordinator who approved this requirement.
     */
    public function approvedByCoordinator(): BelongsTo
    {
        return $this->belongsTo(Coordinator::class, 'approved_by_coordinator_id');
    }
}
