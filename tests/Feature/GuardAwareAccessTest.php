<?php

use App\Models\Admin;
use App\Models\Coordinator;
use App\Models\Developer;
use App\Models\User;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

function guardAccessConfirmedDeveloper(array $overrides = []): Developer
{
    $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();

    return Developer::factory()->create(array_merge([
        'email' => 'guard.developer@example.com',
        'two_factor_secret' => Fortify::currentEncrypter()->encrypt($secret),
        'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode(['guard-recovery'])),
        'two_factor_confirmed_at' => now(),
    ], $overrides));
}

function guardAccessAdmin(array $overrides = []): Admin
{
    return Admin::create(array_merge([
        'name' => 'Guard Admin',
        'email' => 'guard.admin@example.com',
        'password' => bcrypt('password'),
        'role' => 'super_admin',
    ], $overrides));
}

test('developer login redirects a fully challenged developer to the developer dashboard', function () {
    $developer = guardAccessConfirmedDeveloper();

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.login'))
        ->assertRedirect(route('developer.dashboard', absolute: false));
});

test('developer login redirects a developer awaiting two factor to the challenge', function () {
    $developer = guardAccessConfirmedDeveloper();

    $this->actingAs($developer->fresh(), 'developer')
        ->get(route('developer.login'))
        ->assertRedirect(route('developer.two-factor.challenge', absolute: false));
});

test('developer login redirects an admin to the admin dashboard', function () {
    $this->actingAs(guardAccessAdmin(), 'admin')
        ->get(route('developer.login'))
        ->assertRedirect(route('admin.dashboard', absolute: false));
});

test('developer login redirects a coordinator to the coordinator dashboard', function () {
    $this->actingAs(Coordinator::factory()->create(), 'coordinator')
        ->get(route('developer.login'))
        ->assertRedirect(route('coordinator.dashboard', absolute: false));
});

test('developer login redirects a web user to the user dashboard', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('developer.login'))
        ->assertRedirect(route('dashboard', absolute: false));
});

test('guests can access the applicant application page', function () {
    $this->get(route('apply.index'))->assertOk();
});

test('developers are redirected away from applicant application pages', function () {
    $this->actingAs(guardAccessConfirmedDeveloper(), 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('apply.index'))
        ->assertRedirect(route('developer.dashboard', absolute: false));
});

test('admins are redirected away from applicant application pages', function () {
    $this->actingAs(guardAccessAdmin(), 'admin')
        ->get(route('apply.index'))
        ->assertRedirect(route('admin.dashboard', absolute: false));
});

test('coordinators are redirected away from applicant application pages', function () {
    $this->actingAs(Coordinator::factory()->create(), 'coordinator')
        ->get(route('apply.index'))
        ->assertRedirect(route('coordinator.dashboard', absolute: false));
});

test('web users can access the applicant application page', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('apply.index'))
        ->assertOk();
});

test('protected role routes use their own unauthenticated login redirects', function () {
    $this->get(route('developer.dashboard'))
        ->assertRedirect(route('developer.login', absolute: false));

    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('admin.login', absolute: false));

    $this->get(route('coordinator.dashboard'))
        ->assertRedirect(route('coordinator.login', absolute: false));

    $this->get(route('dashboard'))
        ->assertRedirect(route('apply.index', absolute: false));
});

test('legacy web login clears an existing staff guard from the session', function () {
    $developer = guardAccessConfirmedDeveloper();
    $user = User::factory()->withoutTwoFactor()->create([
        'student_id' => '2020-0999',
    ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->post(route('login.store'), [
            'student_id' => $user->student_id,
            'password' => 'password',
        ])
        ->assertRedirect(route('dashboard', absolute: false));

    $this->assertAuthenticatedAs($user, 'web');
    $this->assertGuest('developer');
});
