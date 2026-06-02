<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function dataManagementCatalog(): array
{
    $window = ApplicationWindow::create([
        'title' => 'May 2026 Graduation',
        'description' => 'Active graduation window for data management tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => 'College of Data Tests',
        'code' => 'CDT',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Data Management',
        'code' => 'BDM',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $course];
}

function dataManagementProfile(User $user, array $overrides = []): StudentProfile
{
    return StudentProfile::create(array_merge([
        'user_id' => $user->id,
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
    ], $overrides));
}

function dataManagementApplicationPayload(
    ApplicationWindow $window,
    Department $department,
    Course $course,
    array $overrides = [],
): array {
    return array_merge([
        'window_id' => $window->id,
        'student_id' => '2026-1001',
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
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'subject_enrollments' => [],
        'graduate_subjects' => [],
    ], $overrides);
}

function dataManagementApplication(
    ApplicationWindow $window,
    Department $department,
    Course $course,
    User $user,
): Application {
    return Application::create([
        'user_id' => $user->id,
        'window_id' => $window->id,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'status' => 'submitted',
    ]);
}

test('student profile update can change student id but rejects duplicates', function () {
    $user = User::factory()->create(['student_id' => '2026-1001']);
    $other = User::factory()->create(['student_id' => '2026-9999']);
    [$window, $department, $course] = dataManagementCatalog();

    $payload = dataManagementApplicationPayload($window, $department, $course, [
        'student_id' => '2026-1001-A',
    ]);

    $this->actingAs($user)
        ->put(route('profile.update'), $payload)
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('dashboard', absolute: false));

    expect($user->fresh()->student_id)->toBe('2026-1001-A');

    $this->actingAs($user)
        ->put(route('profile.update'), [
            ...$payload,
            'student_id' => $other->student_id,
        ])
        ->assertSessionHasErrors(['student_id']);
});

test('admin and coordinator application views expose possible duplicate names', function () {
    [$window, $department, $course] = dataManagementCatalog();
    $admin = Admin::create([
        'name' => 'Data Management Admin',
        'email' => 'data.management.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'super_admin',
    ]);
    $coordinator = Coordinator::factory()->create();
    $coordinator->departments()->attach($department);

    $firstUser = User::factory()->create(['student_id' => '2026-2001']);
    $secondUser = User::factory()->create(['student_id' => '2026-2002']);
    dataManagementProfile($firstUser);
    dataManagementProfile($secondUser, ['middle_name' => 'Marie']);

    $firstApplication = dataManagementApplication($window, $department, $course, $firstUser);
    $secondApplication = dataManagementApplication($window, $department, $course, $secondUser);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.applications.show', $firstApplication))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('possibleDuplicates', 1)
            ->where('possibleDuplicates.0.application_number', $secondApplication->application_number)
            ->where('possibleDuplicates.0.delete_url', route('admin.applications.destroy', $secondApplication, absolute: false))
        );

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.applications.show', $firstApplication))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('possibleDuplicates', 1)
            ->where('possibleDuplicates.0.application_number', $secondApplication->application_number)
            ->where('possibleDuplicates.0.delete_url', null)
        );
});

test('admin can update application data and student id with validation', function () {
    [$window, $department, $course] = dataManagementCatalog();
    $admin = Admin::create([
        'name' => 'Application Editor Admin',
        'email' => 'application.editor.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'super_admin',
    ]);
    $user = User::factory()->create(['student_id' => '2026-3001']);
    dataManagementProfile($user);
    $application = dataManagementApplication($window, $department, $course, $user);

    $this->actingAs($admin, 'admin')
        ->put(route('admin.applications.update', $application), dataManagementApplicationPayload($window, $department, $course, [
            'student_id' => '2026-3001-A',
            'first_name' => 'Andrea Updated',
        ]))
        ->assertRedirect(route('admin.applications.show', $application, absolute: false));

    expect($user->fresh()->student_id)->toBe('2026-3001-A');
    expect($user->profile->fresh()->first_name)->toBe('Andrea Updated');
});

