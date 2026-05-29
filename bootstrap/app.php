<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\RoleSessionManager;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->redirectGuestsTo(
            fn (Request $request): string => app(RoleSessionManager::class)->unauthenticatedRedirectUrl($request)
        );

        $middleware->redirectUsersTo(
            fn (Request $request): string => app(RoleSessionManager::class)->redirectToAuthenticatedHome($request)
                ?? route('apply.index')
        );

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (Throwable $e): void {
            if (! app()->bound('db')) {
                return;
            }

            app(\App\Support\SystemEventLogger::class)->log(
                module: 'system',
                action: 'exception.reported',
                message: $e->getMessage(),
                status: 'failed',
                severity: 'error',
                meta: [
                    'exception' => $e::class,
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                ],
            );
        });
    })->create();
