<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Support\DashboardOverview;
use App\Support\NotificationCenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the coordinator dashboard.
     */
    public function index(Request $request, DashboardOverview $overview, NotificationCenter $notificationCenter): Response
    {
        $coordinator = Auth::guard('coordinator')->user();

        // Get coordinator's assigned departments
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        // Get current active window
        $currentWindow = ApplicationWindow::current();
        $assignedApplicationsQuery = Application::query()
            ->whereIn('department_id', $departmentIds)
            ->when($currentWindow, fn ($query) => $query->where('window_id', $currentWindow->id));

        $dashboardStats = [
            'total' => (clone $assignedApplicationsQuery)->count(),
            'pending' => (clone $assignedApplicationsQuery)->whereIn('status', ['submitted', 'pending'])->count(),
            'approved' => (clone $assignedApplicationsQuery)->where('status', 'approved')->count(),
            'incomplete' => (clone $assignedApplicationsQuery)->where('status', 'incomplete')->count(),
            'new_today' => (clone $assignedApplicationsQuery)->where('created_at', '>=', now()->startOfDay())->count(),
            'new_this_week' => (clone $assignedApplicationsQuery)->where('created_at', '>=', now()->startOfWeek())->count(),
            'assigned_departments' => count($departmentIds),
        ];

        $newApplicants = (clone $assignedApplicationsQuery)
            ->with(['user.profile', 'window', 'department', 'course'])
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(fn (Application $application) => $overview->applicantPayload($application, 'coordinator.applications.show'))
            ->values();

        $notificationPayload = $notificationCenter->payloadFor($coordinator);

        // Get applications grouped by status
        $applications = [
            'pending' => collect(),
            'approved' => collect(),
            'revision' => collect(),
            'rejected' => collect(),
        ];

        if ($currentWindow) {
            $baseQuery = Application::query()
                ->with(['user.profile', 'department', 'course'])
                ->where('window_id', $currentWindow->id)
                ->whereIn('department_id', $departmentIds);

            // Filter by search if provided (name or student ID)
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $baseQuery->where(function ($q) use ($search) {
                    $q->whereHas('user.profile', function ($query) use ($search) {
                        $query->where('first_name', 'like', '%'.$search.'%')
                            ->orWhere('last_name', 'like', '%'.$search.'%')
                            ->orWhere('middle_name', 'like', '%'.$search.'%')
                            ->orWhere('suffix', 'like', '%'.$search.'%');
                    })
                        ->orWhereHas('user', function ($query) use ($search) {
                            $query->where('student_id', 'like', '%'.$search.'%');
                        });
                });
            }

            // Get applications by status
            $applications['pending'] = (clone $baseQuery)
                ->whereIn('status', ['submitted', 'pending'])
                ->orderBy('created_at', 'desc')
                ->get();

            $applications['approved'] = (clone $baseQuery)
                ->where('status', 'approved')
                ->orderBy('created_at', 'desc')
                ->get();

            $applications['revision'] = (clone $baseQuery)
                ->where('status', 'incomplete')
                ->orderBy('created_at', 'desc')
                ->get();

            // Rejected status was removed, so this will always be empty
            $applications['rejected'] = collect();
        }

        return Inertia::render('coordinator/dashboard', [
            'currentWindow' => $currentWindow,
            'applications' => $applications,
            'dashboardStats' => $dashboardStats,
            'newApplicants' => $newApplicants,
            'notifications' => $notificationPayload['notifications'],
            'unreadNotificationCount' => $notificationPayload['unreadNotificationCount'],
            'search' => $request->get('search', ''),
            'coordinator' => [
                'id' => $coordinator->id,
                'name' => $coordinator->name,
                'email' => $coordinator->email,
                'departments' => $coordinator->departments()->select('departments.id', 'departments.name', 'departments.code')->get(),
            ],
        ]);
    }
}
