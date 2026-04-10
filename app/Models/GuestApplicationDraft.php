<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class GuestApplicationDraft extends Model
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'window_id',
        'email',
        'student_id',
        'tracking_code',
        'tracking_pin',
        'payload',
        'verified_at',
        'user_id',
        'application_id',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (GuestApplicationDraft $draft): void {
            if (! $draft->tracking_code) {
                $draft->tracking_code = static::generateTrackingCode($draft->window_id);
            }

            if (! $draft->tracking_pin) {
                $draft->tracking_pin = static::generateTrackingPin();
            }
        });
    }

    public function window(): BelongsTo
    {
        return $this->belongsTo(ApplicationWindow::class, 'window_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function hasBeenVerified(): bool
    {
        return $this->verified_at !== null && $this->application_id !== null;
    }

    public function ensureTrackingCode(): string
    {
        if ($this->tracking_code) {
            return $this->tracking_code;
        }

        $trackingCode = static::generateTrackingCode($this->window_id);

        $this->forceFill(['tracking_code' => $trackingCode])->saveQuietly();

        return $trackingCode;
    }

    public function ensureTrackingPin(): string
    {
        if ($this->tracking_pin) {
            return $this->tracking_pin;
        }

        $trackingPin = static::generateTrackingPin();

        $this->forceFill(['tracking_pin' => $trackingPin])->saveQuietly();

        return $trackingPin;
    }

    public static function normalizeTrackingCode(string $value): string
    {
        $normalized = Str::upper(trim($value));
        $normalized = preg_replace('/[\s_]+/', '-', $normalized) ?? $normalized;
        $normalized = preg_replace('/-+/', '-', $normalized) ?? $normalized;

        return trim($normalized, '-');
    }

    private static function generateTrackingCode(?int $windowId = null): string
    {
        $window = $windowId ? ApplicationWindow::query()->find($windowId) : null;
        $trackingDate = $window?->start_date ?? now();
        $year = $trackingDate->format('Y');
        $month = Str::upper($trackingDate->format('M'));

        do {
            $trackingCode = "TRK-{$year}-{$month}-".Str::upper(Str::random(6));
        } while (static::query()->where('tracking_code', $trackingCode)->exists());

        return $trackingCode;
    }

    private static function generateTrackingPin(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
