<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemEvent;
use App\Support\DashboardOverview;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(DashboardOverview $overview): Response
    {
        $events = SystemEvent::query()
            ->where('module', 'graduation_application')
            ->latest('created_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('audit-trail/index', [
            'viewer' => 'admin',
            'events' => [
                ...$events->toArray(),
                'data' => $overview->auditTrailPayload($events->getCollection(), 'admin.applications.show'),
            ],
        ]);
    }
}
