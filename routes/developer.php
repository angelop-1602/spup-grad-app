<?php

use App\Http\Controllers\Developer\Auth\DeveloperLoginController;
use App\Http\Controllers\Developer\Auth\DeveloperTwoFactorChallengeController;
use App\Http\Controllers\Developer\Auth\DeveloperTwoFactorSetupController;
use App\Http\Controllers\Developer\ApplicationController;
use App\Http\Controllers\Developer\DeveloperDashboardController;
use App\Http\Controllers\Developer\SupportTicketController;
use App\Http\Controllers\StaffGlobalSearchController;
use App\Http\Middleware\EnsureDeveloperAuthenticated;
use App\Http\Middleware\EnsureDeveloperDiagnosticsAccess;
use App\Http\Middleware\EnsureRoleAccess;
use App\Http\Middleware\RedirectIfAnyGuardAuthenticated;
use Illuminate\Support\Facades\Route;

Route::prefix('developer')->name('developer.')->group(function () {
    Route::middleware(RedirectIfAnyGuardAuthenticated::class)->group(function () {
        Route::get('login', [DeveloperLoginController::class, 'create'])->name('login');
        Route::post('login', [DeveloperLoginController::class, 'store'])
            ->middleware('throttle:developer-login')
            ->name('login.store');
    });

    Route::middleware([EnsureRoleAccess::class.':developer', EnsureDeveloperAuthenticated::class])->group(function () {
        Route::post('logout', [DeveloperLoginController::class, 'destroy'])->name('logout');

        Route::get('two-factor/setup', [DeveloperTwoFactorSetupController::class, 'show'])->name('two-factor.setup');
        Route::post('two-factor/setup', [DeveloperTwoFactorSetupController::class, 'confirm'])
            ->middleware('throttle:developer-two-factor')
            ->name('two-factor.confirm');
        Route::get('two-factor/challenge', [DeveloperTwoFactorChallengeController::class, 'create'])->name('two-factor.challenge');
        Route::post('two-factor/challenge', [DeveloperTwoFactorChallengeController::class, 'store'])
            ->middleware('throttle:developer-two-factor')
            ->name('two-factor.challenge.store');

        Route::middleware(EnsureDeveloperDiagnosticsAccess::class)->group(function () {
            Route::get('dashboard', [DeveloperDashboardController::class, 'index'])->name('dashboard');
            Route::get('global-search', [StaffGlobalSearchController::class, 'index'])->name('global-search');
            Route::get('windows', [DeveloperDashboardController::class, 'windows'])->name('windows');
            Route::get('windows/{window}', [DeveloperDashboardController::class, 'window'])->name('windows.show');
            Route::post('windows/{window}/duplicates/alert', [DeveloperDashboardController::class, 'sendDuplicateAlert'])->name('windows.duplicates.alert');
            Route::get('manual-verification', [DeveloperDashboardController::class, 'manualVerification'])->name('manual-verification');
            Route::get('applications/{application:application_number}/edit', [ApplicationController::class, 'edit'])->name('applications.edit');
            Route::put('applications/{application:application_number}', [ApplicationController::class, 'update'])->name('applications.update');
            Route::delete('applications/{application:application_number}', [ApplicationController::class, 'destroy'])->name('applications.destroy');
            Route::get('events', [DeveloperDashboardController::class, 'events'])->name('events');
            Route::get('health', [DeveloperDashboardController::class, 'health'])->name('health');
            Route::post('drafts/{draft}/verify', [DeveloperDashboardController::class, 'verifyDraft'])->name('drafts.verify');
            Route::get('tickets', [SupportTicketController::class, 'index'])->name('tickets.index');
            Route::get('tickets/{ticket}', [SupportTicketController::class, 'show'])->name('tickets.show');
            Route::post('tickets/{ticket}/resolve', [SupportTicketController::class, 'resolve'])->name('tickets.resolve');
            Route::get('tickets/{ticket}/screenshot', [SupportTicketController::class, 'screenshot'])->name('tickets.screenshot');
            Route::get('events/export', [DeveloperDashboardController::class, 'exportEvents'])->name('events.export');
            Route::get('metrics/export', [DeveloperDashboardController::class, 'exportMetrics'])->name('metrics.export');
        });
    });
});
