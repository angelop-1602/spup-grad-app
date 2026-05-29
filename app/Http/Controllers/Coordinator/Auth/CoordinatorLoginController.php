<?php

namespace App\Http\Controllers\Coordinator\Auth;

use App\Http\Controllers\Controller;
use App\Support\RoleSessionManager;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CoordinatorLoginController extends Controller
{
    /**
     * Show the coordinator login form.
     */
    public function create(): Response
    {
        return Inertia::render('coordinator/auth/login');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request, SystemEventLogger $logger): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        if (! Auth::guard('coordinator')->attempt($credentials, $remember)) {
            $logger->log(
                module: 'security',
                action: 'coordinator.login.failed',
                message: 'Coordinator login failed.',
                status: 'failed',
                severity: 'warning',
                meta: SystemEventLogger::emailMeta($credentials['email']),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();
        app(RoleSessionManager::class)->keepOnlyGuard('coordinator', $request);
        $logger->log(
            module: 'security',
            action: 'coordinator.login.success',
            message: 'Coordinator logged in.',
            subject: Auth::guard('coordinator')->user(),
        );

        return redirect()->intended(route('coordinator.dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request, SystemEventLogger $logger): RedirectResponse
    {
        $coordinator = Auth::guard('coordinator')->user();
        if ($coordinator) {
            $logger->log(
                module: 'security',
                action: 'coordinator.logout',
                message: 'Coordinator logged out.',
                subject: $coordinator,
            );
        }

        Auth::guard('coordinator')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('coordinator.login');
    }
}
