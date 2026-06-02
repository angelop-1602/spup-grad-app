<?php

use App\Http\Controllers\Admin\ApplicationController;
use App\Http\Controllers\Admin\ApplicationWindowController;
use App\Http\Controllers\Admin\AuditTrailController;
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
use App\Http\Controllers\Admin\UnverifiedApplicationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StaffGlobalSearchController;
use App\Http\Middleware\EnsureRoleAccess;
use App\Http\Middleware\RedirectIfAnyGuardAuthenticated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware([RedirectIfAnyGuardAuthenticated::class])->group(function () {
    Route::get('admin/login', [AdminLoginController::class, 'create'])->name('admin.login');
    Route::post('admin/login', [AdminLoginController::class, 'store']);

    Route::get('admin/forgot-password', [AdminPasswordResetLinkController::class, 'create'])->name('admin.password.request');
    Route::post('admin/forgot-password', [AdminPasswordResetLinkController::class, 'store'])->name('admin.password.email');

    Route::get('admin/reset-password/{token}', [AdminPasswordResetController::class, 'create'])->name('admin.password.reset');
    Route::post('admin/reset-password', [AdminPasswordResetController::class, 'store'])->name('admin.password.update');
});

Route::middleware([EnsureRoleAccess::class.':admin', 'auth:admin'])->group(function () {
    Route::post('admin/logout', [AdminLoginController::class, 'destroy'])->name('admin.logout');

    Route::get('admin/dashboard', function (
        Request $request,
        \App\Support\DashboardOverview $overview,
        \App\Support\NotificationCenter $notificationCenter
    ) {
        $currentWindow = \App\Models\ApplicationWindow::currentOrLatest();
        $applicationsScope = \App\Models\Application::query()
            ->when($currentWindow, fn ($query) => $query->where('window_id', $currentWindow->id));

        $stats = [
            'total_applications' => \App\Models\Application::count(),
            'pending_applications' => \App\Models\Application::whereIn('status', ['submitted', 'pending'])->count(),
            'approved_applications' => \App\Models\Application::where('status', 'approved')->count(),
            'incomplete_applications' => \App\Models\Application::where('status', 'incomplete')->count(),
            'rejected_applications' => \App\Models\Application::where('status', 'rejected')->count(),
            'applications_today' => (clone $applicationsScope)->where('created_at', '>=', now()->startOfDay())->count(),
            'applications_this_week' => (clone $applicationsScope)->where('created_at', '>=', now()->startOfWeek())->count(),
            'current_window_applications' => (clone $applicationsScope)->count(),
            'current_window' => $currentWindow ? [
                'id' => $currentWindow->id,
                'title' => $currentWindow->title,
                'start_date' => $currentWindow->start_date->toIso8601String(),
                'end_date' => $currentWindow->end_date->toIso8601String(),
            ] : null,
            'total_students' => \App\Models\User::count(),
            'total_coordinators' => \App\Models\Coordinator::count(),
            'total_departments' => \App\Models\Department::count(),
            'manual_verification_drafts' => \App\Models\GuestApplicationDraft::query()
                ->where(function ($query) {
                    $query->whereNull('verified_at')
                        ->orWhereNull('application_id');
                })
                ->count(),
        ];

        $newApplicants = (clone $applicationsScope)
            ->with(['user.profile', 'window', 'department', 'course'])
            ->latest('created_at')
            ->limit(10)
            ->get()
            ->map(fn (\App\Models\Application $application) => $overview->applicantPayload($application, 'admin.applications.show'))
            ->values();

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

        $notificationPayload = $notificationCenter->payloadFor($admin);

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'newApplicants' => $newApplicants,
            'recentActivities' => $activities,
            'notifications' => $notificationPayload['notifications'],
            'unreadNotificationCount' => $notificationPayload['unreadNotificationCount'],
        ]);
    })->name('admin.dashboard');

    Route::get('admin/audit-trail', [AuditTrailController::class, 'index'])->name('admin.audit-trail.index');
    Route::get('admin/global-search', [StaffGlobalSearchController::class, 'index'])->name('admin.global-search');
    Route::get('admin/unverified-applications', [UnverifiedApplicationController::class, 'index'])->name('admin.unverified-applications.index');
    Route::post('admin/windows/{window}/duplicates/alert', [ApplicationWindowController::class, 'sendDuplicateAlert'])->name('admin.windows.duplicates.alert');

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
    Route::get('admin/applications/{application:application_number}/edit', [ApplicationController::class, 'edit'])->name('admin.applications.edit');
    Route::put('admin/applications/{application:application_number}', [ApplicationController::class, 'update'])->name('admin.applications.update');
    Route::delete('admin/applications/{application:application_number}', [ApplicationController::class, 'destroy'])->name('admin.applications.destroy');
    Route::get('admin/applications/{application:application_number}', [ApplicationController::class, 'show'])->name('admin.applications.show');
    Route::put('admin/applications/{application:application_number}/status', [ApplicationController::class, 'updateStatus'])->name('admin.applications.update-status');
    Route::put('admin/applications/{application:application_number}/requirements', [ApplicationController::class, 'updateRequirements'])->name('admin.applications.update-requirements');
    Route::get('admin/applications/{application:application_number}/download', [ApplicationController::class, 'download'])->name('admin.applications.download');
    Route::get('admin/applications/{application:application_number}/photo/download', [ApplicationController::class, 'downloadPhoto'])->name('admin.applications.photo.download');
    Route::get('admin/notifications', [NotificationController::class, 'index'])->name('admin.notifications.index');
    Route::post('admin/notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('admin.notifications.mark-all-as-read');
    Route::post('admin/notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('admin.notifications.mark-as-read');

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
    Route::get('admin/students/create', [StudentController::class, 'create'])->name('admin.students.create');
    Route::post('admin/students', [StudentController::class, 'store'])->name('admin.students.store');
    Route::post('admin/students/guest-drafts/{draft}/verify', [StudentController::class, 'verifyDraft'])->name('admin.students.drafts.verify');
    Route::get('admin/students/{student}', [StudentController::class, 'show'])->name('admin.students.show');
    Route::get('admin/students/{student}/edit', [StudentController::class, 'edit'])->name('admin.students.edit');
    Route::put('admin/students/{student}', [StudentController::class, 'update'])->name('admin.students.update');
    Route::get('admin/students/{student}/applications', [StudentController::class, 'applications'])->name('admin.students.applications');
    Route::post('admin/students/{student}/reset-password', [StudentController::class, 'resetPassword'])->name('admin.students.reset-password');
    Route::delete('admin/students/{student}', [StudentController::class, 'destroy'])->name('admin.students.destroy');

    // Export
    Route::get('admin/export/applications', [ExportController::class, 'applications'])->name('admin.export.applications');
});
