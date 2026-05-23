<?php

namespace App\Http\Controllers\Developer\Auth;

use App\Http\Controllers\Controller;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

class DeveloperTwoFactorSetupController extends Controller
{
    public function show(Request $request, EnableTwoFactorAuthentication $enable): Response|RedirectResponse
    {
        $developer = $request->user('developer');

        if ($developer->hasEnabledTwoFactorAuthentication()) {
            return (bool) $request->session()->get('developer.two_factor_passed', false)
                ? redirect()->route('developer.dashboard')
                : redirect()->route('developer.two-factor.challenge');
        }

        if (! $developer->two_factor_secret) {
            $enable($developer);
            $developer->refresh();
        }

        return Inertia::render('developer/auth/two-factor-setup', [
            'qrCodeSvg' => $developer->twoFactorQrCodeSvg(),
            'manualSetupKey' => $developer->twoFactorSecretKey(),
            'recoveryCodes' => $developer->recoveryCodes(),
        ]);
    }

    public function confirm(Request $request, TwoFactorAuthenticationProvider $provider, SystemEventLogger $logger): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'digits:6'],
        ]);

        $developer = $request->user('developer');

        if (! $developer->two_factor_secret || ! $provider->verify(Fortify::currentEncrypter()->decrypt($developer->two_factor_secret), $validated['code'])) {
            throw ValidationException::withMessages([
                'code' => __('The provided two factor authentication code was invalid.'),
            ]);
        }

        $developer->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();

        $developer->forceFill(['last_login_at' => now()])->save();
        $request->session()->put('developer.two_factor_passed', true);

        $logger->log(
            module: 'security',
            action: 'developer.two_factor.confirmed',
            message: 'Developer confirmed two-factor authentication.',
            subject: $developer,
        );

        $logger->log(
            module: 'security',
            action: 'developer.login.success',
            message: 'Developer logged in.',
            subject: $developer,
        );

        return redirect()->intended(route('developer.dashboard'));
    }
}
