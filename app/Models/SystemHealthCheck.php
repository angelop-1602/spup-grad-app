<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemHealthCheck extends Model
{
    protected $fillable = [
        'name',
        'status',
        'message',
        'meta',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'checked_at' => 'datetime',
        ];
    }

    public static function record(string $name, string $status, ?string $message = null, array $meta = []): self
    {
        return static::query()->updateOrCreate(
            ['name' => $name],
            [
                'status' => $status,
                'message' => $message,
                'meta' => $meta,
                'checked_at' => now(),
            ],
        );
    }
}
