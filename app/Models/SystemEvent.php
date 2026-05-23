<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SystemEvent extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'module',
        'action',
        'status',
        'severity',
        'actor_guard',
        'actor_type',
        'actor_id',
        'actor_label',
        'subject_type',
        'subject_id',
        'message',
        'ip_address',
        'user_agent',
        'meta',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
