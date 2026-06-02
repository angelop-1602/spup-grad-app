<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApplicationWindow extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime',
            'end_date' => 'datetime',
        ];
    }

    /**
     * Get all applications for this window.
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class, 'window_id');
    }

    /**
     * Check if the window is currently active.
     */
    public function isCurrentlyActive(): bool
    {
        $now = now();

        // Check if current time is after or equal to start date
        // and before or equal to end date (inclusive of the entire end date)
        $endDate = $this->end_date->copy()->endOfDay();

        return $now->gte($this->start_date)
            && $now->lte($endDate);
    }

    /**
     * Get the status of the window.
     */
    public function getStatusAttribute(): string
    {
        $now = now();
        $endDate = $this->end_date->copy()->endOfDay();

        if ($now->lt($this->start_date)) {
            return 'upcoming';
        } elseif ($now->gt($endDate)) {
            return 'ended';
        } else {
            return 'active';
        }
    }

    /**
     * Scope a query to only include active windows.
     */
    public function scopeActive($query)
    {
        $now = now();
        $startOfToday = $now->copy()->startOfDay();

        // Window is active if:
        // - start_date <= now (window has started)
        // - end_date >= start of today (window hasn't ended, inclusive of entire end date)
        return $query->where('start_date', '<=', $now)
            ->where('end_date', '>=', $startOfToday);
    }

    /**
     * Order windows with the current window first, then upcoming, then ended.
     */
    public function scopeOrderedForSelection($query)
    {
        $now = now()->toDateTimeString();

        return $query
            ->orderByRaw(
                'CASE WHEN start_date <= ? AND end_date >= ? THEN 0 WHEN start_date > ? THEN 1 ELSE 2 END',
                [$now, $now, $now]
            )
            ->orderByDesc('start_date')
            ->orderByDesc('id');
    }

    /**
     * Get the current active window.
     */
    public static function current(): ?self
    {
        return static::active()
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Get the current active window, or the latest known window when none is active.
     */
    public static function currentOrLatest(): ?self
    {
        return static::current()
            ?? static::query()
                ->orderByDesc('start_date')
                ->orderByDesc('id')
                ->first();
    }
}
