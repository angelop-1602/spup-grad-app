<?php

use App\Http\Controllers\Admin\ApplicationController;
use App\Http\Controllers\Admin\ApplicationWindowController;
use App\Http\Controllers\Admin\Auth\AdminLoginController;
use App\Http\Controllers\Admin\Auth\AdminPasswordResetController;
use App\Http\Controllers\Admin\Auth\AdminPasswordResetLinkController;
use App\Http\Controllers\Admin\CoordinatorController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\ExportController;
use App\Http\Controllers\Admin\HistoricalApplicationController;
use App\Http\Controllers\Admin\MajorController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Middleware\RedirectIfAdminAuthenticated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware([RedirectIfAdminAuthenticated::class])->group(function () {
    Route::get('admin/login', [AdminLoginController::class, 'create'])->name('admin.login');
    Route::post('admin/login', [AdminLoginController::class, 'store']);

    Route::get('admin/forgot-password', [AdminPasswordResetLinkController::class, 'create'])->name('admin.password.request');
    Route::post('admin/forgot-password', [AdminPasswordResetLinkController::class, 'store'])->name('admin.password.email');

    Route::get('admin/reset-password/{token}', [AdminPasswordResetController::class, 'create'])->name('admin.password.reset');
    Route::post('admin/reset-password', [AdminPasswordResetController::class, 'store'])->name('admin.password.update');
});

