<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeveloperDiagnosticsAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $developer = Auth::guard('developer')->user();

        if (! $developer) {
            return redirect()->route('developer.login');
        }

        if (! $developer->hasEnabledTwoFactorAuthentication()) {
            return redirect()->route('developer.two-factor.setup');
        }

        if (! (bool) $request->session()->get('developer.two_factor_passed', false)) {
            return redirect()->route('developer.two-factor.challenge');
        }

        return $next($request);
    }
}
