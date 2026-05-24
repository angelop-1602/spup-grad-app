<?php

use Illuminate\Support\Facades\Route;

test('default fortify email verification routes are disabled', function () {
    expect(Route::has('verification.notice'))->toBeFalse()
        ->and(Route::has('verification.verify'))->toBeFalse()
        ->and(Route::has('verification.send'))->toBeFalse();
});

test('guest application email verification routes are available', function () {
    expect(Route::has('email.verified'))->toBeTrue()
        ->and(Route::has('email.verification.continue'))->toBeTrue()
        ->and(Route::has('email.verification.resend'))->toBeTrue()
        ->and(Route::has('email.verification.change'))->toBeTrue();
});
