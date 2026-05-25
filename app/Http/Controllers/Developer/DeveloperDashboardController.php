<?php

namespace App\Http\Controllers\Developer;

use App\Http\Controllers\Controller;
use App\Support\DeveloperDiagnosticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeveloperDashboardController extends Controller
{
    public function index(Request $request, DeveloperDiagnosticsService $diagnostics): Response
    {
        return Inertia::render('developer/dashboard', $diagnostics->dashboardData($this->filters($request)));
    }

    public function exportEvents(Request $request, DeveloperDiagnosticsService $diagnostics): StreamedResponse
    {
        $events = $diagnostics->eventsForExport($this->filters($request))->get();

        return response()->streamDownload(function () use ($events): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Date', 'Module', 'Action', 'Status', 'Severity', 'Actor', 'Subject', 'Message']);

            foreach ($events as $event) {
                fputcsv($handle, [
                    $event->created_at?->toDateTimeString(),
                    $event->module,
                    $event->action,
                    $event->status,
                    $event->severity,
                    $event->actor_label,
                    $event->subject_type ? class_basename($event->subject_type).' #'.$event->subject_id : '',
                    $event->message,
                ]);
            }

            fclose($handle);
        }, 'system-events-'.now()->format('Ymd-His').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function exportMetrics(Request $request, DeveloperDiagnosticsService $diagnostics): StreamedResponse
    {
        $metrics = $diagnostics->applicationMetrics($diagnostics->metricsWindowId($this->filters($request)));
        $healthCards = $diagnostics->healthCards();

        return response()->streamDownload(function () use ($metrics, $healthCards): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Section', 'Metric', 'Value', 'Status', 'Message']);

            foreach ($metrics as $key => $value) {
                fputcsv($handle, ['Application Metrics', str($key)->headline()->toString(), $value, '', '']);
            }

            foreach ($healthCards as $card) {
                fputcsv($handle, ['System Health', $card['label'], $card['value'], $card['status'], $card['message']]);
            }

            fclose($handle);
        }, 'developer-metrics-'.now()->format('Ymd-His').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function filters(Request $request): array
    {
        return $request->only([
            'module',
            'action',
            'severity',
            'status',
            'actor_guard',
            'subject_type',
            'subject_id',
            'search',
            'from',
            'to',
            'window_id',
        ]);
    }
}
