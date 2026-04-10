<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResendVerificationEmailController extends Controller
{
    /**
     * Resend the email verification notification.
     * Works without authentication by using email from session or request.
     */
    public function resend(Request $request): RedirectResponse
    {
        // Rate limiting is handled by middleware, but add additional check here
        // Get email from session (set during login attempt) or request
        $email = $request->session()->get('user_email') ?? $request->input('email');

        if (! $email) {
            return redirect()->back()->withErrors([
                'email' => 'Email address is required to resend verification email.',
            ]);
        }

        // Find user by email
        $user = User::where('email', $email)->first();

        if (! $user) {
            return redirect()->back()->withErrors([
                'email' => 'No account found with this email address.',
            ]);
        }

        // Check if already verified
        if ($user->hasVerifiedEmail()) {
            return redirect()->back()->with('status', 'Email address is already verified.');
        }

        // Send verification email
        try {
            \Illuminate\Support\Facades\Log::info('Attempting to resend verification email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_domain' => substr(strrchr($user->email, '@'), 1),
                'mail_driver' => config('mail.default'),
            ]);

            $user->sendEmailVerificationNotification();

            \Illuminate\Support\Facades\Log::info('Verification email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_domain' => substr(strrchr($user->email, '@'), 1),
            ]);

            // Keep the email in session and show dialog
            // Use put() instead of flash() to ensure it persists
            $request->session()->put('show_verification_dialog', true);
            $request->session()->put('user_email', $user->email);

            $message = 'Verification email has been sent successfully. Please check your inbox.';
            // Add special note for SPUP email addresses
            if (str_ends_with(strtolower($user->email), '@spup.edu.ph')) {
                $message .= ' If you don\'t see it, please check your spam/junk folder.';
            }

            return redirect()->back()->with('status', $message);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to resend verification email', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_domain' => substr(strrchr($user->email, '@'), 1),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $errorMessage = 'Failed to send verification email. Please try again later.';
            // Add special note for SPUP email addresses
            if (str_ends_with(strtolower($user->email), '@spup.edu.ph')) {
                $errorMessage .= ' If the problem persists, please contact the IT department.';
            }

            return redirect()->back()->withErrors([
                'email' => $errorMessage,
            ]);
        }
    }
}
