<?php

use App\Models\StudentProfile;
use App\Models\User;

test('guests are redirected to the application portal', function () {
    $this->get(route('dashboard'))->assertRedirect(route('apply.index', absolute: false));
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    StudentProfile::create([
        'user_id' => $user->id,
        'last_name' => 'Santos',
        'first_name' => 'Andrea',
        'date_of_birth' => '1999-05-15',
        'place_of_birth' => 'Tuguegarao City',
        'sex' => 'Female',
        'civil_status' => 'Single',
        'nationality' => 'Filipino',
        'permanent_address' => '123 Mabini Street',
        'contact_number' => '09171234567',
        'highest_education_level' => 'college',
    ]);

    $this->get(route('dashboard'))->assertOk();
});
