<?php

use Illuminate\Support\Facades\Route;

test('default fortify verification notification route is disabled', function () {
    expect(Route::has('verification.send'))->toBeFalse();
});
