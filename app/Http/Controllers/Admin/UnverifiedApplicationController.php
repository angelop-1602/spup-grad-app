<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GuestApplicationDraft;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnverifiedApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $query = GuestApplicationDraft::query()
            ->with(['window:id,title', 'application:id,application_number'])
            ->where(function (Builder $query) {
                $query->whereNull('verified_at')
                    ->orWhereNull('application_id');
            });

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function (Builder $query) use ($search) {
                $query->where('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhere('tracking_code', 'like', "%{$search}%")
                    ->orWhere('tracking_pin', 'like', "%{$search}%");
            });
        }

        $drafts = $query
            ->latest('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (GuestApplicationDraft $draft) => [
                'id' => $draft->id,
                'applicant_name' => $this->draftApplicantName($draft->payload ?? []),
                'email' => $draft->email,
                'student_id' => $draft->student_id,
                'tracking_code' => $draft->ensureTrackingCode(),
                'tracking_pin' => $draft->ensureTrackingPin(),
                'window_title' => $draft->window?->title ?? 'Unavailable',
                'application_number' => $draft->application?->application_number,
                'created_at' => $draft->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/unverified-applications/index', [
            'drafts' => $drafts,
            'filters' => [
                'search' => $request->string('search')->toString(),
            ],
        ]);
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
}
