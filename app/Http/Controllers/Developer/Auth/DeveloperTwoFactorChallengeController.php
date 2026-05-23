<?php

namespace App\Http\Controllers\Developer\Auth;

use App\Http\Controllers\Controller;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

class DeveloperTwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        $developer = $request->user('developer');

        if (! $developer->hasEnabledTwoFactorAuthentication()) {
            return redirect()->route('developer.two-factor.setup');
        }

        if ((bool) $request->session()->get('developer.two_factor_passed', false)) {
            return redirect()->route('developer.dashboard');
        }

        return Inertia::render('developer/auth/two-factor-challenge');
    }

    public function store(Request $request, TwoFactorAuthenticationProvider $provider, SystemEventLogger $logger): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'digits:6'],
            'recovery_code' => ['nullable', 'string'],
        ]);

        $developer = $request->user('developer');
        $valid = false;

        if (! empty($validated['code'])) {
            $valid = $provider->verify(
                Fortify::currentEncrypter()->decrypt($developer->two_factor_secret),
                $validated['code'],
            );
        }

        if (! $valid && ! empty($validated['recovery_code'])) {
            $recoveryCode = Collection::make($developer->recoveryCodes())
                ->first(fn (string $code) => hash_equals($code, $validated['recovery_code']));

            if ($recoveryCode) {
                $developer->replaceRecoveryCode($recoveryCode);
                $valid = true;
            }
        }

        if (! $valid) {
            $logger->log(
                module: 'security',
                action: 'developer.two_factor.failed',
                message: 'Developer two-factor challenge failed.',
                status: 'failed',
                severity: 'warning',
                subject: $developer,
            );

            throw ValidationException::withMessages([
                'code' => __('The provided two factor authentication code was invalid.'),
            ]);
        }

        $developer->forceFill(['last_login_at' => now()])->save();
        $request->session()->put('developer.two_factor_passed', true);

        $logger->log(
            module: 'security',
            action: 'developer.login.success',
            message: 'Developer logged in.',
            subject: $developer,
        );

        return redirect()->intended(route('developer.dashboard'));
    }
}
