<?php

test('student auth entry points redirect to the guest application portal', function () {
    $this->get('/login')
        ->assertRedirect(route('apply.index', absolute: false))
        ->assertSessionHas('info');

    $this->get('/register')
        ->assertRedirect(route('apply.index', absolute: false))
        ->assertSessionHas('info');
});
