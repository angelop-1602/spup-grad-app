<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\StudentProfile;
use App\Models\SystemEvent;
use App\Models\User;
use App\Notifications\DuplicateApplicationDetected;
use App\Notifications\GuestApplicationAccessNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
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
            ->where('newApplicants.0.department_code', $department->code)
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
            ->where('newApplicants.0.department_code', $assignedDepartment->code)
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

test('admin can view unverified guest applications on a dedicated page', function () {
    [$window] = dashboardCatalog('UNVR');

    $draft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'unverified.applicant@example.com',
        'student_id' => '2026-0301',
        'payload' => [
            'first_name' => 'Unverified',
            'last_name' => 'Applicant',
        ],
    ]);

    $this->actingAs(dashboardAdmin(['email' => 'dashboard.admin.unverified@example.com']), 'admin')
        ->get(route('admin.unverified-applications.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/unverified-applications/index')
            ->where('drafts.data.0.id', $draft->id)
            ->where('drafts.data.0.email', 'unverified.applicant@example.com')
            ->where('drafts.data.0.student_id', '2026-0301')
        );
});

test('admin window shows unverified and duplicate checks with department codes', function () {
    Notification::fake();

    [$window, $department, $course] = dashboardCatalog('DUPA');
    $application = dashboardApplication(
        $window,
        $department,
        $course,
        'admin.window.duplicate.application@example.com',
        '2026-0501',
    );

    $draft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'admin.window.duplicate.draft@example.com',
        'student_id' => '2026-0501',
        'payload' => [
            'first_name' => 'Andrea',
            'last_name' => 'Santos',
            'department_id' => $department->id,
            'course_id' => $course->id,
        ],
    ]);

    $this->actingAs(dashboardAdmin(['email' => 'dashboard.admin.window-checks@example.com']), 'admin')
        ->get(route('admin.windows.show', $window))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/windows/show')
            ->where('applications.data.0.department.code', 'DUPA')
            ->where('stats.departments.0.code', 'DUPA')
            ->where('stats.departments.0.name', 'DUPA')
            ->where('unverifiedApplications.0.key', 'draft-'.$draft->id)
            ->where('unverifiedApplications.0.department_code', 'DUPA')
            ->has('duplicatePairs', 1)
            ->where('duplicatePairs.0.left.key', 'application-'.$application->id)
            ->where('duplicatePairs.0.right.key', 'draft-'.$draft->id)
        );

    $this->actingAs(dashboardAdmin(['email' => 'dashboard.admin.window-alert@example.com']), 'admin')
        ->post(route('admin.windows.duplicates.alert', $window), [
            'left' => 'application-'.$application->id,
            'right' => 'draft-'.$draft->id,
        ])
        ->assertRedirect();

    Notification::assertSentTo($application->user->fresh(), DuplicateApplicationDetected::class);
    Notification::assertSentTo($draft->fresh(), DuplicateApplicationDetected::class);
});

test('coordinator can manually verify guest drafts for assigned departments only', function () {
    Notification::fake();

    [$window, $assignedDepartment, $assignedCourse] = dashboardCatalog('CMV');

    $otherDepartment = Department::create([
        'name' => 'Other Manual Verification Department',
        'code' => 'OMV',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $otherCourse = Course::create([
        'department_id' => $otherDepartment->id,
        'name' => 'Bachelor of Other Manual Verification',
        'code' => 'BOMV',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    $coordinator = Coordinator::factory()->create();
    $coordinator->departments()->attach($assignedDepartment);

    $payload = function (Department $department, Course $course, string $firstName): array {
        return [
            'first_name' => $firstName,
            'last_name' => 'Manual',
            'middle_name' => 'Verify',
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
        ];
    };

    $assignedDraft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'assigned.manual@example.com',
        'student_id' => '2026-0401',
        'payload' => $payload($assignedDepartment, $assignedCourse, 'Assigned'),
    ]);

    $otherDraft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'other.manual@example.com',
        'student_id' => '2026-0402',
        'payload' => $payload($otherDepartment, $otherCourse, 'Other'),
    ]);

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.manual-verification.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/manual-verification/index')
            ->where('drafts.data.0.id', $assignedDraft->id)
            ->where('drafts.total', 1)
        );

    $this->actingAs($coordinator, 'coordinator')
        ->post(route('coordinator.manual-verification.verify', $otherDraft))
        ->assertForbidden();

    $this->actingAs($coordinator, 'coordinator')
        ->post(route('coordinator.manual-verification.verify', $assignedDraft))
        ->assertRedirect();

    $assignedDraft->refresh();

    expect($assignedDraft->verified_at)->not->toBeNull()
        ->and($assignedDraft->application_id)->not->toBeNull()
        ->and($assignedDraft->application->department_id)->toBe($assignedDepartment->id);

    Notification::assertSentTo($assignedDraft->fresh(), GuestApplicationAccessNotification::class);
});

