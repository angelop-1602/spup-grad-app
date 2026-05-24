<?php

use App\Models\User;
use Laravel\Fortify\Features;

test('student login screen redirects to the application portal', function () {
    $response = $this->get(route('login'));

    $response->assertRedirect(route('apply.index', absolute: false));
});

test('legacy users can authenticate using their student id', function () {
    $user = User::factory()->withoutTwoFactor()->create([
        'student_id' => '2020-0001',
    ]);

    $response = $this->post(route('login.store'), [
        'student_id' => $user->student_id,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users with two factor enabled are redirected to two factor challenge', function () {
    if (! Features::canManageTwoFactorAuthentication()) {
        $this->markTestSkipped('Two-factor authentication is not enabled.');
    }

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->create([
        'student_id' => '2020-0002',
    ]);

    $user->forceFill([
        'two_factor_secret' => encrypt('test-secret'),
        'two_factor_recovery_codes' => encrypt(json_encode(['code1', 'code2'])),
        'two_factor_confirmed_at' => now(),
    ])->save();

    $response = $this->post(route('login'), [
        'student_id' => $user->student_id,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);
    $this->assertGuest();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create([
        'student_id' => '2020-0003',
    ]);

    $this->post(route('login.store'), [
        'student_id' => $user->student_id,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();
    $response->assertRedirect(route('home'));
});

test('users are rate limited', function () {
    $user = User::factory()->create([
        'student_id' => '2020-0004',
    ]);

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $this->post(route('login.store'), [
            'student_id' => $user->student_id,
            'password' => 'wrong-password',
        ]);
    }

    $response = $this->post(route('login.store'), [
        'student_id' => $user->student_id,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
