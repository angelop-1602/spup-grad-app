<?php

namespace App\Http\Middleware;

use App\Support\RoleSessionManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureRoleAccess
{
    public function handle(Request $request, Closure $next, string $guard): Response
    {
        if (Auth::guard($guard)->check()) {
            return $next($request);
        }

        $authenticatedGuard = app(RoleSessionManager::class)->firstAuthenticatedGuard();

        if ($authenticatedGuard) {
            return redirect()->to(app(RoleSessionManager::class)->homeUrl($authenticatedGuard, $request));
        }

        return $next($request);
    }
}
