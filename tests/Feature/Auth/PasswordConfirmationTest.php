<?php

use App\Models\User;

test('confirm password screen redirects authenticated users to their dashboard', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertRedirect(route('dashboard', absolute: false));
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('apply.index', absolute: false));
});
