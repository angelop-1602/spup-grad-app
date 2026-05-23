<?php

use App\Http\Controllers\Developer\Auth\DeveloperLoginController;
use App\Http\Controllers\Developer\Auth\DeveloperTwoFactorChallengeController;
use App\Http\Controllers\Developer\Auth\DeveloperTwoFactorSetupController;
use App\Http\Controllers\Developer\DeveloperDashboardController;
use App\Http\Middleware\EnsureDeveloperAuthenticated;
use App\Http\Middleware\EnsureDeveloperDiagnosticsAccess;
use Illuminate\Support\Facades\Route;

Route::prefix('developer')->name('developer.')->group(function () {
    Route::middleware('guest:developer')->group(function () {
        Route::get('login', [DeveloperLoginController::class, 'create'])->name('login');
        Route::post('login', [DeveloperLoginController::class, 'store'])
            ->middleware('throttle:developer-login')
            ->name('login.store');
    });

    Route::middleware(EnsureDeveloperAuthenticated::class)->group(function () {
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
            Route::get('events/export', [DeveloperDashboardController::class, 'exportEvents'])->name('events.export');
            Route::get('metrics/export', [DeveloperDashboardController::class, 'exportMetrics'])->name('metrics.export');
        });
    });
});
