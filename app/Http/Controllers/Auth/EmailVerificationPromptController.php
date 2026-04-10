<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationPromptController extends Controller
{
    /**
     * Display the email verification prompt.
     * Redirects to login page with error message if email is not verified.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $user = $request->user();

        // If email is already verified, redirect to intended destination
        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        // Send verification email before logging out
        try {
            $user->sendEmailVerificationNotification();
        } catch (\Exception $e) {
            // Log error but don't fail
            \Illuminate\Support\Facades\Log::error('Failed to send verification email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        $userEmail = $user->email;

        // Logout the user to break the redirect loop
        \Illuminate\Support\Facades\Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Redirect to login with dialog flag and user email
        // Use session()->put() to ensure email persists
        return redirect()->route('login')
            ->with('show_verification_dialog', true)
            ->with('user_email', $userEmail)
            ->withErrors(['student_id' => 'Your email address is not verified. Please check your email and click the verification link before logging in.']);
    }
}
