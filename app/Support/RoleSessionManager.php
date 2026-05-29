<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleSessionManager
{
    /**
     * @var list<string>
     */
    private const GUARDS = ['developer', 'admin', 'coordinator', 'web'];

    /**
     * @return list<string>
     */
    public function guards(): array
    {
        return self::GUARDS;
    }

    public function firstAuthenticatedGuard(): ?string
    {
        foreach (self::GUARDS as $guard) {
            if (Auth::guard($guard)->check()) {
                return $guard;
            }
        }

        return null;
    }

    public function redirectToAuthenticatedHome(Request $request): ?string
    {
        $guard = $this->firstAuthenticatedGuard();

        return $guard ? $this->homeUrl($guard, $request) : null;
    }

    public function homeUrl(string $guard, Request $request): string
    {
        return match ($guard) {
            'developer' => $this->developerHomeUrl($request),
            'admin' => route('admin.dashboard'),
            'coordinator' => route('coordinator.dashboard'),
            'web' => route('dashboard'),
            default => route('apply.index'),
        };
    }

    public function unauthenticatedRedirectUrl(Request $request): string
    {
        if ($request->is('developer') || $request->is('developer/*')) {
            return route('developer.login');
        }

        if ($request->is('admin') || $request->is('admin/*')) {
            return route('admin.login');
        }

        if ($request->is('coordinator') || $request->is('coordinator/*')) {
            return route('coordinator.login');
        }

        return route('apply.index');
    }

    public function keepOnlyGuard(string $activeGuard, Request $request): void
    {
        foreach (self::GUARDS as $guard) {
            if ($guard === $activeGuard) {
                continue;
            }

            Auth::guard($guard)->logout();
        }

        $request->session()->forget([
            'guest_application_draft_id',
            'guest_application_access',
            'login.id',
            'auth.password_confirmed_at',
        ]);

        if ($activeGuard !== 'developer') {
            $request->session()->forget('developer.two_factor_passed');
        }
    }

    private function developerHomeUrl(Request $request): string
    {
        $developer = Auth::guard('developer')->user();

        if (! $developer) {
            return route('developer.login');
        }

        if (! $developer->hasEnabledTwoFactorAuthentication()) {
            return route('developer.two-factor.setup');
        }

        if ((bool) $request->session()->get('developer.two_factor_passed', false)) {
            return route('developer.dashboard');
        }

        return route('developer.two-factor.challenge');
    }
}
