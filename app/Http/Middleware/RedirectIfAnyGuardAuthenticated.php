<?php

namespace App\Http\Middleware;

use App\Support\RoleSessionManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfAnyGuardAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $homeUrl = app(RoleSessionManager::class)->redirectToAuthenticatedHome($request);

        if ($homeUrl) {
            return redirect()->to($homeUrl);
        }

        return $next($request);
    }
}
