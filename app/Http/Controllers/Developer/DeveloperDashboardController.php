<?php

namespace App\Http\Controllers\Developer;

use App\Http\Controllers\Controller;
use App\Models\GuestApplicationDraft;
use App\Models\SupportTicket;
use App\Models\SystemHealthCheck;
use App\Notifications\GuestApplicationAccessNotification;
use App\Support\ApplicationWorkflowService;
use App\Support\DeveloperDiagnosticsService;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DeveloperDashboardController extends Controller
{
    public function index(Request $request, DeveloperDiagnosticsService $diagnostics): Response
    {
        return Inertia::render('developer/dashboard', [
            ...$diagnostics->dashboardData($this->filters($request)),
            ...$this->supportTicketOverview(),
        ]);
    }

    public function manualVerification(Request $request, DeveloperDiagnosticsService $diagnostics): Response
    {
        return Inertia::render('developer/manual-verification', $diagnostics->dashboardData($this->filters($request)));
    }

    public function events(Request $request, DeveloperDiagnosticsService $diagnostics): Response
    {
        return Inertia::render('developer/events', $diagnostics->dashboardData($this->filters($request)));
    }

    public function health(Request $request, DeveloperDiagnosticsService $diagnostics): Response
    {
        return Inertia::render('developer/health', $diagnostics->dashboardData($this->filters($request)));
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

    public function verifyDraft(GuestApplicationDraft $draft, ApplicationWorkflowService $workflow): RedirectResponse
    {
        [$draft, $newlyFinalized] = $workflow->finalizeGuestDraft($draft);

        $draft->loadMissing('application');

        if (! $newlyFinalized) {
            app(SystemEventLogger::class)->log(
                module: 'graduation_application',
                action: 'developer.draft.manual_verify.skipped',
                message: 'Developer manual verification skipped because the draft was already verified.',
                subject: $draft->application ?? $draft,
                meta: [
                    'draft_id' => $draft->id,
                    'tracking_code' => $draft->ensureTrackingCode(),
                ],
            );

            return back()->with('info', 'This draft was already verified.');
        }

        app(SystemEventLogger::class)->log(
            module: 'graduation_application',
            action: 'developer.draft.manually_verified',
            message: 'Developer manually verified a guest application draft.',
            subject: $draft->application ?? $draft,
            meta: [
                'draft_id' => $draft->id,
                'tracking_code' => $draft->ensureTrackingCode(),
            ],
        );

        $emailSent = $this->sendManualVerificationAccessEmail($draft);

        if (! $emailSent) {
            return back()->with('warning', 'Draft manually verified, but the access email could not be sent.');
        }

        return back()->with('success', 'Draft manually verified and an access email was sent.');
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

    private function sendManualVerificationAccessEmail(GuestApplicationDraft $draft): bool
    {
        $notification = new GuestApplicationAccessNotification($draft);
        $mailMeta = [
            'notification' => $notification::class,
            'mailer' => config('mail.default'),
            'delivery_mode' => is_subclass_of($notification::class, \Illuminate\Contracts\Queue\ShouldQueue::class)
                ? 'queued'
                : 'sync',
        ];

        try {
            $draft->notify($notification);
            SystemHealthCheck::record('mail', 'ok', 'Developer manual verification access email sent.', $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'developer.manual_verification.access_sent',
                message: 'Developer manual verification access email sent.',
                subject: $draft,
                meta: $mailMeta,
            );

            return true;
        } catch (\Throwable $e) {
            SystemHealthCheck::record('mail', 'critical', $e->getMessage(), $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'developer.manual_verification.access_sent',
                message: 'Developer manual verification access email failed.',
                status: 'failed',
                severity: 'error',
                subject: $draft,
                meta: [
                    ...$mailMeta,
                    'error' => $e->getMessage(),
                ],
            );

            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function supportTicketOverview(): array
    {
        return [
            'ticketSummary' => [
                'open' => SupportTicket::query()->where('status', SupportTicket::STATUS_OPEN)->count(),
                'resolved' => SupportTicket::query()->where('status', SupportTicket::STATUS_RESOLVED)->count(),
                'newToday' => SupportTicket::query()->where('created_at', '>=', now()->startOfDay())->count(),
                'emergency' => SupportTicket::query()
                    ->where('status', SupportTicket::STATUS_OPEN)
                    ->where('priority', 'emergency')
                    ->count(),
            ],
            'recentSupportTickets' => SupportTicket::query()
                ->latest()
                ->limit(8)
                ->get()
                ->map(fn (SupportTicket $ticket) => [
                    'ticket_number' => $ticket->ticket_number,
                    'status' => $ticket->status,
                    'category' => $ticket->category,
                    'priority' => $ticket->priority,
                    'subject' => $ticket->subject,
                    'reporter_name' => $ticket->reporter_name,
                    'reporter_email' => $ticket->reporter_email,
                    'created_at' => $ticket->created_at?->toIso8601String(),
                    'show_url' => route('developer.tickets.show', $ticket, absolute: false),
                ])
                ->values()
                ->all(),
        ];
    }
}
