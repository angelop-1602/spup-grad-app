<?php

use App\Models\Admin;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use App\Models\Developer;
use App\Models\GuestApplicationDraft;
use App\Models\SystemEvent;
use App\Models\User;
use App\Notifications\DuplicateApplicationDetected;
use App\Notifications\GuestApplicationAccessNotification;
use App\Support\SystemEventLogger;
use Database\Seeders\DeveloperSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;
use PragmaRX\Google2FA\Google2FA;

function diagnosticsConfirmedDeveloper(array $overrides = []): array
{
    $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();

    $developer = Developer::factory()->create(array_merge([
        'email' => 'developer@example.com',
        'password' => Hash::make('password'),
        'two_factor_secret' => Fortify::currentEncrypter()->encrypt($secret),
        'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode(['recovery-one'])),
        'two_factor_confirmed_at' => now(),
    ], $overrides));

    return [$developer, (new Google2FA)->getCurrentOtp($secret)];
}

function diagnosticsGuestCatalog(): array
{
    $window = ApplicationWindow::create([
        'title' => 'March 2026 Graduation',
        'description' => 'Active graduation window for diagnostics tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => 'College of Diagnostics',
        'code' => 'COD',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Monitoring',
        'code' => 'BMON',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $course];
}

function diagnosticsGuestPayload(ApplicationWindow $window, Department $department, Course $course): array
{
    return [
        'window_id' => $window->id,
        'email' => 'guest.audit@example.com',
        'student_id' => '2020-0001',
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

test('non developer guards cannot access developer diagnostics', function () {
    $this->get(route('developer.dashboard'))->assertRedirect(route('developer.login', absolute: false));

    $admin = Admin::create([
        'name' => 'Admin',
        'email' => 'admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'super_admin',
    ]);

    $this->actingAs($admin, 'admin')
        ->get(route('developer.dashboard'))
        ->assertRedirect(route('admin.dashboard', absolute: false));

    auth()->guard('admin')->logout();

    $coordinator = Coordinator::create([
        'name' => 'Coordinator',
        'email' => 'coordinator@example.com',
        'password' => Hash::make('password'),
    ]);

    $this->actingAs($coordinator, 'coordinator')
        ->get(route('developer.dashboard'))
        ->assertRedirect(route('coordinator.dashboard', absolute: false));

    auth()->guard('coordinator')->logout();
});

test('disabled developer cannot login', function () {
    Developer::factory()->disabled()->create([
        'email' => 'disabled@example.com',
        'password' => Hash::make('password'),
    ]);

    $this->post(route('developer.login.store'), [
        'email' => 'disabled@example.com',
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest('developer');
});

test('developer without confirmed two factor is forced to setup', function () {
    Developer::factory()->create([
        'email' => 'setup@example.com',
        'password' => Hash::make('password'),
    ]);

    $this->post(route('developer.login.store'), [
        'email' => 'setup@example.com',
        'password' => 'password',
    ])->assertRedirect(route('developer.two-factor.setup', absolute: false));

    $this->get(route('developer.dashboard'))
        ->assertRedirect(route('developer.two-factor.setup', absolute: false));
});

test('developer can confirm first time two factor setup', function () {
    $developer = Developer::factory()->create([
        'password' => Hash::make('password'),
    ]);

    $this->actingAs($developer, 'developer')
        ->get(route('developer.two-factor.setup'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/auth/two-factor-setup')
            ->has('qrCodeSvg')
            ->has('manualSetupKey')
            ->has('recoveryCodes')
        );

    $developer->refresh();
    $code = (new Google2FA)->getCurrentOtp(Fortify::currentEncrypter()->decrypt($developer->two_factor_secret));

    $this->post(route('developer.two-factor.confirm'), ['code' => $code])
        ->assertRedirect(route('developer.dashboard', absolute: false));

    expect($developer->fresh()->two_factor_confirmed_at)->not->toBeNull();
});

test('confirmed developer must pass challenge before dashboard', function () {
    [$developer, $code] = diagnosticsConfirmedDeveloper();

    $this->post(route('developer.login.store'), [
        'email' => $developer->email,
        'password' => 'password',
    ])->assertRedirect(route('developer.two-factor.challenge', absolute: false));

    $this->get(route('developer.dashboard'))
        ->assertRedirect(route('developer.two-factor.challenge', absolute: false));

    $this->post(route('developer.two-factor.challenge.store'), ['code' => $code])
        ->assertRedirect(route('developer.dashboard', absolute: false));

    $this->get(route('developer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/dashboard')
            ->has('healthCards')
            ->has('applicationMetrics')
            ->has('events.data')
        );
});

test('developer diagnostics console exposes separated pages', function () {
    [$developer] = diagnosticsConfirmedDeveloper();

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.manual-verification'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/manual-verification')
            ->has('manualVerificationDrafts')
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.events'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/events')
            ->has('events.data')
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.health'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/health')
            ->has('healthCards')
            ->has('recentLogLines')
        );
});

test('developer can view application windows and use global search', function () {
    [$developer] = diagnosticsConfirmedDeveloper();
    [$window, $department, $course] = diagnosticsGuestCatalog();

    $user = User::factory()->create([
        'email' => 'global.search@example.com',
        'student_id' => '2026-9001',
    ]);

    $application = app(\App\Support\ApplicationWorkflowService::class)
        ->createApplicationForUser($user, [
            ...diagnosticsGuestPayload($window, $department, $course),
            'email' => 'global.search@example.com',
            'student_id' => '2026-9001',
        ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.windows'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/windows')
            ->where('windows.data.0.id', $window->id)
            ->where('windows.data.0.applications_count', 1)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->getJson(route('developer.global-search', ['search' => $application->application_number]))
        ->assertOk()
        ->assertJsonFragment([
            'type' => 'application',
            'title' => $application->application_number,
            'url' => route('developer.applications.edit', $application, absolute: false),
        ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->getJson(route('developer.global-search', ['search' => 'March 2026']))
        ->assertOk()
        ->assertJsonFragment([
            'type' => 'window',
            'title' => $window->title,
        ]);
});

test('developer can review window applications and send duplicate alerts', function () {
    Notification::fake();

    [$developer] = diagnosticsConfirmedDeveloper();
    [$window, $department, $course] = diagnosticsGuestCatalog();

    $payload = diagnosticsGuestPayload($window, $department, $course);
    $user = User::factory()->create([
        'email' => 'verified.duplicate@example.com',
        'student_id' => '2020-0001',
    ]);

    $application = app(\App\Support\ApplicationWorkflowService::class)
        ->createApplicationForUser($user, [
            ...$payload,
            'email' => 'verified.duplicate@example.com',
            'student_id' => '2020-0001',
        ]);

    $draft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'draft.duplicate@example.com',
        'student_id' => '2020-0001',
        'payload' => [
            ...$payload,
            'email' => 'draft.duplicate@example.com',
            'student_id' => '2020-0001',
        ],
    ]);

    $leftKey = 'application-'.$application->id;
    $rightKey = 'draft-'.$draft->id;

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.windows.show', $window))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/window')
            ->where('window.id', $window->id)
            ->where('verifiedApplications.0.key', $leftKey)
            ->where('unverifiedApplications.0.key', $rightKey)
            ->has('duplicatePairs', 1)
            ->where('duplicatePairs.0.left.key', $leftKey)
            ->where('duplicatePairs.0.right.key', $rightKey)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->post(route('developer.windows.duplicates.alert', $window), [
            'left' => $leftKey,
            'right' => $rightKey,
        ])
        ->assertRedirect();

    Notification::assertSentTo(
        $user->fresh(),
        DuplicateApplicationDetected::class,
        fn (DuplicateApplicationDetected $notification) => str_contains($notification->reviewUrl(), "/duplicate-applications/{$leftKey}/{$rightKey}")
    );

    Notification::assertSentTo(
        $draft->fresh(),
        DuplicateApplicationDetected::class,
        fn (DuplicateApplicationDetected $notification) => str_contains($notification->reviewUrl(), "/duplicate-applications/{$leftKey}/{$rightKey}")
    );
});

test('signed duplicate resolution deletes only one selected record', function () {
    [$window, $department, $course] = diagnosticsGuestCatalog();

    $payload = diagnosticsGuestPayload($window, $department, $course);
    $user = User::factory()->create([
        'email' => 'keep.duplicate@example.com',
        'student_id' => '2020-0001',
    ]);

    $application = app(\App\Support\ApplicationWorkflowService::class)
        ->createApplicationForUser($user, [
            ...$payload,
            'email' => 'keep.duplicate@example.com',
            'student_id' => '2020-0001',
        ]);

    $draft = GuestApplicationDraft::create([
        'window_id' => $window->id,
        'email' => 'delete.duplicate@example.com',
        'student_id' => '2020-0001',
        'payload' => [
            ...$payload,
            'email' => 'delete.duplicate@example.com',
            'student_id' => '2020-0001',
        ],
    ]);

    $leftKey = 'application-'.$application->id;
    $rightKey = 'draft-'.$draft->id;

    $this->get(URL::temporarySignedRoute('duplicate-applications.show', now()->addDays(14), [
        'left' => $leftKey,
        'right' => $rightKey,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('duplicate-applications/resolve')
            ->where('resolved', false)
            ->where('left.key', $leftKey)
            ->where('right.key', $rightKey)
        );

    $this->post(URL::temporarySignedRoute('duplicate-applications.destroy', now()->addDays(14), [
        'left' => $leftKey,
        'right' => $rightKey,
    ]), [
        'selected_record' => $rightKey,
    ])->assertRedirect();

    $this->assertDatabaseHas('applications', ['id' => $application->id]);
    $this->assertDatabaseMissing('guest_application_drafts', ['id' => $draft->id]);

    $this->get(URL::temporarySignedRoute('duplicate-applications.show', now()->addDays(14), [
        'left' => $leftKey,
        'right' => $rightKey,
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('duplicate-applications/resolve')
            ->where('resolved', true)
        );

    $this->post(URL::temporarySignedRoute('duplicate-applications.destroy', now()->addDays(14), [
        'left' => $leftKey,
        'right' => $rightKey,
    ]), [
        'selected_record' => $leftKey,
    ])->assertRedirect();

    $this->assertDatabaseHas('applications', ['id' => $application->id]);
});

test('developer seeder creates account from environment', function () {
    putenv('DEVELOPER_NAME=Angelo P. Peralta');
    putenv('DEVELOPER_EMAIL=aperalta@spup.edu.ph');
    putenv('DEVELOPER_PASSWORD=secret-password');

    $this->seed(DeveloperSeeder::class);

    $developer = Developer::where('email', 'aperalta@spup.edu.ph')->first();

    expect($developer)->not->toBeNull()
        ->and(Hash::check('secret-password', $developer->password))->toBeTrue();
});

test('developer application metrics default to active window and can switch windows', function () {
    [$developer] = diagnosticsConfirmedDeveloper();
    [$activeWindow, $department, $course] = diagnosticsGuestCatalog();

    $endedWindow = ApplicationWindow::create([
        'title' => 'January 2026 Graduation',
        'description' => 'Ended graduation window for diagnostics tests.',
        'start_date' => now()->subMonths(3),
        'end_date' => now()->subMonths(2),
    ]);

    $workflow = app(\App\Support\ApplicationWorkflowService::class);

    $activeUser = User::factory()->create([
        'email' => 'active.window@example.com',
        'student_id' => '2020-0002',
    ]);
    $workflow->createApplicationForUser($activeUser, diagnosticsGuestPayload($activeWindow, $department, $course));

    $endedUser = User::factory()->create([
        'email' => 'ended.window@example.com',
        'student_id' => '2020-0003',
    ]);
    $workflow->createApplicationForUser($endedUser, [
        ...diagnosticsGuestPayload($endedWindow, $department, $course),
        'email' => 'ended.window@example.com',
        'student_id' => '2020-0003',
    ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedWindowId', $activeWindow->id)
            ->where('applicationMetrics.totalApplications', 1)
            ->where('applicationMetricsScope', $activeWindow->title)
            ->has('applicationWindows', 2)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.dashboard', ['window_id' => $endedWindow->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedWindowId', $endedWindow->id)
            ->where('applicationMetrics.totalApplications', 1)
            ->where('applicationMetricsScope', $endedWindow->title)
        );
});

test('developer can see tracking details and manually verify a guest draft', function () {
    Notification::fake();

    [$developer] = diagnosticsConfirmedDeveloper();
    [$window, $department, $course] = diagnosticsGuestCatalog();

    $this->post(route('apply.store'), diagnosticsGuestPayload($window, $department, $course));

    $draft = GuestApplicationDraft::firstOrFail();

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('manualVerificationDrafts', 1)
            ->where('manualVerificationDrafts.0.id', $draft->id)
            ->where('manualVerificationDrafts.0.tracking_code', $draft->tracking_code)
            ->where('manualVerificationDrafts.0.tracking_pin', $draft->tracking_pin)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->post(route('developer.drafts.verify', $draft))
        ->assertRedirect();

    $draft->refresh();

    expect($draft->verified_at)->not->toBeNull()
        ->and($draft->application_id)->not->toBeNull()
        ->and(Application::count())->toBe(1);

    $draft->load('application');

    Notification::assertSentTo($draft->fresh(), GuestApplicationAccessNotification::class);

    $this->assertDatabaseHas('system_events', [
        'module' => 'graduation_application',
        'action' => 'developer.draft.manually_verified',
        'actor_guard' => 'developer',
    ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('manualVerificationDrafts', 0)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.manual-verification', ['search' => $draft->tracking_code, 'window_id' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('manualVerificationDrafts', 1)
            ->where('manualVerificationDrafts.0.id', $draft->id)
            ->where('manualVerificationDrafts.0.verification_status', 'verified')
            ->where('manualVerificationDrafts.0.application_edit_url', route('developer.applications.edit', $draft->application, absolute: false))
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.manual-verification', ['search' => $draft->application->application_number, 'window_id' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('applicationSearchResults', 1)
            ->where('applicationSearchResults.0.application_number', $draft->application->application_number)
            ->where('applicationSearchResults.0.edit_url', route('developer.applications.edit', $draft->application, absolute: false))
        );
});

test('system event logger redacts sensitive metadata', function () {
    app(SystemEventLogger::class)->log(
        module: 'test',
        action: 'redaction.checked',
        message: 'Testing redaction.',
        meta: [
            'password' => 'secret',
            'tracking_pin' => '123456',
            'access_url' => 'https://example.com/signed-url',
            'requirement_key' => 'tor',
            'download_message' => 'url=https://example.test/file?signature=abc123&expires=999',
        ],
    );

    $event = SystemEvent::firstOrFail();

    expect($event->meta['password'])->toBe('[redacted]')
        ->and($event->meta['tracking_pin'])->toBe('[redacted]')
        ->and($event->meta['access_url'])->toBe('[redacted]')
        ->and($event->meta['requirement_key'])->toBe('tor')
        ->and($event->meta['download_message'])->toBe('url=https://example.test/file?signature=[redacted]&expires=[redacted]');
});

test('guest application creation writes student guest audit events', function () {
    Notification::fake();

    [$window, $department, $course] = diagnosticsGuestCatalog();

    $this->post(route('apply.store'), diagnosticsGuestPayload($window, $department, $course));

    $draft = GuestApplicationDraft::firstOrFail();

    $this->assertDatabaseHas('system_events', [
        'module' => 'graduation_application',
        'action' => 'guest.draft.created',
        'actor_guard' => 'student_guest',
        'actor_type' => GuestApplicationDraft::class,
        'actor_id' => $draft->id,
    ]);
});

test('developer can export filtered system events', function () {
    [$developer] = diagnosticsConfirmedDeveloper();

    SystemEvent::create([
        'module' => 'graduation_application',
        'action' => 'guest.draft.created',
        'status' => 'success',
        'severity' => 'info',
        'message' => 'Guest draft created.',
        'created_at' => now(),
    ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.events.export', ['module' => 'graduation_application']))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=utf-8');
});
