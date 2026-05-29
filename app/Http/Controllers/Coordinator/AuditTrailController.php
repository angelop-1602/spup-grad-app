<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\SystemEvent;
use App\Support\DashboardOverview;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(DashboardOverview $overview): Response
    {
        $coordinator = Auth::guard('coordinator')->user();
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();
        $assignedApplicationIds = Application::query()
            ->whereIn('department_id', $departmentIds)
            ->pluck('id')
            ->all();

        $events = SystemEvent::query()
            ->where('module', 'graduation_application')
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
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('audit-trail/index', [
            'viewer' => 'coordinator',
            'events' => [
                ...$events->toArray(),
                'data' => $overview->auditTrailPayload($events->getCollection(), 'coordinator.applications.show'),
            ],
        ]);
    }
}