Route::middleware(['auth:admin'])->group(function () {
    Route::post('admin/logout', [AdminLoginController::class, 'destroy'])->name('admin.logout');

    Route::get('admin/dashboard', function (Request $request) {
        $currentWindow = \App\Models\ApplicationWindow::current();
        $stats = [
            'total_applications' => \App\Models\Application::count(),
            'pending_applications' => \App\Models\Application::where('status', 'submitted')->count(),
            'approved_applications' => \App\Models\Application::where('status', 'approved')->count(),
            'rejected_applications' => \App\Models\Application::where('status', 'rejected')->count(),
            'current_window' => $currentWindow ? [
                'id' => $currentWindow->id,
                'title' => $currentWindow->title,
                'start_date' => $currentWindow->start_date->toIso8601String(),
                'end_date' => $currentWindow->end_date->toIso8601String(),
            ] : null,
            'total_students' => \App\Models\User::count(),
            'total_coordinators' => \App\Models\Coordinator::count(),
            'total_departments' => \App\Models\Department::count(),
        ];

        // Recent activities
        $recentApplications = \App\Models\Application::with(['user', 'window', 'department', 'course'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $recentWindows = \App\Models\ApplicationWindow::orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Recent coordinator approvals
        $recentCoordinatorActions = \App\Models\Application::with(['user', 'course', 'approvedByCoordinator'])
            ->whereNotNull('approved_by_coordinator_id')
            ->orderByDesc('approved_at')
            ->limit(10)
            ->get();

        $activities = collect()
            ->merge($recentApplications->map(function ($application) {
                return [
                    'type' => 'application_submitted',
                    'title' => 'New application submitted',
                    'description' => "{$application->user->name} submitted an application for {$application->course->name}",
                    'time' => $application->created_at,
                    'url' => route('admin.applications.show', $application->application_number),
                ];
            }))
            ->merge($recentWindows->map(function ($window) {
                return [
                    'type' => 'window_created',
                    'title' => 'Application window created',
                    'description' => "Window '{$window->title}' was created",
                    'time' => $window->created_at,
                    'url' => route('admin.windows.show', $window->id),
                ];
            }))
            ->merge($recentCoordinatorActions->map(function ($application) {
                $coordinatorName = optional($application->approvedByCoordinator)->name ?? 'Coordinator';

                return [
                    'type' => 'coordinator_action',
                    'title' => 'Application approved by coordinator',
                    'description' => "{$coordinatorName} approved an application for {$application->user->name} ({$application->course->name})",
                    'time' => $application->approved_at ?? $application->updated_at,
                    'url' => route('admin.applications.show', $application->application_number),
                ];
            }))
            ->sortByDesc('time')
            ->take(10)
            ->values();

        $admin = $request->user('admin');

        // Get recent unread notifications (file uploads)
        $allUnreadNotifications = $admin->unreadNotifications()
            ->where('type', 'App\Notifications\RequirementFileUploaded')
            ->get();

        // Count notifications per application
        $countsByApplication = $allUnreadNotifications->groupBy(function ($notification) {
            return $notification->data['application_number'] ?? '';
        })->map->count();

        $notifications = $allUnreadNotifications
            ->sortByDesc('created_at')
            ->map(function ($notification) use ($countsByApplication) {
                $data = $notification->data;
                $applicationNumber = $data['application_number'] ?? '';

                return [
                    'id' => $notification->id,
                    'type' => $data['type'] ?? 'requirement_file_uploaded',
                    'student_name' => $data['student_name'] ?? 'Unknown',
                    'student_avatar' => $data['student_avatar'] ?? null,
                    'student_id' => $data['student_id'] ?? '',
                    'requirement_label' => $data['requirement_label'] ?? 'Requirement',
                    'application_number' => $applicationNumber,
                    'upload_count' => $countsByApplication[$applicationNumber] ?? 1,
                    'course_name' => $data['course_name'] ?? '',
                    'created_at' => $notification->created_at->toIso8601String(),
                    'read_at' => $notification->read_at?->toIso8601String(),
                ];
            });

        $unreadCount = $admin->unreadNotifications()
            ->where('type', 'App\Notifications\RequirementFileUploaded')
            ->count();

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'recentActivities' => $activities,
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadCount,
        ]);
    })->name('admin.dashboard');

    // Application Windows
    Route::get('admin/windows/all', [ApplicationWindowController::class, 'all'])->name('admin.windows.all');
    Route::get('admin/windows/historical/{batch}', [ApplicationWindowController::class, 'historical'])
        ->name('admin.windows.historical');
    Route::resource('admin/windows', ApplicationWindowController::class)->names([
        'index' => 'admin.windows.index',
        'create' => 'admin.windows.create',
        'store' => 'admin.windows.store',
        'show' => 'admin.windows.show',
        'edit' => 'admin.windows.edit',
        'update' => 'admin.windows.update',
        'destroy' => 'admin.windows.destroy',
    ]);

    // Applications (show and download only - no index page, use windows instead)
    Route::get('admin/applications/{application:application_number}', [ApplicationController::class, 'show'])->name('admin.applications.show');
    Route::put('admin/applications/{application:application_number}/status', [ApplicationController::class, 'updateStatus'])->name('admin.applications.update-status');
    Route::put('admin/applications/{application:application_number}/requirements', [ApplicationController::class, 'updateRequirements'])->name('admin.applications.update-requirements');
    Route::get('admin/applications/{application:application_number}/download', [ApplicationController::class, 'download'])->name('admin.applications.download');
    Route::get('admin/applications/{application:application_number}/photo/download', [ApplicationController::class, 'downloadPhoto'])->name('admin.applications.photo.download');
    Route::post('admin/notifications/{notification}/mark-as-read', [ApplicationController::class, 'markNotificationAsRead'])->name('admin.notifications.mark-as-read');

    // Historical applications (details only)
    Route::get('admin/historical-applications/{historicalApplication}', [HistoricalApplicationController::class, 'show'])->name('admin.historical-applications.show');

    // Window exports
    Route::get('admin/windows/{window}/export', [ApplicationWindowController::class, 'export'])->name('admin.windows.export');
    Route::get('admin/windows/{window}/export-statistics-pdf', [ApplicationWindowController::class, 'exportStatisticsPdf'])->name('admin.windows.export-statistics-pdf');

    // Departments
    Route::resource('admin/departments', DepartmentController::class)->names([
        'index' => 'admin.departments.index',
        'create' => 'admin.departments.create',
        'store' => 'admin.departments.store',
        'show' => 'admin.departments.show',
        'edit' => 'admin.departments.edit',
        'update' => 'admin.departments.update',
        'destroy' => 'admin.departments.destroy',
    ]);

    // Courses
    Route::resource('admin/courses', CourseController::class)->names([
        'index' => 'admin.courses.index',
        'create' => 'admin.courses.create',
        'store' => 'admin.courses.store',
        'show' => 'admin.courses.show',
        'edit' => 'admin.courses.edit',
        'update' => 'admin.courses.update',
        'destroy' => 'admin.courses.destroy',
    ]);

    // Majors
    Route::resource('admin/majors', MajorController::class)->names([
        'index' => 'admin.majors.index',
        'create' => 'admin.majors.create',
        'store' => 'admin.majors.store',
        'edit' => 'admin.majors.edit',
        'update' => 'admin.majors.update',
        'destroy' => 'admin.majors.destroy',
    ]);

    // Coordinators
    Route::post('admin/coordinators/{coordinator}/assign', [CoordinatorController::class, 'assign'])->name('admin.coordinators.assign');
    Route::resource('admin/coordinators', CoordinatorController::class)->names([
        'index' => 'admin.coordinators.index',
        'create' => 'admin.coordinators.create',
        'store' => 'admin.coordinators.store',
        'show' => 'admin.coordinators.show',
        'edit' => 'admin.coordinators.edit',
        'update' => 'admin.coordinators.update',
        'destroy' => 'admin.coordinators.destroy',
    ]);

    // Students
    Route::get('admin/students', [StudentController::class, 'index'])->name('admin.students.index');
    Route::get('admin/students/{student}', [StudentController::class, 'show'])->name('admin.students.show');
    Route::get('admin/students/{student}/applications', [StudentController::class, 'applications'])->name('admin.students.applications');
    Route::post('admin/students/{student}/reset-password', [StudentController::class, 'resetPassword'])->name('admin.students.reset-password');
    Route::delete('admin/students/{student}', [StudentController::class, 'destroy'])->name('admin.students.destroy');

    // Export
    Route::get('admin/export/applications', [ExportController::class, 'applications'])->name('admin.export.applications');
});
