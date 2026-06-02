<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemEvent;
use App\Support\DashboardOverview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(Request $request, DashboardOverview $overview): Response
    {
        $search = trim($request->string('search')->toString());

        $events = SystemEvent::query()
            ->whereIn('module', ['graduation_application', 'security', 'support', 'email'])
            ->when($search !== '', fn (Builder $query) => $this->applySearch($query, $search))
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('audit-trail/index', [
            'viewer' => 'admin',
            'events' => [
                ...$events->toArray(),
                'data' => $overview->auditTrailPayload($events->getCollection(), 'admin.applications.show'),
            ],
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    private function applySearch(Builder $query, string $search): void
    {
        $query->where(function (Builder $inner) use ($search): void {
            $inner->where('module', 'like', "%{$search}%")
                ->orWhere('action', 'like', "%{$search}%")
                ->orWhere('message', 'like', "%{$search}%")
                ->orWhere('actor_label', 'like', "%{$search}%")
                ->orWhere('actor_guard', 'like', "%{$search}%")
                ->orWhere('subject_type', 'like', "%{$search}%")
                ->orWhere('ip_address', 'like', "%{$search}%");
        });
    }
}