test('uploaded 2x2 requirement image becomes the profile photo', function () {
    Storage::fake('public');
    Storage::fake('local');

    [$window, $department, $course] = dataManagementCatalog();
    $user = User::factory()->create(['student_id' => '2026-4001']);
    dataManagementProfile($user, ['photo_path' => null]);
    $application = dataManagementApplication($window, $department, $course, $user);
    $requirement = ApplicationRequirement::create([
        'application_id' => $application->id,
        'requirement_key' => 'id_picture',
        'requirement_label' => '2x2 ID Picture with white background and nametag',
        'status' => 'required',
    ]);

    $this->actingAs($user)
        ->post(route('applications.requirements.upload', [$application, $requirement]), [
            'file' => UploadedFile::fake()->image('id-picture.jpg', 300, 300),
        ])
        ->assertRedirect(route('applications.show', $application, absolute: false));

    $requirement->refresh();
    $profile = $user->profile->fresh();

    expect($requirement->file_path)->not->toBeNull();
    expect($profile->photo_path)->not->toBeNull();
    expect($profile->photo_path)->not->toBe($requirement->file_path);
    Storage::disk('local')->assertExists($requirement->file_path);
    Storage::disk('public')->assertExists($profile->photo_path);
});

test('student can view own private requirement file but another student cannot', function () {
    Storage::fake('local');

    [$window, $department, $course] = dataManagementCatalog();
    $owner = User::factory()->create(['student_id' => '2026-4101']);
    $other = User::factory()->create(['student_id' => '2026-4102']);
    dataManagementProfile($owner);
    dataManagementProfile($other);
    $application = dataManagementApplication($window, $department, $course, $owner);
    $requirement = ApplicationRequirement::create([
        'application_id' => $application->id,
        'requirement_key' => 'private_file',
        'requirement_label' => 'Private Requirement File',
        'status' => 'pending',
        'file_path' => 'requirement-files/private-test.pdf',
    ]);

    Storage::disk('local')->put($requirement->file_path, '%PDF-1.4 private file');

    $this->actingAs($owner)
        ->get(route('applications.requirements.file', [$application, $requirement]))
        ->assertOk();

    $this->actingAs($other)
        ->get(route('applications.requirements.file', [$application, $requirement]))
        ->assertForbidden();
});

test('public storage fallback refuses requirement files', function () {
    Storage::fake('public');
    Storage::disk('public')->put('requirement-files/legacy.pdf', 'legacy file');

    $this->get('/storage/requirement-files/legacy.pdf')
        ->assertNotFound();
});

test('coordinator cannot view private requirement files outside assigned departments', function () {
    Storage::fake('local');

    [$window, $assignedDepartment, $assignedCourse] = dataManagementCatalog();
    $otherDepartment = Department::create([
        'name' => 'College of Other Data Tests',
        'code' => 'ODT',
        'description' => 'Other testing department',
        'is_active' => true,
    ]);
    $otherCourse = Course::create([
        'department_id' => $otherDepartment->id,
        'name' => 'Bachelor of Other Data Management',
        'code' => 'BODM',
        'description' => 'Other testing course',
        'is_active' => true,
    ]);
    $coordinator = Coordinator::factory()->create();
    $coordinator->departments()->attach($assignedDepartment);
    $user = User::factory()->create(['student_id' => '2026-4201']);
    $application = dataManagementApplication($window, $otherDepartment, $otherCourse, $user);
    $requirement = ApplicationRequirement::create([
        'application_id' => $application->id,
        'requirement_key' => 'outside_department_file',
        'requirement_label' => 'Outside Department File',
        'status' => 'pending',
        'file_path' => 'requirement-files/outside-department.pdf',
    ]);

    Storage::disk('local')->put($requirement->file_path, '%PDF-1.4 private file');

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.applications.requirements.file', [$application, $requirement]))
        ->assertForbidden();

    expect($assignedCourse->id)->not->toBe($otherCourse->id);
});
