<?php

namespace App\Support;

use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\GuestApplicationDraft;
use App\Models\SystemEvent;
use App\Models\SystemHealthCheck;
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
        $selectedWindowId = $this->metricsWindowId($filters);
        $resolvedFilters = [
            ...$filters,
            'window_id' => $selectedWindowId ? (string) $selectedWindowId : 'all',
        ];

        return [
            'healthCards' => $this->healthCards(),
            'applicationMetrics' => $this->applicationMetrics($selectedWindowId),
            'applicationMetricsScope' => $this->applicationMetricsScope($selectedWindowId),
            'applicationWindows' => $this->applicationWindowOptions(),
            'currentWindow' => $this->windowPayload(ApplicationWindow::current()),
            'selectedWindowId' => $selectedWindowId,
            'manualVerificationDrafts' => $this->manualVerificationDrafts($selectedWindowId, $filters['search'] ?? null),
            'applicationSearchResults' => $this->applicationSearchResults($selectedWindowId, $filters['search'] ?? null),
            'eventFilters' => $this->filterOptions(),
            'events' => $this->eventsQuery($resolvedFilters)->paginate(25)->withQueryString(),
            'recentLogLines' => $this->recentLogLines(),
            'filters' => $resolvedFilters,
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
    public function metricsWindowId(array $filters): ?int
    {
        if (array_key_exists('window_id', $filters)) {
            $value = $filters['window_id'];

            if ($value === 'all' || $value === '' || $value === null) {
                return null;
            }

            $windowId = (int) $value;

            return ApplicationWindow::query()->whereKey($windowId)->exists()
                ? $windowId
                : ApplicationWindow::current()?->id;
        }

        return ApplicationWindow::current()?->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function applicationMetrics(?int $windowId = null): array
    {
        $today = now()->startOfDay();
        $applications = $this->applicationsQuery($windowId);
        $requirements = $this->requirementsQuery($windowId);

        $approved = (clone $applications)
            ->whereNotNull('approved_at')
            ->get(['created_at', 'approved_at']);

        $averageSeconds = $approved->avg(fn (Application $application) => $application->approved_at->diffInSeconds($application->created_at));
        $missing = (clone $requirements)
            ->select('requirement_label', DB::raw('count(*) as total'))
            ->where('status', 'required')
            ->groupBy('requirement_label')
            ->orderByDesc('total')
            ->first();

        return [
            'totalApplications' => (clone $applications)->count(),
            'submittedApplications' => (clone $applications)->where('status', 'submitted')->count(),
            'pendingApplications' => (clone $applications)->where('status', 'pending')->count(),
            'incompleteApplications' => (clone $applications)->where('status', 'incomplete')->count(),
            'approvedApplications' => (clone $applications)->where('status', 'approved')->count(),
            'rejectedApplications' => (clone $applications)->where('status', 'rejected')->count(),
            'applicationsToday' => (clone $applications)->where('created_at', '>=', $today)->count(),
            'documentsUploadedToday' => (clone $requirements)->whereNotNull('file_path')->where('updated_at', '>=', $today)->count(),
            'mostCommonMissingRequirement' => $missing?->requirement_label ?? 'None',
            'averageProcessingTime' => $averageSeconds ? $this->formatDuration((int) $averageSeconds) : 'Not enough data',
        ];
    }

    private function applicationMetricsScope(?int $windowId): string
    {
        if (! $windowId) {
            return 'All Application Windows';
        }

        return ApplicationWindow::query()->whereKey($windowId)->value('title') ?? 'Selected Application Window';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function manualVerificationDrafts(?int $windowId, mixed $search = null): array
    {
        $searchTerm = trim((string) ($search ?? ''));

        return GuestApplicationDraft::query()
            ->with([
                'window:id,title',
                'application:id,application_number,user_id',
                'application.user:id,name,email,student_id',
                'application.user.profile:id,user_id,first_name,middle_name,last_name,suffix',
            ])
            ->when($windowId, fn (Builder $query) => $query->where('window_id', $windowId))
            ->when($searchTerm !== '', function (Builder $query) use ($searchTerm): void {
                $query->where(function (Builder $inner) use ($searchTerm): void {
                    $inner->where('email', 'like', "%{$searchTerm}%")
                        ->orWhere('student_id', 'like', "%{$searchTerm}%")
                        ->orWhere('tracking_code', 'like', "%{$searchTerm}%")
                        ->orWhere('tracking_pin', 'like', "%{$searchTerm}%")
                        ->orWhereHas('application', function (Builder $applicationQuery) use ($searchTerm): void {
                            $applicationQuery->where('application_number', 'like', "%{$searchTerm}%")
                                ->orWhereHas('user', function (Builder $userQuery) use ($searchTerm): void {
                                    $userQuery->where('name', 'like', "%{$searchTerm}%")
                                        ->orWhere('student_id', 'like', "%{$searchTerm}%")
                                        ->orWhere('email', 'like', "%{$searchTerm}%")
                                        ->orWhereHas('profile', function (Builder $profileQuery) use ($searchTerm): void {
                                            $profileQuery->where('first_name', 'like', "%{$searchTerm}%")
                                                ->orWhere('middle_name', 'like', "%{$searchTerm}%")
                                                ->orWhere('last_name', 'like', "%{$searchTerm}%");
                                        });
                                });
                        });
                });
            }, function (Builder $query): void {
                $query->where(function (Builder $pendingQuery): void {
                    $pendingQuery->whereNull('verified_at')
                        ->orWhereNull('application_id');
                });
            })
            ->latest('created_at')
            ->limit(25)
            ->get()
            ->map(fn (GuestApplicationDraft $draft) => [
                'id' => $draft->id,
                'applicant_name' => $this->draftApplicantName($draft->payload ?? []),
                'email' => $draft->email,
                'student_id' => $draft->student_id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'window_title' => $draft->window?->title ?? 'Unavailable',
                'application_number' => $draft->application?->application_number,
                'application_edit_url' => $draft->application
                    ? route('developer.applications.edit', $draft->application->application_number, false)
                    : null,
                'verification_status' => $this->draftVerificationStatus($draft),
                'created_at' => $draft->created_at?->toIso8601String(),
                'verified_at' => $draft->verified_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function draftVerificationStatus(GuestApplicationDraft $draft): string
    {
        if ($draft->hasBeenVerified()) {
            return 'verified';
        }

        if ($draft->verified_at && ! $draft->application_id) {
            return 'needs_application';
        }

        return 'pending';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function applicationSearchResults(?int $windowId, mixed $search = null): array
    {
        $searchTerm = trim((string) ($search ?? ''));

        if ($searchTerm === '') {
            return [];
        }

        return Application::query()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,middle_name,last_name,suffix',
                'window:id,title',
                'department:id,name,code',
                'course:id,name,code,department_id',
            ])
            ->when($windowId, fn (Builder $query) => $query->where('window_id', $windowId))
            ->where(function (Builder $query) use ($searchTerm): void {
                $query->where('application_number', 'like', "%{$searchTerm}%")
                    ->orWhereHas('user', function (Builder $userQuery) use ($searchTerm): void {
                        $userQuery->where('name', 'like', "%{$searchTerm}%")
                            ->orWhere('student_id', 'like', "%{$searchTerm}%")
                            ->orWhere('email', 'like', "%{$searchTerm}%")
                            ->orWhereHas('profile', function (Builder $profileQuery) use ($searchTerm): void {
                                $profileQuery->where('first_name', 'like', "%{$searchTerm}%")
                                    ->orWhere('middle_name', 'like', "%{$searchTerm}%")
                                    ->orWhere('last_name', 'like', "%{$searchTerm}%");
                            });
                    });
            })
            ->latest('created_at')
            ->limit(25)
            ->get()
            ->map(fn (Application $application) => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'applicant_name' => $this->applicationApplicantName($application),
                'student_id' => $application->user?->student_id,
                'email' => $application->user?->email,
                'window_title' => $application->window?->title ?? 'Unavailable',
                'department_code' => $application->department?->code ?: $application->department?->name,
                'course_name' => $application->course?->name,
                'status' => $application->status,
                'edit_url' => route('developer.applications.edit', $application->application_number, false),
                'created_at' => $application->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    private function applicationApplicantName(Application $application): string
    {
        $profile = $application->user?->profile;

        if (! $profile) {
            return $application->user?->name ?? 'Unknown Applicant';
        }

        $name = trim(implode(' ', array_filter([
            $profile->first_name,
            $profile->middle_name,
            $profile->last_name,
            $profile->suffix,
        ])));

        return $name !== '' ? $name : ($application->user?->name ?? 'Unknown Applicant');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function draftApplicantName(array $payload): string
    {
        $name = trim(implode(' ', array_filter([
            $payload['first_name'] ?? null,
            $payload['middle_name'] ?? null,
            $payload['last_name'] ?? null,
            $payload['suffix'] ?? null,
        ])));

        return $name !== '' ? $name : 'Guest Applicant';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function applicationWindowOptions(): array
    {
        $now = now()->toDateTimeString();

        return ApplicationWindow::query()
            ->withCount('applications')
            ->orderByRaw(
                'CASE WHEN start_date <= ? AND end_date >= ? THEN 0 WHEN start_date > ? THEN 1 ELSE 2 END',
                [$now, $now, $now]
            )
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(fn (ApplicationWindow $window) => [
                'id' => $window->id,
                'title' => $window->title,
                'status' => $window->status,
                'start_date' => $window->start_date?->toDateString(),
                'end_date' => $window->end_date?->toDateString(),
                'applications_count' => $window->applications_count,
            ])
            ->values()
            ->all();
    }

    private function windowPayload(?ApplicationWindow $window): ?array
    {
        if (! $window) {
            return null;
        }

        return [
            'id' => $window->id,
            'title' => $window->title,
            'status' => $window->status,
            'start_date' => $window->start_date?->toDateString(),
            'end_date' => $window->end_date?->toDateString(),
        ];
    }

    private function applicationsQuery(?int $windowId): Builder
    {
        return Application::query()
            ->when($windowId, fn (Builder $query) => $query->where('window_id', $windowId));
    }

    private function requirementsQuery(?int $windowId): Builder
    {
        return ApplicationRequirement::query()
            ->when($windowId, fn (Builder $query) => $query->whereHas(
                'application',
                fn (Builder $applicationQuery) => $applicationQuery->where('window_id', $windowId),
            ));
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
