<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChangeEmailController extends Controller
{
    /**
     * Change email address and send verification to new email.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function change(Request $request): RedirectResponse
    {
        // Get current email from session (set during login attempt)
        $currentEmail = $request->session()->get('user_email');

        if (! $currentEmail) {
            return redirect()->back()->withErrors([
                'email' => 'Unable to identify current account. Please try logging in again.',
            ]);
        }

        // Find user by current email
        $user = User::where('email', $currentEmail)->first();

        if (! $user) {
            return redirect()->back()->withErrors([
                'email' => 'No account found with this email address.',
            ]);
        }

        // Validate new email (must be different from current and unique)
        $validator = Validator::make($request->all(), [
            'email' => [
                'required',
                'email',
                'max:255',
                function ($attribute, $value, $fail) use ($currentEmail) {
                    if (strtolower($value) === strtolower($currentEmail)) {
                        $fail('The new email must be different from your current email.');
                    }
                },
                'unique:users,email,'.$user->id,
            ],
        ], [
            'email.unique' => 'This email address is already registered to another account.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        $oldEmail = $user->email;
        $newEmail = $request->email;

        \Illuminate\Support\Facades\Log::info('Attempting to change email address', [
            'user_id' => $user->id,
            'old_email' => $oldEmail,
            'new_email' => $newEmail,
        ]);

        // Update email address
        $user->email = $newEmail;
        $user->email_verified_at = null; // Reset verification status
        $saved = $user->save();

        if (! $saved) {
            \Illuminate\Support\Facades\Log::error('Failed to save email address change', [
                'user_id' => $user->id,
                'old_email' => $oldEmail,
                'new_email' => $newEmail,
            ]);
            return redirect()->back()->withErrors([
                'email' => 'Failed to update email address. Please try again.',
            ]);
        }

        // Refresh the model to ensure we have the latest data
        $user->refresh();

        \Illuminate\Support\Facades\Log::info('Email address changed successfully', [
            'user_id' => $user->id,
            'old_email' => $oldEmail,
            'new_email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
        ]);

        // Send verification email to new address
        try {
            \Illuminate\Support\Facades\Log::info('Sending verification email to new address', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_domain' => substr(strrchr($user->email, '@'), 1),
                'mail_driver' => config('mail.default'),
            ]);

            // Ensure we're sending to the updated email
            $user->sendEmailVerificationNotification();

            \Illuminate\Support\Facades\Log::info('Verification email sent after email change', [
                'user_id' => $user->id,
                'email' => $user->email,
                'email_domain' => substr(strrchr($user->email, '@'), 1),
            ]);

            // Update session with new email and success message
            // Use put() instead of flash() to ensure it persists across redirects
            $request->session()->put('show_verification_dialog', true);
            $request->session()->put('user_email', $user->email);
            $request->session()->flash('email_changed', true);
            
            $successMessage = 'Email address updated successfully! A verification link has been sent to '.$user->email.'. Please check your inbox.';
            // Add special note for SPUP email addresses
            if (str_ends_with(strtolower($user->email), '@spup.edu.ph')) {
                $successMessage .= ' If you don\'t see it, please check your spam/junk folder.';
            }
            
            $request->session()->flash('email_change_success', $successMessage);

            return redirect()->back();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send verification email after email change', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update session with new email even if sending failed
            // Use put() instead of flash() to ensure it persists across redirects
            $request->session()->put('show_verification_dialog', true);
            $request->session()->put('user_email', $user->email);
            $request->session()->flash('email_changed', true);

            return redirect()->back()->withErrors([
                'email' => 'Email address updated, but failed to send verification email. Please try resending.',
            ]);
        }
    }
}

