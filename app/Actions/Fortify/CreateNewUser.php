<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'student_id' => [
                'required',
                'string',
                'max:255',
                // Allow letters, numbers, and hyphens, but no '@' so it cannot be an email
                'regex:/^[A-Za-z0-9-]+$/',
                Rule::unique(User::class),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
                'not_regex:/@spup\.edu\.ph$/i',
            ],
            'password' => $this->passwordRules(),
        ], [
            'student_id.regex' => 'The student ID may only contain letters, numbers, and hyphens (-), and must not be an email address.',
            'student_id.unique' => 'An account with this Student ID already exists. Please log in to your account instead.',
            'email.not_regex' => 'Please use your personal and active email address. School email addresses (@spup.edu.ph) are not allowed for registration.',
            'email.unique' => 'An account with this email address already exists. Please log in to your account instead.',
        ])->validate();

        $user = User::create([
            'student_id' => $input['student_id'],
            'name' => $input['student_id'], // Use student_id as name for now
            'email' => $input['email'],
            'password' => $input['password'],
        ]);

        // Email verification is disabled - no need to send verification email
        // Users can register and login immediately

        return $user;
    }
}
