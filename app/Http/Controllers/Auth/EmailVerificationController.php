<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    /**
     * Verify the user's email address.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse|Response
    {
        $user = User::findOrFail($id);

        // Verify the hash matches the user's email
        if (! hash_equals((string) $hash, sha1($user->email))) {
            abort(403, 'Invalid verification link.');
        }

        // Check if already verified
        if ($user->hasVerifiedEmail()) {
            // Already verified, show success page
            return Inertia::render('auth/email-verified', [
                'user_id' => $user->id,
                'already_verified' => true,
            ]);
        }

        // Mark email as verified
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Show success page with user ID for auto-login
        return Inertia::render('auth/email-verified', [
            'user_id' => $user->id,
            'already_verified' => false,
        ]);
    }

    /**
     * Continue after verification - auto-login and redirect to profile.
     */
    public function continue(Request $request): RedirectResponse
    {
        $userId = $request->input('user_id');

        if (! $userId) {
            return redirect()->route('login')->withErrors(['email' => 'Invalid verification session.']);
        }

        $user = User::findOrFail($userId);

        // Verify the user's email is actually verified
        if (! $user->hasVerifiedEmail()) {
            return redirect()->route('login')->withErrors(['student_id' => 'Email not verified. Please verify your email before logging in.']);
        }

        // Auto-login the user
        Auth::login($user);

        // Redirect to profile
        return redirect()->route('profile.show')->with('success', 'Your account has been verified successfully!');
    }
}
