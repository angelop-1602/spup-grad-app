<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationWindow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the coordinator dashboard.
     */
    public function index(Request $request): Response
    {
        $coordinator = Auth::guard('coordinator')->user();

        // Get coordinator's assigned departments
        $departmentIds = $coordinator->departments()->pluck('departments.id');

        // Get current active window
        $currentWindow = ApplicationWindow::current();

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
            'search' => $request->get('search', ''),
            'coordinator' => [
                'id' => $coordinator->id,
                'name' => $coordinator->name,
                'email' => $coordinator->email,
                'departments' => $coordinator->departments()->select('departments.id', 'departments.name')->get(),
            ],
        ]);
    }
}
