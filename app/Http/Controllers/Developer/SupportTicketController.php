<?php

namespace App\Http\Controllers\Developer;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Support\SystemEventLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class SupportTicketController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $filters = $this->filters($request);

        return Inertia::render('developer/tickets/index', [
            'tickets' => $this->ticketsQuery($filters)
                ->paginate(20)
                ->withQueryString()
                ->through(fn (SupportTicket $ticket) => $this->ticketListPayload($ticket)),
            'filters' => [
                'status' => $filters['status'] ?? 'open',
                'category' => $filters['category'] ?? 'all',
                'priority' => $filters['priority'] ?? 'all',
                'search' => $filters['search'] ?? '',
            ],
            'filterOptions' => [
                'statuses' => ['open', 'resolved', 'all'],
                'categories' => SupportTicket::CATEGORIES,
                'priorities' => SupportTicket::PRIORITIES,
            ],
            'ticketCounts' => $this->ticketCounts(),
        ]);
    }

    public function show(SupportTicket $ticket): InertiaResponse
    {
        $ticket->load('resolvedByDeveloper:id,name,email');

        return Inertia::render('developer/tickets/show', [
            'ticket' => $this->ticketDetailPayload($ticket),
        ]);
    }

    public function resolve(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'resolution_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $ticket->forceFill([
            'status' => SupportTicket::STATUS_RESOLVED,
            'resolved_at' => now(),
            'resolved_by_developer_id' => $request->user('developer')?->getKey(),
            'resolution_note' => $validated['resolution_note'] ?? null,
        ])->save();

        app(SystemEventLogger::class)->log(
            module: 'support',
            action: 'support.ticket.resolved',
            message: 'Developer marked a support ticket as resolved.',
            subject: $ticket,
            meta: [
                'ticket_number' => $ticket->ticket_number,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
            ],
            request: $request,
        );

        return back()->with('success', 'Support ticket marked as resolved.');
    }

    public function screenshot(SupportTicket $ticket): Response
    {
        if (! $ticket->hasScreenshot()) {
            abort(404);
        }

        $disk = Storage::disk($ticket->screenshot_disk);

        if (! $disk->exists($ticket->screenshot_path)) {
            abort(404);
        }

        return $disk->response(
            $ticket->screenshot_path,
            $ticket->screenshot_original_name ?: $ticket->ticket_number.'-screenshot',
            ['Content-Type' => $ticket->screenshot_mime ?: 'application/octet-stream']
        );
    }

    /**
     * @return array<string, string|null>
     */
    private function filters(Request $request): array
    {
        return $request->only(['status', 'category', 'priority', 'search']);
    }

    /**
     * @param  array<string, string|null>  $filters
     */
    private function ticketsQuery(array $filters): Builder
    {
        $status = $filters['status'] ?? 'open';
        $category = $filters['category'] ?? 'all';
        $priority = $filters['priority'] ?? 'all';

        return SupportTicket::query()
            ->when($status !== 'all', fn (Builder $query) => $query->where('status', $status))
            ->when($category !== 'all', fn (Builder $query) => $query->where('category', $category))
            ->when($priority !== 'all', fn (Builder $query) => $query->where('priority', $priority))
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $inner) use ($search): void {
                    $inner->where('ticket_number', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('reporter_name', 'like', "%{$search}%")
                        ->orWhere('reporter_email', 'like', "%{$search}%");
                });
            })
            ->latest();
    }

    /**
     * @return array<string, int>
     */
    private function ticketCounts(): array
    {
        return [
            'open' => SupportTicket::query()->where('status', SupportTicket::STATUS_OPEN)->count(),
            'resolved' => SupportTicket::query()->where('status', SupportTicket::STATUS_RESOLVED)->count(),
            'emergency' => SupportTicket::query()
                ->where('status', SupportTicket::STATUS_OPEN)
                ->where('priority', 'emergency')
                ->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ticketListPayload(SupportTicket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'status' => $ticket->status,
            'category' => $ticket->category,
            'priority' => $ticket->priority,
            'subject' => $ticket->subject,
            'reporter_name' => $ticket->reporter_name,
            'reporter_email' => $ticket->reporter_email,
            'has_screenshot' => $ticket->hasScreenshot(),
            'created_at' => $ticket->created_at?->toIso8601String(),
            'resolved_at' => $ticket->resolved_at?->toIso8601String(),
            'show_url' => route('developer.tickets.show', $ticket, absolute: false),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function ticketDetailPayload(SupportTicket $ticket): array
    {
        return [
            ...$this->ticketListPayload($ticket),
            'description' => $ticket->description,
            'reporter_guard' => $ticket->reporter_guard,
            'page_url' => $ticket->page_url,
            'ip_address' => $ticket->ip_address,
            'user_agent' => $ticket->user_agent,
            'screenshot_original_name' => $ticket->screenshot_original_name,
            'screenshot_mime' => $ticket->screenshot_mime,
            'screenshot_size' => $ticket->screenshot_size,
            'screenshot_url' => $ticket->hasScreenshot() ? route('developer.tickets.screenshot', $ticket, absolute: false) : null,
            'resolved_by_developer' => $ticket->resolvedByDeveloper ? [
                'name' => $ticket->resolvedByDeveloper->name,
                'email' => $ticket->resolvedByDeveloper->email,
            ] : null,
            'resolution_note' => $ticket->resolution_note,
            'resolve_url' => route('developer.tickets.resolve', $ticket, absolute: false),
        ];
    }
}
