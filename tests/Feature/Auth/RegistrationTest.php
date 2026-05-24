<?php

use App\Models\User;

test('registration screen redirects to the application portal', function () {
    $response = $this->get(route('register'));

    $response->assertRedirect(route('apply.index', absolute: false));
});

test('student registration redirects to the application portal without creating an account', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('apply.index', absolute: false));
    expect(User::where('email', 'test@example.com')->exists())->toBeFalse();
});
