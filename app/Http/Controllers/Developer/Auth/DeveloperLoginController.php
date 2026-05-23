<?php

namespace App\Http\Controllers\Developer\Auth;

use App\Http\Controllers\Controller;
use App\Models\Developer;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperLoginController extends Controller
{
    public function create(): Response|RedirectResponse
    {
        if (Auth::guard('developer')->check()) {
            return redirect()->route('developer.dashboard');
        }

        return Inertia::render('developer/auth/login');
    }

    public function store(Request $request, SystemEventLogger $logger): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        $developer = Developer::query()
            ->whereRaw('lower(email) = ?', [strtolower($credentials['email'])])
            ->first();

        if (! $developer || ! $developer->enabled || ! Hash::check($credentials['password'], $developer->password)) {
            $logger->log(
                module: 'security',
                action: 'developer.login.failed',
                message: 'Developer login failed.',
                status: 'failed',
                severity: 'warning',
                meta: SystemEventLogger::emailMeta($credentials['email']),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        Auth::guard('developer')->login($developer, (bool) ($credentials['remember'] ?? false));
        $request->session()->regenerate();
        $request->session()->forget('developer.two_factor_passed');

        if (! $developer->hasEnabledTwoFactorAuthentication()) {
            return redirect()->route('developer.two-factor.setup');
        }

        return redirect()->route('developer.two-factor.challenge');
    }

    public function destroy(Request $request, SystemEventLogger $logger): RedirectResponse
    {
        $developer = Auth::guard('developer')->user();

        if ($developer) {
            $logger->log(
                module: 'security',
                action: 'developer.logout',
                message: 'Developer logged out.',
                subject: $developer,
            );
        }

        Auth::guard('developer')->logout();
        $request->session()->forget('developer.two_factor_passed');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('developer.login');
    }
}
