<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\User;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;

class SupportIssueController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        if ($request->user('developer') || $request->user('admin') || $request->user('coordinator')) {
            abort(403);
        }

        $validated = $request->validate([
            'category' => ['required', 'string', 'in:'.implode(',', SupportTicket::CATEGORIES)],
            'priority' => ['required', 'string', 'in:'.implode(',', SupportTicket::PRIORITIES)],
            'subject' => ['required', 'string', 'max:160'],
            'description' => ['required', 'string', 'max:5000'],
            'reporter_name' => ['nullable', 'string', 'max:255'],
            'reporter_email' => ['nullable', 'email', 'max:255'],
            'page_url' => ['nullable', 'string', 'max:2048'],
            'screenshot' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        $user = Auth::guard('web')->user();
        $screenshot = $request->file('screenshot');
        $screenshotData = $screenshot instanceof UploadedFile
            ? $this->storeScreenshot($screenshot)
            : [];

        unset($validated['screenshot']);

        $ticket = SupportTicket::query()->create([
            ...$validated,
            'reporter_guard' => $user ? 'student' : 'guest',
            'reporter_type' => $user ? $user::class : null,
            'reporter_id' => $user?->getKey(),
            'reporter_name' => ($validated['reporter_name'] ?? null) ?: $this->reporterName($user),
            'reporter_email' => ($validated['reporter_email'] ?? null) ?: $user?->email,
            'page_url' => $validated['page_url'] ?? $request->headers->get('referer'),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            ...$screenshotData,
        ]);

        app(SystemEventLogger::class)->log(
            module: 'support',
            action: 'support.ticket.created',
            message: 'Applicant reported an issue.',
            severity: $ticket->priority === 'emergency' ? 'critical' : ($ticket->priority === 'high' ? 'warning' : 'info'),
            subject: $ticket,
            meta: [
                'ticket_number' => $ticket->ticket_number,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'has_screenshot' => $ticket->hasScreenshot(),
            ],
            request: $request,
        );

        return back()->with('success', 'Your issue report was sent to the developer team.');
    }

    /**
     * @return array<string, mixed>
     */
    private function storeScreenshot(UploadedFile $file): array
    {
        $path = $file->store('support-ticket-screenshots/'.now()->format('Y/m'), 'local');

        return [
            'screenshot_disk' => 'local',
            'screenshot_path' => $path,
            'screenshot_original_name' => $file->getClientOriginalName(),
            'screenshot_mime' => $file->getMimeType(),
            'screenshot_size' => $file->getSize(),
        ];
    }

    private function reporterName(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        return $user->name ?: $user->email;
    }
}
