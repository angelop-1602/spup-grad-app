<?php

namespace App\Http\Responses;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Contracts\FailedLoginResponse as FailedLoginResponseContract;
use Laravel\Fortify\Fortify;

class FailedLoginResponse implements FailedLoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $studentId = $request->input(Fortify::username());
        $password = $request->input('password');

        // Check if student ID exists
        $user = User::where('student_id', $studentId)->first();

        if (! $user) {
            // Student ID not found - show error below Student ID field
            return back()->withErrors([
                Fortify::username() => 'This Student ID does not exist in our system.',
            ])->withInput($request->only(Fortify::username()));
        }

        // Student ID exists but password is incorrect - show error below Password field
        if (! Hash::check($password, $user->password)) {
            return back()->withErrors([
                'password' => 'The password you entered is incorrect.',
            ])->withInput($request->only(Fortify::username()));
        }

        // Fallback to generic error (shouldn't reach here normally)
        return back()->withErrors([
            Fortify::username() => 'Invalid credentials. Please check your Student ID and password.',
        ])->withInput($request->only(Fortify::username()));
    }
}