test('coordinator window duplicate checks are limited to assigned department codes', function () {
    Notification::fake();

    [$window, $assignedDepartment, $assignedCourse] = dashboardCatalog('DUPC');

    $otherDepartment = Department::create([
        'name' => 'Duplicate Other Department',
        'code' => 'DUPO',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $otherCourse = Course::create([
        'department_id' => $otherDepartment->id,
        'name' => 'Bachelor Duplicate Other',
        'code' => 'BDUPO',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    $assignedApplication = dashboardApplication(
        $window,
        $assignedDepartment,
        $assignedCourse,
        'assigned.window.duplicate.application@example.com',
        '2026-0601',
    );
    $otherApplication = dashboardApplication(
        $window,
        $otherDepartment,
        $otherCourse,
        'other.window.duplicate.application@example.com',
        '2026-0602',
    );

    $assignedDraft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'assigned.window.duplicate.draft@example.com',
        'student_id' => '2026-0601',
        'payload' => [
            'first_name' => 'Andrea',
            'last_name' => 'Santos',
            'department_id' => $assignedDepartment->id,
            'course_id' => $assignedCourse->id,
        ],
    ]);

    $otherDraft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'other.window.duplicate.draft@example.com',
        'student_id' => '2026-0602',
        'payload' => [
            'first_name' => 'Andrea',
            'last_name' => 'Santos',
            'department_id' => $otherDepartment->id,
            'course_id' => $otherCourse->id,
        ],
    ]);

    $coordinator = Coordinator::factory()->create([
        'email' => 'dashboard.coordinator.window-checks@example.com',
    ]);
    $coordinator->departments()->attach($assignedDepartment);

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('coordinator.windows.show', $window))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('coordinator/applications/window')
            ->where('applications.data.0.department.code', 'DUPC')
            ->where('stats.departments.0.code', 'DUPC')
            ->where('stats.departments.0.name', 'DUPC')
            ->has('unverifiedApplications', 1)
            ->where('unverifiedApplications.0.key', 'draft-'.$assignedDraft->id)
            ->where('unverifiedApplications.0.department_code', 'DUPC')
            ->has('duplicatePairs', 1)
            ->where('duplicatePairs.0.left.key', 'application-'.$assignedApplication->id)
            ->where('duplicatePairs.0.right.key', 'draft-'.$assignedDraft->id)
        );

    $this->actingAs($coordinator, 'coordinator')
        ->post(route('coordinator.windows.duplicates.alert', $window), [
            'left' => 'application-'.$assignedApplication->id,
            'right' => 'draft-'.$assignedDraft->id,
        ])
        ->assertRedirect();

    Notification::assertSentTo($assignedApplication->user->fresh(), DuplicateApplicationDetected::class);
    Notification::assertSentTo($assignedDraft->fresh(), DuplicateApplicationDetected::class);

    $this->actingAs($coordinator, 'coordinator')
        ->post(route('coordinator.windows.duplicates.alert', $window), [
            'left' => 'application-'.$otherApplication->id,
            'right' => 'draft-'.$otherDraft->id,
        ])
        ->assertForbidden();
});
