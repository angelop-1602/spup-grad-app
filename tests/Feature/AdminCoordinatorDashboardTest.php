<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use App\Models\StudentProfile;
use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

function dashboardAdmin(array $overrides = []): Admin
{
    return Admin::create(array_merge([
        'name' => 'Dashboard Admin',
        'email' => 'dashboard.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'super_admin',
    ], $overrides));
}

function dashboardCatalog(string $departmentCode = 'DASH'): array
{
    $window = ApplicationWindow::create([
        'title' => 'June 2026 Graduation',
        'description' => 'Active graduation window for dashboard tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => "College {$departmentCode}",
        'code' => $departmentCode,
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => "Bachelor {$departmentCode}",
        'code' => "B{$departmentCode}",
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $course];
}

function dashboardApplication(
    ApplicationWindow $window,
    Department $department,
    Course $course,
    string $email,
    string $studentId,
    string $status = 'submitted',
): Application {
    $user = User::factory()->create([
        'email' => $email,
        'student_id' => $studentId,
        'name' => 'Dashboard Student',
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
        'status' => $status,
    ]);
}

test('admin dashboard exposes applicant overview and audit trail page filters application events', function () {
    [$window, $department, $course] = dashboardCatalog();
    $application = dashboardApplication($window, $department, $course, 'admin.dashboard.student@example.com', '2026-0201');

    SystemEvent::create([
        'module' => 'graduation_application',
        'action' => 'admin.application.requirements_updated',
        'status' => 'success',
        'severity' => 'info',
        'actor_guard' => 'admin',
        'actor_label' => 'Dashboard Admin',
        'subject_type' => Application::class,
        'subject_id' => $application->id,
        'message' => 'Admin updated application requirements.',
        'created_at' => now(),
    ]);

    SystemEvent::create([
        'module' => 'email',
        'action' => 'admin.manual_verification.access_sent',
        'status' => 'success',
        'severity' => 'info',
        'actor_guard' => 'admin',
        'actor_label' => 'Dashboard Admin',
        'message' => 'Email event should not appear in the application audit trail.',
        'created_at' => now()->addSecond(),
    ]);

    $this->actingAs(dashboardAdmin(), 'admin')
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('stats.current_window_applications', 1)
            ->where('stats.applications_today', 1)
            ->where('newApplicants.0.application_number', $application->application_number)
            ->where('newApplicants.0.student_id', '2026-0201')
            ->missing('auditTrail')
        );

    $this->actingAs(dashboardAdmin(['email' => 'dashboard.admin.audit@example.com']), 'admin')
        ->get(route('admin.audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit-trail/index')
            ->where('viewer', 'admin')
            ->has('events.data', 1)
            ->where('events.data.0.subject_label', $application->application_number)
        );
});

test('coordinator dashboard shows assigned applicants and audit page only shows assigned application events', function () {
    [$window, $assignedDepartment, $assignedCourse] = dashboardCatalog('ASGN');

    $otherDepartment = Department::create([
        'name' => 'College Other',
        'code' => 'OTHR',
        'description' => 'Other testing department',
        'is_active' => true,
    ]);
    $otherCourse = Course::create([
        'department_id' => $otherDepartment->id,
        'name' => 'Bachelor Other',
        'code' => 'BOTHR',
        'description' => 'Other testing course',
        'is_active' => true,
    ]);

    $assignedApplication = dashboardApplication($window, $assignedDepartment, $assignedCourse, 'assigned.dashboard.student@example.com', '2026-0202');
    $otherApplication = dashboardApplication($window, $otherDepartment, $otherCourse, 'other.dashboard.student@example.com', '2026-0203');

    $coordinator = Coordinator::factory()->create([
        'email' => 'dashboard.coordinator@example.com',
    ]);
    $coordinator->departments()->attach($assignedDepartment);

    foreach ([$assignedApplication, $otherApplication] as $application) {
        SystemEvent::create([
            'module' => 'graduation_application',
            'action' => 'coordinator.application.requirements_updated',
            'status' => 'success',
            'severity' => 'info',
            'actor_guard' => 'coordinator',
            'actor_label' => 'Dashboard Coordinator',
            'subject_type' => Application::class,
            'subject_id' => $application->id,
            'message' => 'Coordinator updated application requirements.',
            'created_at' => now(),
        ]);
    }

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/dashboard')
            ->where('dashboardStats.total', 1)
            ->where('dashboardStats.pending', 1)
            ->has('newApplicants', 1)
            ->where('newApplicants.0.application_number', $assignedApplication->application_number)
            ->missing('auditTrail')
        );

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit-trail/index')
            ->where('viewer', 'coordinator')
            ->has('events.data', 1)
            ->where('events.data.0.subject_label', $assignedApplication->application_number)
        );
});
