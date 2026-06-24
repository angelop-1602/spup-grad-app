<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\SystemEvent;
use App\Support\DashboardOverview;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(Request $request, DashboardOverview $overview): Response
    {
        $coordinator = Auth::guard('coordinator')->user();
        $search = trim($request->string('search')->toString());
        $assignedApplicationIds = $coordinator
            ->scopeApplicationsToAssignments(Application::query())
            ->pluck('id')
            ->all();

        $events = SystemEvent::query()
            ->whereIn('module', ['graduation_application', 'security', 'support', 'email'])
            ->where(function ($query) use ($assignedApplicationIds, $coordinator) {
                if ($assignedApplicationIds !== []) {
                    $query->where(function ($applicationEvents) use ($assignedApplicationIds) {
                        $applicationEvents
                            ->where('subject_type', Application::class)
                            ->whereIn('subject_id', $assignedApplicationIds);
                    });
                }

                $query->orWhere(function ($actorEvents) use ($coordinator) {
                    $actorEvents
                        ->where('actor_type', $coordinator::class)
                        ->where('actor_id', $coordinator->id);
                });
            })
            ->when($search !== '', fn (Builder $query) => $this->applySearch($query, $search))
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('audit-trail/index', [
            'viewer' => 'coordinator',
            'events' => [
                ...$events->toArray(),
                'data' => $overview->auditTrailPayload($events->getCollection(), 'coordinator.applications.show'),
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
