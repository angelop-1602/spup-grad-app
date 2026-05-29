<?php

namespace App\Http\Middleware;

use App\Support\RoleSessionManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfStaffAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        foreach (['developer', 'admin', 'coordinator'] as $guard) {
            if (Auth::guard($guard)->check()) {
                return redirect()->to(app(RoleSessionManager::class)->homeUrl($guard, $request));
            }
        }

        return $next($request);
    }
}
