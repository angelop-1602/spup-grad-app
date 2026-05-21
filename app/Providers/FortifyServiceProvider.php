<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\FailedLoginResponse;
use App\Models\GuestApplicationDraft;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\FailedLoginResponse as FailedLoginResponseContract;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Override Fortify's RegisteredUserController with our custom one
        $this->app->singleton(
            \Laravel\Fortify\Http\Controllers\RegisteredUserController::class,
            \App\Http\Controllers\Auth\RegisteredUserController::class
        );

        // Override Fortify's EmailVerificationPromptController with our custom one
        $this->app->singleton(
            \Laravel\Fortify\Http\Controllers\EmailVerificationPromptController::class,
            \App\Http\Controllers\Auth\EmailVerificationPromptController::class
        );

        // Register custom failed login response early to ensure it's used
        $this->app->singleton(FailedLoginResponseContract::class, FailedLoginResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);

        // Email verification is disabled - allow login without verification
        // Custom authentication callback with specific error handling
        Fortify::authenticateUsing(function (Request $request) {
            $studentId = $request->input(Fortify::username());
            $password = $request->input('password');

            // Check if student ID exists
            $user = \App\Models\User::where('student_id', $studentId)->first();

            if (! $user) {
                // Student ID not found - throw validation exception with specific error
                throw \Illuminate\Validation\ValidationException::withMessages([
                    Fortify::username() => 'This Student ID does not exist in our system.',
                ]);
            }

            // Student ID exists, check password
            if (! \Illuminate\Support\Facades\Hash::check($password, $user->password)) {
                // Password is incorrect - throw validation exception with specific error
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'password' => 'The password you entered is incorrect.',
                ]);
            }

            // Email verification is disabled - allow login
            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn () => redirect()->route('apply.index')
            ->with('info', 'Student login is no longer used. Please continue through the public application portal.'));

        Fortify::resetPasswordView(fn () => redirect()->route('apply.index')
            ->with('info', 'Student account password reset is no longer available. Please use the public application portal.'));

        Fortify::requestPasswordResetLinkView(fn () => redirect()->route('apply.index')
            ->with('info', 'Student account password reset is no longer available. Please use the public application portal.'));

        Fortify::registerView(fn () => redirect()->route('apply.index')
            ->with('info', 'Student account registration is no longer used. Please complete your application through the public portal.'));

        Fortify::twoFactorChallengeView(fn () => redirect()->route('apply.index'));

        Fortify::confirmPasswordView(fn () => redirect()->route('apply.index'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        // Rate limit registration to prevent spam and abuse
        RateLimiter::for('register', function (Request $request) {
            // Limit by IP address - 3 registrations per hour per IP
            return Limit::perHour(3)->by($request->ip());
        });

        // Rate limit email verification resend
        RateLimiter::for('verification-resend', function (Request $request) {
            // Limit by email address - 3 resends per hour per email
            $draft = $request->route('draft');
            $email = $request->user()?->email
                ?? ($draft instanceof GuestApplicationDraft ? $draft->email : null)
                ?? $request->input('email', 'anonymous');

            return Limit::perHour(3)->by('verification-resend:'.$email);
        });

        RateLimiter::for('guest-application-resend', function (Request $request) {
            $draft = $request->route('draft');
            $draftId = $draft instanceof GuestApplicationDraft ? (string) $draft->getKey() : 'unknown';
            $draftEmail = $draft instanceof GuestApplicationDraft
                ? Str::lower((string) $draft->email)
                : Str::lower((string) $request->input('email', 'anonymous'));
            $ip = (string) $request->ip();

            return [
                Limit::perMinute(1)
                    ->by("guest-application-resend:burst:{$draftId}:{$ip}")
                    ->response(function (Request $request, array $headers) use ($draft) {
                        return redirect()->route('apply.pending.show', $draft)
                            ->with('error', 'Please wait about a minute before requesting another email.');
                    }),
                Limit::perMinutes(10, 5)
                    ->by("guest-application-resend:window:{$draftEmail}:{$ip}")
                    ->response(function (Request $request, array $headers) use ($draft) {
                        return redirect()->route('apply.pending.show', $draft)
                            ->with('error', 'Too many resend attempts. Please wait 10 minutes and try again.');
                    }),
            ];
        });

        RateLimiter::for('guest-application-track', function (Request $request) {
            $ip = (string) $request->ip();

            return Limit::perMinutes(10, 10)
                ->by("guest-application-track:{$ip}")
                ->response(function (Request $request, array $headers) {
                    return redirect()->route('home')
                        ->withErrors([
                            'tracking_code' => 'Too many tracking attempts. Please wait a few minutes and try again.',
                        ])
                        ->withInput($request->only('tracking_code', 'tracking_pin'));
                });
        });

        RateLimiter::for('guest-application-track-recovery', function (Request $request) {
            $email = Str::lower((string) $request->input('email', 'anonymous'));
            $ip = (string) $request->ip();

            return Limit::perMinutes(10, 3)
                ->by("guest-application-track-recovery:{$email}:{$ip}")
                ->response(function (Request $request, array $headers) {
                    return redirect()->route('home')
                        ->withErrors([
                            'email' => 'Please wait a few minutes before requesting another recovery email.',
                        ])
                        ->withInput([
                            'email' => $request->input('email'),
                        ]);
                });
        });
    }
}
