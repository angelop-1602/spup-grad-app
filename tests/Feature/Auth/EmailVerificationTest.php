<?php

use Illuminate\Support\Facades\Route;

test('default fortify email verification routes are disabled', function () {
    expect(Route::has('verification.notice'))->toBeFalse()
        ->and(Route::has('verification.verify'))->toBeFalse()
        ->and(Route::has('verification.send'))->toBeFalse();
});

test('student account email verification routes are disabled', function () {
    expect(Route::has('email.verified'))->toBeFalse()
        ->and(Route::has('email.verification.continue'))->toBeFalse()
        ->and(Route::has('email.verification.resend'))->toBeFalse()
        ->and(Route::has('email.verification.change'))->toBeFalse();
});

test('guest application email verification routes are available', function () {
    expect(Route::has('apply.verify'))->toBeTrue()
        ->and(Route::has('apply.pending.resend'))->toBeTrue()
        ->and(Route::has('apply.pending.change-email'))->toBeTrue();
});
