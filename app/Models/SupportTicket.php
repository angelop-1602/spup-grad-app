<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Str;

class SupportTicket extends Model
{
    /** @use HasFactory<\Database\Factories\SupportTicketFactory> */
    use HasFactory;

    public const STATUS_OPEN = 'open';

    public const STATUS_RESOLVED = 'resolved';

    public const CATEGORIES = [
        'technical',
        'application',
        'account_access',
        'document_upload',
        'other',
    ];

    public const PRIORITIES = [
        'low',
        'normal',
        'high',
        'emergency',
    ];

    protected $fillable = [
        'ticket_number',
        'status',
        'category',
        'priority',
        'subject',
        'description',
        'reporter_guard',
        'reporter_type',
        'reporter_id',
        'reporter_name',
        'reporter_email',
        'page_url',
        'ip_address',
        'user_agent',
        'screenshot_disk',
        'screenshot_path',
        'screenshot_original_name',
        'screenshot_mime',
        'screenshot_size',
        'resolved_by_developer_id',
        'resolved_at',
        'resolution_note',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (SupportTicket $ticket): void {
            if (! $ticket->ticket_number) {
                $ticket->ticket_number = 'HD-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'ticket_number';
    }

    public function reporter(): MorphTo
    {
        return $this->morphTo();
    }

    public function resolvedByDeveloper(): BelongsTo
    {
        return $this->belongsTo(Developer::class, 'resolved_by_developer_id');
    }

    public function hasScreenshot(): bool
    {
        return filled($this->screenshot_disk) && filled($this->screenshot_path);
    }
}
