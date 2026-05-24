<?php

namespace App\Support;

use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\SystemEvent;
use App\Models\SystemHealthCheck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DeveloperDiagnosticsService
{
    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function dashboardData(array $filters): array
    {
        return [
            'healthCards' => $this->healthCards(),
            'applicationMetrics' => $this->applicationMetrics(),
            'eventFilters' => $this->filterOptions(),
            'events' => $this->eventsQuery($filters)->paginate(25)->withQueryString(),
            'recentLogLines' => $this->recentLogLines(),
            'filters' => $filters,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function eventsForExport(array $filters): Builder
    {
        return $this->eventsQuery($filters)->limit(5000);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function healthCards(): array
    {
        $cards = [
            [
                'label' => 'Application',
                'status' => 'ok',
                'value' => 'Online',
                'message' => config('app.name'),
            ],
            [
                'label' => 'Version',
                'status' => 'ok',
                'value' => (string) config('app.version'),
                'message' => app()->version().' / PHP '.PHP_VERSION,
            ],
            [
                'label' => 'Environment',
                'status' => app()->environment('production') ? 'ok' : 'warning',
                'value' => app()->environment(),
                'message' => config('app.debug') ? 'Debug mode is enabled' : 'Debug mode is disabled',
            ],
            $this->databaseCard(),
            $this->storageCard(),
            $this->diskCard(),
            $this->mailCard(),
            $this->failedJobsCard(),
            $this->healthCheckCard('scheduler_heartbeat', 'Scheduler'),
            $this->healthCheckCard('queue_worker_heartbeat', 'Queue Worker'),
            $this->healthCheckCard('pdf_conversion', 'PDF Conversion'),
            $this->healthCheckCard('freeconvert', 'FreeConvert API'),
            $this->healthCheckCard('gotenberg', 'Gotenberg API'),
            [
                'label' => 'Recent Errors',
                'status' => SystemEvent::query()->whereIn('severity', ['error', 'critical'])->where('created_at', '>=', now()->startOfDay())->exists() ? 'warning' : 'ok',
                'value' => (string) SystemEvent::query()->whereIn('severity', ['error', 'critical'])->where('created_at', '>=', now()->startOfDay())->count(),
                'message' => 'Errors and critical events today',
            ],
        ];

        return $cards;
    }

    /**
     * @return array<string, mixed>
     */
    public function applicationMetrics(): array
    {
        $today = now()->startOfDay();
        $approved = Application::query()
            ->whereNotNull('approved_at')
            ->get(['created_at', 'approved_at']);

        $averageSeconds = $approved->avg(fn (Application $application) => $application->approved_at->diffInSeconds($application->created_at));
        $missing = ApplicationRequirement::query()
            ->select('requirement_label', DB::raw('count(*) as total'))
            ->where('status', 'required')
            ->groupBy('requirement_label')
            ->orderByDesc('total')
            ->first();

        return [
            'totalApplications' => Application::count(),
            'submittedApplications' => Application::where('status', 'submitted')->count(),
            'pendingApplications' => Application::where('status', 'pending')->count(),
            'incompleteApplications' => Application::where('status', 'incomplete')->count(),
            'approvedApplications' => Application::where('status', 'approved')->count(),
            'rejectedApplications' => Application::where('status', 'rejected')->count(),
            'applicationsToday' => Application::where('created_at', '>=', $today)->count(),
            'documentsUploadedToday' => ApplicationRequirement::whereNotNull('file_path')->where('updated_at', '>=', $today)->count(),
            'mostCommonMissingRequirement' => $missing?->requirement_label ?? 'None',
            'averageProcessingTime' => $averageSeconds ? $this->formatDuration((int) $averageSeconds) : 'Not enough data',
        ];
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function filterOptions(): array
    {
        return [
            'modules' => SystemEvent::query()->distinct()->orderBy('module')->pluck('module')->filter()->values()->all(),
            'actions' => SystemEvent::query()->distinct()->orderBy('action')->pluck('action')->filter()->values()->all(),
            'severities' => ['info', 'warning', 'error', 'critical'],
            'statuses' => ['success', 'failed', 'warning'],
            'actors' => SystemEvent::query()->distinct()->orderBy('actor_guard')->pluck('actor_guard')->filter()->values()->all(),
            'subjects' => SystemEvent::query()->distinct()->orderBy('subject_type')->pluck('subject_type')->filter()->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function eventsQuery(array $filters): Builder
    {
        return SystemEvent::query()
            ->when($filters['module'] ?? null, fn (Builder $query, string $value) => $query->where('module', $value))
            ->when($filters['action'] ?? null, fn (Builder $query, string $value) => $query->where('action', $value))
            ->when($filters['severity'] ?? null, fn (Builder $query, string $value) => $query->where('severity', $value))
            ->when($filters['status'] ?? null, fn (Builder $query, string $value) => $query->where('status', $value))
            ->when($filters['actor_guard'] ?? null, fn (Builder $query, string $value) => $query->where('actor_guard', $value))
            ->when($filters['subject_type'] ?? null, fn (Builder $query, string $value) => $query->where('subject_type', $value))
            ->when($filters['subject_id'] ?? null, fn (Builder $query, string $value) => $query->where('subject_id', $value))
            ->when($filters['search'] ?? null, function (Builder $query, string $value) {
                $query->where(function (Builder $inner) use ($value) {
                    $inner->where('message', 'like', "%{$value}%")
                        ->orWhere('actor_label', 'like', "%{$value}%")
                        ->orWhere('action', 'like', "%{$value}%")
                        ->orWhere('subject_type', 'like', "%{$value}%");
                });
            })
            ->when($filters['from'] ?? null, fn (Builder $query, string $value) => $query->whereDate('created_at', '>=', $value))
            ->when($filters['to'] ?? null, fn (Builder $query, string $value) => $query->whereDate('created_at', '<=', $value))
            ->latest('created_at');
    }

    /**
     * @return array<int, string>
     */
    private function recentLogLines(): array
    {
        $path = storage_path('logs/laravel.log');

        if (! is_file($path) || ! is_readable($path)) {
            return [];
        }

        $handle = @fopen($path, 'rb');

        if (! $handle) {
            return [];
        }

        $size = (int) filesize($path);
        $maxBytes = 262_144;

        if ($size > $maxBytes) {
            fseek($handle, $size - $maxBytes);
            fgets($handle);
        }

        $contents = stream_get_contents($handle) ?: '';
        fclose($handle);

        $lines = preg_split('/\R/', $contents, flags: PREG_SPLIT_NO_EMPTY) ?: [];

        return collect(array_slice($lines, -400))
            ->filter(fn (string $line) => Str::contains($line, ['.ERROR:', '.CRITICAL:', '.WARNING:', '.ALERT:', '.EMERGENCY:']))
            ->take(-80)
            ->map(fn (string $line) => $this->sanitizeLogLine($line))
            ->values()
            ->all();
    }

    private function databaseCard(): array
    {
        try {
            DB::select('select 1');

            return ['label' => 'Database', 'status' => 'ok', 'value' => 'Connected', 'message' => config('database.default')];
        } catch (\Throwable $e) {
            return ['label' => 'Database', 'status' => 'critical', 'value' => 'Failed', 'message' => $e->getMessage()];
        }
    }

    private function storageCard(): array
    {
        $paths = [storage_path(), storage_path('app'), storage_path('logs')];
        $writable = collect($paths)->every(fn (string $path) => is_dir($path) && is_writable($path));

        return [
            'label' => 'Storage',
            'status' => $writable ? 'ok' : 'critical',
            'value' => $writable ? 'Writable' : 'Not Writable',
            'message' => storage_path(),
        ];
    }

    private function diskCard(): array
    {
        $total = disk_total_space(base_path());
        $free = disk_free_space(base_path());

        if (! $total || ! $free) {
            return ['label' => 'Disk Usage', 'status' => 'warning', 'value' => 'Unknown', 'message' => 'Unable to read disk usage'];
        }

        $usedPercent = round((($total - $free) / $total) * 100, 1);

        return [
            'label' => 'Disk Usage',
            'status' => $usedPercent >= 90 ? 'critical' : ($usedPercent >= 75 ? 'warning' : 'ok'),
            'value' => $usedPercent.'%',
            'message' => $this->bytes($free).' free of '.$this->bytes($total),
        ];
    }

    private function mailCard(): array
    {
        $latest = SystemHealthCheck::query()->where('name', 'mail')->first();

        return [
            'label' => 'Mail Service',
            'status' => $latest?->status ?? 'unknown',
            'value' => config('mail.default'),
            'message' => $latest?->message ?? 'No delivery event recorded yet',
        ];
    }

    private function failedJobsCard(): array
    {
        $count = Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0;

        return [
            'label' => 'Failed Jobs',
            'status' => $count > 0 ? 'warning' : 'ok',
            'value' => (string) $count,
            'message' => Schema::hasTable('failed_jobs') ? 'From failed_jobs table' : 'failed_jobs table missing',
        ];
    }

    private function healthCheckCard(string $name, string $label): array
    {
        $check = SystemHealthCheck::query()->where('name', $name)->first();

        if (! $check) {
            return ['label' => $label, 'status' => 'unknown', 'value' => 'No Data', 'message' => 'No heartbeat recorded yet'];
        }

        $stale = ! $check->checked_at || $check->checked_at->lt(now()->subMinutes(5));

        return [
            'label' => $label,
            'status' => $stale && $check->status === 'ok' ? 'warning' : $check->status,
            'value' => $stale ? 'Stale' : Str::headline($check->status),
            'message' => ($check->message ?: 'Last checked').' - '.$check->checked_at?->diffForHumans(),
        ];
    }

    private function sanitizeLogLine(string $line): string
    {
        $line = preg_replace('/(password|token|secret|tracking_pin|api_key|signature)=([^\\s,]+)/i', '$1=[redacted]', $line) ?? $line;
        $line = preg_replace('/https?:\\/\\/[^\\s]+/i', '[redacted-url]', $line) ?? $line;

        return Str::limit($line, 600);
    }

    private function bytes(float|int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $index = 0;

        while ($bytes >= 1024 && $index < count($units) - 1) {
            $bytes /= 1024;
            $index++;
        }

        return round($bytes, 1).' '.$units[$index];
    }

    private function formatDuration(int $seconds): string
    {
        if ($seconds < 3600) {
            return round($seconds / 60, 1).' minutes';
        }

        if ($seconds < 86400) {
            return round($seconds / 3600, 1).' hours';
        }

        return round($seconds / 86400, 1).' days';
    }
}
