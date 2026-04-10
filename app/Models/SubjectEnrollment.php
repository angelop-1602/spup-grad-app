<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubjectEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'application_id',
        'subject_name',
        'units',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'units' => 'integer',
            'order' => 'integer',
        ];
    }

    /**
     * Get the application that owns the subject enrollment.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }
}
