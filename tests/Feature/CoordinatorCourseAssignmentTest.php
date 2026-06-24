<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

function coordinatorCourseAssignmentAdmin(): Admin
{
    return Admin::create([
        'name' => 'Coordinator Assignment Admin',
        'email' => 'coordinator.assignment.admin@example.com',
        'password' => Hash::make('password'),
    ]);
}

function coordinatorCourseAssignmentCatalog(): array
{
    $window = ApplicationWindow::create([
        'title' => 'Course Assignment Window',
        'description' => 'Active graduation window for course assignment tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => 'College of Course Assignments',
        'code' => 'CCA',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $firstCourse = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Assigned Course',
        'code' => 'BAC',
        'description' => 'Assigned testing course',
        'is_active' => true,
    ]);

    $secondCourse = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Unassigned Course',
        'code' => 'BUC',
        'description' => 'Unassigned testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $firstCourse, $secondCourse];
}

function coordinatorCourseAssignmentApplication(
    ApplicationWindow $window,
    Department $department,
    Course $course,
    string $email,
    string $studentId,
): Application {
    $user = User::factory()->create([
        'name' => 'Course Assignment Student',
        'email' => $email,
        'student_id' => $studentId,
    ]);

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

function coordinatorCourseAssignmentDraft(
    ApplicationWindow $window,
    Department $department,
    Course $course,
    string $email,
    string $studentId,
): GuestApplicationDraft {
    return GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => $email,
        'student_id' => $studentId,
        'payload' => [
            'first_name' => 'Draft',
            'last_name' => 'Applicant',
            'department_id' => $department->id,
            'course_id' => $course->id,
        ],
    ]);
}

test('admin coordinator form uses academic structure and persists course assignments', function () {
    $this->withoutVite();

    [, $department, $firstCourse, $secondCourse] = coordinatorCourseAssignmentCatalog();
    $admin = coordinatorCourseAssignmentAdmin();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.coordinators.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/coordinators/create')
            ->where('departments.0.id', $department->id)
            ->where('departments.0.courses.0.id', $firstCourse->id)
            ->where('departments.0.courses.1.id', $secondCourse->id)
        );

    $this->actingAs($admin, 'admin')
        ->post(route('admin.coordinators.store'), [
            'name' => 'Course Scoped Coordinator',
            'email' => 'course.scoped.coordinator@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'department_ids' => [$department->id],
            'course_ids' => [$firstCourse->id],
        ])
        ->assertRedirect(route('admin.coordinators.index'));

    $coordinator = Coordinator::where('email', 'course.scoped.coordinator@example.com')->firstOrFail();

    expect($coordinator->departments()->pluck('departments.id')->all())->toBe([$department->id])
        ->and($coordinator->courses()->pluck('courses.id')->all())->toBe([$firstCourse->id]);

    $legacyCoordinator = Coordinator::factory()->create([
        'email' => 'legacy.department.coordinator@example.com',
    ]);
    $legacyCoordinator->departments()->attach($department);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.coordinators.edit', $legacyCoordinator))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/coordinators/edit')
            ->where('assignedCourseIds.0', $firstCourse->id)
            ->where('assignedCourseIds.1', $secondCourse->id)
        );

    $this->actingAs($admin, 'admin')
        ->put(route('admin.coordinators.update', $legacyCoordinator), [
            'name' => $legacyCoordinator->name,
            'email' => $legacyCoordinator->email,
            'department_ids' => [$department->id],
            'course_ids' => [$secondCourse->id],
        ])
        ->assertRedirect(route('admin.coordinators.index'));

    $legacyCoordinator->refresh();

    expect($legacyCoordinator->departments()->pluck('departments.id')->all())->toBe([$department->id])
        ->and($legacyCoordinator->courses()->pluck('courses.id')->all())->toBe([$secondCourse->id]);
});

test('coordinator course assignment limits applications and manual verification drafts', function () {
    $this->withoutVite();

    [$window, $department, $assignedCourse, $unassignedCourse] = coordinatorCourseAssignmentCatalog();

    $assignedApplication = coordinatorCourseAssignmentApplication(
        $window,
        $department,
        $assignedCourse,
        'assigned.course.applicant@example.com',
        '2026-0701',
    );
    $unassignedApplication = coordinatorCourseAssignmentApplication(
        $window,
        $department,
        $unassignedCourse,
        'unassigned.course.applicant@example.com',
        '2026-0702',
    );

    $assignedDraft = coordinatorCourseAssignmentDraft(
        $window,
        $department,
        $assignedCourse,
        'assigned.course.draft@example.com',
        '2026-0703',
    );
    $unassignedDraft = coordinatorCourseAssignmentDraft(
        $window,
        $department,
        $unassignedCourse,
        'unassigned.course.draft@example.com',
        '2026-0704',
    );

    $coordinator = Coordinator::factory()->create([
        'email' => 'course.scope.dashboard@example.com',
    ]);
    $coordinator->departments()->attach($department);
    $coordinator->courses()->attach($assignedCourse);

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/dashboard')
            ->where('dashboardStats.total', 1)
            ->where('dashboardStats.assigned_courses', 1)
            ->where('newApplicants.0.application_number', $assignedApplication->application_number)
        );

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.windows.show', $window))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/applications/window')
            ->where('applications.total', 1)
            ->where('applications.data.0.id', $assignedApplication->id)
            ->where('stats.status_counts.all', 1)
            ->where('unverifiedApplications.0.id', $assignedDraft->id)
        );

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.applications.show', $unassignedApplication))
        ->assertForbidden();

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.manual-verification.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/manual-verification/index')
            ->where('drafts.total', 1)
            ->where('drafts.data.0.id', $assignedDraft->id)
        );

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.manual-verification.show', $unassignedDraft))
        ->assertForbidden();

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.applications.show', $assignedApplication))
        ->assertOk();
});
