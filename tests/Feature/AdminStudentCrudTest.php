<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\User;
use App\Notifications\GuestApplicationAccessNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

function adminStudentCrudAdmin(array $overrides = []): Admin
{
    return Admin::create(array_merge([
        'name' => 'Student CRUD Admin',
        'email' => 'student.crud.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'super_admin',
    ], $overrides));
}

function adminStudentCrudCatalog(): array
{
    $window = ApplicationWindow::create([
        'title' => 'June 2026 Graduation',
        'description' => 'Active graduation window for admin student tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => 'College of Admin Tests',
        'code' => 'CAT',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Student Administration',
        'code' => 'BSA',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $course];
}

function adminStudentCrudGuestPayload(ApplicationWindow $window, Department $department, Course $course): array
{
    return [
        'window_id' => $window->id,
        'email' => 'guest.pending@example.com',
        'student_id' => '2026-0101',
        'last_name' => 'Santos',
        'first_name' => 'Andrea',
        'middle_name' => 'Lopez',
        'date_of_birth' => '1999-05-15',
        'place_of_birth' => 'Tuguegarao City',
        'sex' => 'Female',
        'civil_status' => 'Single',
        'religion' => 'Catholic',
        'nationality' => 'Filipino',
        'permanent_address' => '123 Mabini Street',
        'contact_number' => '09171234567',
        'highest_education_level' => 'college',
        'grade_1_school' => 'Elementary School 1',
        'grade_1_year' => 2005,
        'grade_2_school' => 'Elementary School 2',
        'grade_2_year' => 2006,
        'grade_3_school' => 'Elementary School 3',
        'grade_3_year' => 2007,
        'grade_4_school' => 'Elementary School 4',
        'grade_4_year' => 2008,
        'grade_5_school' => 'Elementary School 5',
        'grade_5_year' => 2009,
        'grade_6_school' => 'Elementary School 6',
        'grade_6_year' => 2010,
        'jhs_1_school' => 'Junior High 1',
        'jhs_1_year' => 2011,
        'jhs_2_school' => 'Junior High 2',
        'jhs_2_year' => 2012,
        'jhs_3_school' => 'Junior High 3',
        'jhs_3_year' => 2013,
        'jhs_4_school' => 'Junior High 4',
        'jhs_4_year' => 2014,
        'college_degree' => 'Bachelor of Arts',
        'college_school_name' => 'St. Paul University Philippines',
        'college_year_graduated' => 2020,
        'is_transferee' => false,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'subject_enrollments' => [],
        'graduate_subjects' => [],
    ];
}

test('admin can create a student account', function () {
    $admin = adminStudentCrudAdmin();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.students.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/students/create')
        );

    $this->actingAs($admin, 'admin')
        ->post(route('admin.students.store'), [
            'student_id' => '2026-0001',
            'name' => 'Created Student',
            'email' => 'created.student@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
        ->assertRedirect();

    $student = User::where('email', 'created.student@example.com')->firstOrFail();

    expect($student->student_id)->toBe('2026-0001')
        ->and(Hash::check('password123', $student->password))->toBeTrue();
});

test('admin can update a student account', function () {
    $student = User::factory()->unverified()->create([
        'student_id' => '2026-0002',
        'email' => 'before.update@example.com',
    ]);

    $this->actingAs(adminStudentCrudAdmin(), 'admin')
        ->get(route('admin.students.edit', $student))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/students/edit')
            ->where('student.id', $student->id)
        );

    $this->actingAs(adminStudentCrudAdmin(['email' => 'student.crud.admin.2@example.com']), 'admin')
        ->put(route('admin.students.update', $student), [
            'student_id' => '2026-0002-A',
            'name' => 'Updated Student',
            'email' => 'after.update@example.com',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertRedirect();

    $student->refresh();

    expect($student->student_id)->toBe('2026-0002-A')
        ->and($student->name)->toBe('Updated Student')
        ->and($student->email)->toBe('after.update@example.com')
        ->and(Hash::check('new-password', $student->password))->toBeTrue();
});

test('admin student account email verification route is removed', function () {
    User::factory()->create([
        'name' => 'Listed Student',
        'email' => 'listed.student@example.com',
    ]);

    expect(Route::has('admin.students.verify-email'))->toBeFalse();

    $this->actingAs(adminStudentCrudAdmin(), 'admin')
        ->get(route('admin.students.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/students/index')
            ->has('students.data', 1)
            ->where('students.data.0.email', 'listed.student@example.com')
        );
});

test('admin can manually verify a guest application draft', function () {
    Notification::fake();

    [$window, $department, $course] = adminStudentCrudCatalog();
    $payload = adminStudentCrudGuestPayload($window, $department, $course);

    $draft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => $payload['email'],
        'student_id' => $payload['student_id'],
        'payload' => $payload,
    ]);

    $this->actingAs(adminStudentCrudAdmin(), 'admin')
        ->get(route('admin.students.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/students/index')
            ->has('manualVerificationDrafts', 1)
            ->where('manualVerificationDrafts.0.id', $draft->id)
            ->where('manualVerificationDrafts.0.tracking_code', $draft->tracking_code)
            ->where('manualVerificationDrafts.0.tracking_pin', $draft->tracking_pin)
        );

    $this->actingAs(adminStudentCrudAdmin(['email' => 'student.crud.admin.4@example.com']), 'admin')
        ->post(route('admin.students.drafts.verify', $draft))
        ->assertRedirect();

    $draft->refresh();

    expect($draft->verified_at)->not->toBeNull()
        ->and($draft->application_id)->not->toBeNull()
        ->and(Application::count())->toBe(1);

    Notification::assertSentTo($draft->fresh(), GuestApplicationAccessNotification::class);

    $this->assertDatabaseHas('system_events', [
        'module' => 'graduation_application',
        'action' => 'admin.draft.manually_verified',
        'actor_guard' => 'admin',
    ]);
});
