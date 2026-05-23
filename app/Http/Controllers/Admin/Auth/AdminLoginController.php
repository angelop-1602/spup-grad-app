<?php

namespace App\Http\Controllers\Admin\Auth;

use App\Http\Controllers\Controller;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminLoginController extends Controller
{
    /**
     * Show the admin login form.
     */
    public function create(): Response
    {
        return Inertia::render('admin/auth/login');
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

        if (! Auth::guard('admin')->attempt($credentials, $remember)) {
            $logger->log(
                module: 'security',
                action: 'admin.login.failed',
                message: 'Admin login failed.',
                status: 'failed',
                severity: 'warning',
                meta: SystemEventLogger::emailMeta($credentials['email']),
            );

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $request->session()->regenerate();
        $logger->log(
            module: 'security',
            action: 'admin.login.success',
            message: 'Admin logged in.',
            subject: Auth::guard('admin')->user(),
        );

        return redirect()->intended(route('admin.dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request, SystemEventLogger $logger): RedirectResponse
    {
        $admin = Auth::guard('admin')->user();
        if ($admin) {
            $logger->log(
                module: 'security',
                action: 'admin.logout',
                message: 'Admin logged out.',
                subject: $admin,
            );
        }

        Auth::guard('admin')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
