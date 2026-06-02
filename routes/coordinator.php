<?php

use App\Http\Controllers\Coordinator\Auth\CoordinatorLoginController;
use App\Http\Controllers\Coordinator\Auth\CoordinatorPasswordResetController;
use App\Http\Controllers\Coordinator\Auth\CoordinatorPasswordResetLinkController;
use App\Http\Middleware\EnsureRoleAccess;
use App\Http\Middleware\RedirectIfAnyGuardAuthenticated;
use App\Support\RoleSessionManager;
use Illuminate\Support\Facades\Route;

// Redirect /coordinator to login if not authenticated
Route::get('coordinator', function () {
    $homeUrl = app(RoleSessionManager::class)->redirectToAuthenticatedHome(request());

    if ($homeUrl) {
        return redirect()->to($homeUrl);
    }

    return redirect()->route('coordinator.login');
});

Route::middleware([RedirectIfAnyGuardAuthenticated::class])->group(function () {
    Route::get('coordinator/login', [CoordinatorLoginController::class, 'create'])->name('coordinator.login');
    Route::post('coordinator/login', [CoordinatorLoginController::class, 'store']);

    Route::get('coordinator/forgot-password', [CoordinatorPasswordResetLinkController::class, 'create'])->name('coordinator.password.request');
    Route::post('coordinator/forgot-password', [CoordinatorPasswordResetLinkController::class, 'store'])->name('coordinator.password.email');

    Route::get('coordinator/reset-password/{token}', [CoordinatorPasswordResetController::class, 'create'])->name('coordinator.password.reset');
    Route::post('coordinator/reset-password', [CoordinatorPasswordResetController::class, 'store'])->name('coordinator.password.update');
});

use App\Http\Controllers\Coordinator\ApplicationController;
use App\Http\Controllers\Coordinator\AuditTrailController;
use App\Http\Controllers\Coordinator\DashboardController;
use App\Http\Controllers\Coordinator\HistoricalApplicationController;
use App\Http\Controllers\Coordinator\ManualVerificationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StaffGlobalSearchController;

Route::middleware([EnsureRoleAccess::class.':coordinator', 'auth:coordinator'])->group(function () {
    Route::post('coordinator/logout', [CoordinatorLoginController::class, 'destroy'])->name('coordinator.logout');

    // Dashboard
    Route::get('coordinator/dashboard', [DashboardController::class, 'index'])->name('coordinator.dashboard');
    Route::get('coordinator/audit-trail', [AuditTrailController::class, 'index'])->name('coordinator.audit-trail.index');
    Route::get('coordinator/global-search', [StaffGlobalSearchController::class, 'index'])->name('coordinator.global-search');
    Route::get('coordinator/manual-verification', [ManualVerificationController::class, 'index'])->name('coordinator.manual-verification.index');
    Route::post('coordinator/manual-verification/{draft}/verify', [ManualVerificationController::class, 'verify'])->name('coordinator.manual-verification.verify');

    // Applications / Windows
    Route::get('coordinator/applications', [ApplicationController::class, 'index'])->name('coordinator.applications.index');
    Route::get('coordinator/windows/historical/{batch}', [ApplicationController::class, 'historical'])
        ->name('coordinator.windows.historical');
    Route::get('coordinator/windows/{window}', [ApplicationController::class, 'window'])->name('coordinator.windows.show');
    Route::post('coordinator/windows/{window}/duplicates/alert', [ApplicationController::class, 'sendDuplicateAlert'])->name('coordinator.windows.duplicates.alert');
    // Export route must come before parameterized routes to avoid route conflicts
    Route::get('coordinator/applications/export', [ApplicationController::class, 'export'])->name('coordinator.applications.export');
    Route::get('coordinator/windows/{window}/export-statistics-pdf', [ApplicationController::class, 'exportStatisticsPdf'])->name('coordinator.windows.export-statistics-pdf');
    Route::get('coordinator/applications/{application:application_number}', [ApplicationController::class, 'show'])->name('coordinator.applications.show');
    Route::put('coordinator/applications/{application:application_number}/status', [ApplicationController::class, 'updateStatus'])->name('coordinator.applications.update-status');
    Route::put('coordinator/applications/{application:application_number}/requirements', [ApplicationController::class, 'updateRequirements'])->name('coordinator.applications.update-requirements');
    Route::get('coordinator/applications/{application:application_number}/download', [ApplicationController::class, 'download'])->name('coordinator.applications.download');
    Route::get('coordinator/applications/{application:application_number}/photo/download', [ApplicationController::class, 'downloadPhoto'])->name('coordinator.applications.photo.download');
    Route::get('coordinator/applications/{application:application_number}/requirements/{requirement}/file', [ApplicationController::class, 'requirementFile'])->name('coordinator.applications.requirements.file');
    Route::get('coordinator/notifications', [NotificationController::class, 'index'])->name('coordinator.notifications.index');
    Route::post('coordinator/notifications/mark-all-as-read', [NotificationController::class, 'markAllAsRead'])->name('coordinator.notifications.mark-all-as-read');
    Route::post('coordinator/notifications/{notification}/mark-as-read', [NotificationController::class, 'markAsRead'])->name('coordinator.notifications.mark-as-read');

    // Historical applications (details only)
    Route::get('coordinator/historical-applications/{historicalApplication}', [HistoricalApplicationController::class, 'show'])->name('coordinator.historical-applications.show');
});
