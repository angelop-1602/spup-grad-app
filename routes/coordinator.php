<?php

use App\Http\Controllers\Coordinator\Auth\CoordinatorLoginController;
use App\Http\Controllers\Coordinator\Auth\CoordinatorPasswordResetController;
use App\Http\Controllers\Coordinator\Auth\CoordinatorPasswordResetLinkController;
use App\Http\Middleware\RedirectIfCoordinatorAuthenticated;
use Illuminate\Support\Facades\Route;

// Redirect /coordinator to login if not authenticated
Route::get('coordinator', function () {
    if (auth()->guard('coordinator')->check()) {
        return redirect()->route('coordinator.dashboard');
    }

    return redirect()->route('coordinator.login');
});

Route::middleware([RedirectIfCoordinatorAuthenticated::class])->group(function () {
    Route::get('coordinator/login', [CoordinatorLoginController::class, 'create'])->name('coordinator.login');
    Route::post('coordinator/login', [CoordinatorLoginController::class, 'store']);

    Route::get('coordinator/forgot-password', [CoordinatorPasswordResetLinkController::class, 'create'])->name('coordinator.password.request');
    Route::post('coordinator/forgot-password', [CoordinatorPasswordResetLinkController::class, 'store'])->name('coordinator.password.email');

    Route::get('coordinator/reset-password/{token}', [CoordinatorPasswordResetController::class, 'create'])->name('coordinator.password.reset');
    Route::post('coordinator/reset-password', [CoordinatorPasswordResetController::class, 'store'])->name('coordinator.password.update');
});

use App\Http\Controllers\Coordinator\ApplicationController;
use App\Http\Controllers\Coordinator\DashboardController;
use App\Http\Controllers\Coordinator\HistoricalApplicationController;

Route::middleware(['auth:coordinator'])->group(function () {
    Route::post('coordinator/logout', [CoordinatorLoginController::class, 'destroy'])->name('coordinator.logout');

    // Dashboard
    Route::get('coordinator/dashboard', [DashboardController::class, 'index'])->name('coordinator.dashboard');

    // Applications / Windows
    Route::get('coordinator/applications', [ApplicationController::class, 'index'])->name('coordinator.applications.index');
    Route::get('coordinator/windows/historical/{batch}', [ApplicationController::class, 'historical'])
        ->name('coordinator.windows.historical');
    Route::get('coordinator/windows/{window}', [ApplicationController::class, 'window'])->name('coordinator.windows.show');
    // Export route must come before parameterized routes to avoid route conflicts
    Route::get('coordinator/applications/export', [ApplicationController::class, 'export'])->name('coordinator.applications.export');
    Route::get('coordinator/windows/{window}/export-statistics-pdf', [ApplicationController::class, 'exportStatisticsPdf'])->name('coordinator.windows.export-statistics-pdf');
    Route::get('coordinator/applications/{application:application_number}', [ApplicationController::class, 'show'])->name('coordinator.applications.show');
    Route::put('coordinator/applications/{application:application_number}/status', [ApplicationController::class, 'updateStatus'])->name('coordinator.applications.update-status');
    Route::put('coordinator/applications/{application:application_number}/requirements', [ApplicationController::class, 'updateRequirements'])->name('coordinator.applications.update-requirements');
    Route::get('coordinator/applications/{application:application_number}/download', [ApplicationController::class, 'download'])->name('coordinator.applications.download');
    Route::get('coordinator/applications/{application:application_number}/photo/download', [ApplicationController::class, 'downloadPhoto'])->name('coordinator.applications.photo.download');
    Route::post('coordinator/notifications/{notification}/mark-as-read', [ApplicationController::class, 'markNotificationAsRead'])->name('coordinator.notifications.mark-as-read');

    // Historical applications (details only)
    Route::get('coordinator/historical-applications/{historicalApplication}', [HistoricalApplicationController::class, 'show'])->name('coordinator.historical-applications.show');
});
