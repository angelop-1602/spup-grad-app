<?php

use App\Models\User;
test('confirm password screen redirects to the application portal', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertRedirect(route('apply.index', absolute: false));
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});
