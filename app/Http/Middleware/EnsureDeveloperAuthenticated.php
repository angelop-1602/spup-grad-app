<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeveloperAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('developer')->check()) {
            return redirect()->route('developer.login');
        }

        return $next($request);
    }
}
