<?php

use App\Exports\WindowApplicationsExport;
use App\Models\Application;
use App\Models\ApplicationRequirement;
use App\Models\ApplicationWindow;
use App\Models\Course;
use App\Models\Department;
use App\Models\GuestApplicationDraft;
use App\Models\User;
use App\Notifications\GuestApplicationAccessNotification;
use App\Notifications\GuestApplicationVerificationNotification;
use App\Support\GraduateExportData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Maatwebsite\Excel\Excel as ExcelFormat;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    Storage::disk('local')->deleteDirectory('application-pdf-cache');
});

function guestApplicationCatalog(): array
{
    $window = ApplicationWindow::create([
        'title' => 'March 2026 Graduation',
        'description' => 'Active graduation window for guest flow tests.',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDay(),
    ]);

    $department = Department::create([
        'name' => 'College of Education',
        'code' => 'COED',
        'description' => 'Testing department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of Secondary Education',
        'code' => 'BSED',
        'description' => 'Testing course',
        'is_active' => true,
    ]);

    return [$window, $department, $course];
}

function guestApplicationPayload(ApplicationWindow $window, Department $department, Course $course, array $overrides = []): array
{
    return array_merge([
        'window_id' => $window->id,
        'email' => 'guest.student@example.com',
        'student_id' => '2020-0001',
        'last_name' => 'Santos',
        'first_name' => 'Andrea',
        'middle_name' => 'Lopez',
        'suffix' => 'Jr.',
        'date_of_birth' => '1999-05-15',
        'place_of_birth' => 'Tuguegarao City',
        'sex' => 'Female',
        'civil_status' => 'Single',
        'religion' => 'Catholic',
        'nationality' => 'Filipino',
        'permanent_address' => '123 Mabini Street, Tuguegarao City',
        'contact_number' => '0917-123-4567',
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
        'shs_11_school' => 'Senior High 11',
        'shs_11_year' => 2015,
        'shs_12_school' => 'Senior High 12',
        'shs_12_year' => 2016,
        'college_degree' => 'Bachelor of Arts in English',
        'college_school_name' => 'St. Paul University Philippines',
        'college_year_graduated' => 2020,
        'is_transferee' => false,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'graduate_subjects' => [],
        'subject_enrollments' => [],
    ], $overrides);
}

function guestApplicationForDocx(array $overrides = []): Application
{
    [$window, $department, $course] = guestApplicationCatalog();

    $payload = guestApplicationPayload($window, $department, $course, $overrides);
    $user = User::factory()->create([
        'email' => $payload['email'],
        'student_id' => $payload['student_id'],
    ]);

    return app(\App\Support\ApplicationWorkflowService::class)
        ->createApplicationForUser($user, $payload);
}

function guestApplicationDocxXml(Application $application): string
{
    $method = new ReflectionMethod(\App\Http\Controllers\ApplicationController::class, 'buildApplicationDocx');
    $method->setAccessible(true);

    $docx = $method->invoke(null, $application);
    $zip = new ZipArchive;

    try {
        $zip->open($docx['path']);

        return (string) $zip->getFromName('word/document.xml');
    } finally {
        $zip->close();
        @unlink($docx['path']);
    }
}

function freeConvertJobPayload(string $jobId): array
{
    return [
        'id' => $jobId,
        'status' => 'created',
        'tasks' => [
            [
                'name' => 'import-docx',
                'operation' => 'import/upload',
                'result' => [
                    'form' => [
                        'url' => "https://upload.freeconvert.test/api/upload/{$jobId}",
                        'parameters' => [
                            'signature' => 'signed-upload',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'convert-pdf',
                'operation' => 'convert',
                'status' => 'processing',
            ],
            [
                'name' => 'export-pdf',
                'operation' => 'export/url',
                'status' => 'processing',
            ],
        ],
    ];
}

function freeConvertCompletedJobPayload(string $jobId): array
{
    return [
        'id' => $jobId,
        'status' => 'completed',
        'tasks' => [
            [
                'name' => 'export-pdf',
                'operation' => 'export/url',
                'status' => 'completed',
                'result' => [
                    'url' => "https://download.freeconvert.test/{$jobId}/result.pdf",
                ],
            ],
        ],
    ];
}

test('guest submit stores a draft and sends verification without creating real applications', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $response = $this->post(route('apply.store'), $payload);

    $draft = GuestApplicationDraft::first();

    $response->assertRedirect(route('apply.pending.show', $draft, absolute: false));
    expect($draft)->not->toBeNull();
    expect($draft->verified_at)->toBeNull();
    expect($draft->tracking_code)->toMatch('/^TRK-MARCH-2026-GRADUATION-[A-Z0-9]{6}$/');
    expect($draft->tracking_pin)->toMatch('/^\d{6}$/');
    expect($draft->payload['last_name'])->toBe('Santos');
    expect($draft->payload['contact_number'])->toBe('09171234567');
    expect(Application::count())->toBe(0);
    expect(ApplicationRequirement::count())->toBe(0);
    expect(User::count())->toBe(0);
    Notification::assertSentTo($draft, GuestApplicationVerificationNotification::class, function (GuestApplicationVerificationNotification $notification, array $channels) use ($draft) {
        $mail = $notification->toMail($draft);

        return in_array('mail', $channels, true)
            && str_contains($mail->subject, $draft->tracking_code)
            && collect($mail->introLines)->contains(fn (string $line) => str_contains($line, $draft->tracking_code))
            && collect($mail->introLines)->contains(fn (string $line) => str_contains($line, $draft->tracking_pin));
    });
});

test('guest submit treats blank graduate subject units as zero', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();

    $this->post(route('apply.store'), guestApplicationPayload($window, $department, $course, [
        'graduate_subjects' => [
            [
                'subject_code' => 'AAN 207',
                'subject_title' => 'Capstone Project',
                'units' => '',
            ],
        ],
    ]))->assertRedirect();

    $draft = GuestApplicationDraft::firstOrFail();

    expect($draft->payload['graduate_subjects'][0]['units'])->toBe(0);
});

test('guest application docx keeps short college degree and school on one line', function () {
    $application = guestApplicationForDocx([
        'college_degree' => 'BSIT',
        'college_school_name' => 'SPUP',
    ]);

    $xml = guestApplicationDocxXml($application);

    expect($xml)->toContain('BSIT - SPUP')
        ->not->toMatch('/BSIT.*<w:br\/>.*SPUP/s');
});

test('guest application docx keeps long college degree and school together for natural wrapping', function () {
    $degree = 'Bachelor of Science in Hospitality Management';
    $school = 'International College of Hospitality and Tourism';
    $application = guestApplicationForDocx([
        'college_degree' => $degree,
        'college_school_name' => $school,
    ]);

    $xml = guestApplicationDocxXml($application);

    expect($xml)->toContain("{$degree} - {$school}")
        ->not->toMatch('/Bachelor of Science in Hospitality Management.*<w:br\/>.*International College of Hospitality and Tourism/s');
});

test('guest application docx omits school name for spup college graduates', function () {
    $application = guestApplicationForDocx([
        'college_degree' => 'Bachelor of Science in Nursing',
        'college_school_name' => 'St. Paul University Philippines Main Campus Should Not Print',
        'is_transferee' => true,
    ]);

    $xml = guestApplicationDocxXml($application);

    expect($xml)->toContain('Bachelor of Science in Nursing')
        ->not->toContain('Main Campus Should Not Print');
});

test('guest application docx compacts long fixed-line values', function () {
    $application = guestApplicationForDocx([
        'place_of_birth' => 'CVMC, Regional Government Center, Dalan na Pagayaya, Carig Sur, Tuguegarao City, 3500 Cagayan',
        'graduate_subjects' => [
            [
                'subject_code' => 'MBA 201A',
                'subject_title' => 'Good Governance for Business Sustainability',
                'units' => 3,
            ],
        ],
    ]);

    $xml = guestApplicationDocxXml($application);

    expect($xml)
        ->toContain('Regional Government Center')
        ->toContain('Good Governance for Business Sustainability')
        ->toMatch('/<w:w w:val="76"\/>.*Regional Government Center/s')
        ->toMatch('/<w:w w:val="84"\/>.*Good Governance for Business Sustainability/s');
});

test('student application edit accepts method spoofed multipart payload', function () {
    $application = guestApplicationForDocx();

    $payload = guestApplicationPayload($application->window, $application->department, $application->course, [
        '_method' => 'put',
        'first_name' => 'Andrea Updated',
        'presence' => 'not attending',
    ]);

    $this->actingAs($application->user)
        ->post(route('applications.update', $application), $payload)
        ->assertRedirect(route('applications.index', absolute: false));

    expect($application->fresh()->presence)->toBe('not attending');
    expect($application->user->profile->fresh()->first_name)->toBe('Andrea Updated');
});

test('window graduate export groups records and normalizes text for reuse', function () {
    $application = guestApplicationForDocx([
        'last_name' => 'SANTOS',
        'first_name' => 'ANDREA',
        'middle_name' => 'LOPEZ',
        'thesis_dissertation_title' => 'THE IMPACT OF TESTING ON LEARNING',
        'thesis_dissertation_adviser' => 'DR. JANE DOE',
    ]);

    $data = GraduateExportData::build(
        $application->window,
        GraduateExportData::applicationsForWindow($application->window),
    );

    $graduate = $data['departments'][0]['programs'][0]['majors'][0]['thesis_groups'][0]['graduates'][0];

    expect($data['total'])->toBe(1);
    expect($graduate['name'])->toBe('Santos, Andrea Lopez Jr.');
    expect($graduate['thesis_type'])->toBe('With Thesis/Dissertation');
    expect($graduate['thesis_title'])->toBe('The Impact of Testing on Learning');
    expect($graduate['thesis_adviser'])->toBe('Dr. Jane Doe');

    $secondDepartment = Department::create([
        'name' => 'College of Information Technology',
        'code' => 'CIT',
        'description' => 'Testing department',
        'is_active' => true,
    ]);
    $secondCourse = Course::create([
        'department_id' => $secondDepartment->id,
        'name' => 'Bachelor of Science in Information Technology',
        'code' => 'BSIT',
        'description' => 'Testing course',
        'is_active' => true,
    ]);
    $secondPayload = guestApplicationPayload($application->window, $secondDepartment, $secondCourse, [
        'email' => 'second.export.student@example.com',
        'student_id' => '2020-0002',
        'last_name' => 'Reyes',
        'first_name' => 'Marco',
        'middle_name' => null,
        'date_of_birth' => '1998-08-20',
        'nationality' => 'American',
        'department_id' => $secondDepartment->id,
        'course_id' => $secondCourse->id,
        'degree_title' => $secondCourse->name,
        'presence' => 'not attending',
    ]);
    $secondUser = User::factory()->create([
        'email' => $secondPayload['email'],
        'student_id' => $secondPayload['student_id'],
    ]);
    app(\App\Support\ApplicationWorkflowService::class)
        ->createApplicationForUser($secondUser, $secondPayload);

    $xlsx = Excel::raw(new WindowApplicationsExport($application->window_id), ExcelFormat::XLSX);
    $tempFile = tempnam(sys_get_temp_dir(), 'graduate-export-');
    file_put_contents($tempFile, $xlsx);
    $spreadsheet = IOFactory::load($tempFile);

    expect(strlen($xlsx))->toBeGreaterThan(1000);

    try {
        expect($spreadsheet->getSheetNames())->toContain('Application Summary', 'COED', 'CIT');

        $summary = $spreadsheet->getSheetByName('Application Summary');
        expect($summary->getCell('A7')->getValue())->toBe('Level');

        $summaryDepartments = [];
        for ($row = 8; $row <= $summary->getHighestRow(); $row++) {
            if ($summary->getCell("A{$row}")->getValue() === 'Department') {
                $summaryDepartments[] = $summary->getCell("B{$row}")->getValue();
            }
        }
        expect($summaryDepartments)->toContain('COED', 'CIT');

        $coedSheet = $spreadsheet->getSheetByName('COED');
        $headerRow = null;
        for ($row = 1; $row <= $coedSheet->getHighestRow(); $row++) {
            if ($coedSheet->getCell("A{$row}")->getValue() === 'No.') {
                $headerRow = $row;

                break;
            }
        }

        expect($headerRow)->not->toBeNull()
            ->and($coedSheet->getCell("E{$headerRow}")->getValue())->toBe('Birthday')
            ->and($coedSheet->getCell("F{$headerRow}")->getValue())->toBe('Nationality')
            ->and($coedSheet->getCell("N{$headerRow}")->getValue())->toBe('Application Status')
            ->and($coedSheet->getCell('E'.($headerRow + 1))->getValue())->toBe('1999-05-15')
            ->and($coedSheet->getCell('F'.($headerRow + 1))->getValue())->toBe('Philippines')
            ->and($coedSheet->getCell('N'.($headerRow + 1))->getValue())->not->toBe('');
    } finally {
        @unlink($tempFile);
    }
});

test('guest submit rejects college export fields beyond the fixed space limit', function () {
    [$window, $department, $course] = guestApplicationCatalog();

    $this->post(route('apply.store'), guestApplicationPayload($window, $department, $course, [
        'college_degree' => str_repeat('A', 86),
        'college_school_name' => str_repeat('B', 86),
    ]))
        ->assertSessionHasErrors(['college_degree', 'college_school_name']);

    expect(GuestApplicationDraft::count())->toBe(0);
});

test('repeating guest submit for the same email and window reuses the existing draft without overwriting payload', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();

    $firstPayload = guestApplicationPayload($window, $department, $course, [
        'last_name' => 'Original',
    ]);
    $secondPayload = guestApplicationPayload($window, $department, $course, [
        'last_name' => 'Changed',
    ]);

    $this->post(route('apply.store'), $firstPayload);
    $draft = GuestApplicationDraft::firstOrFail();

    $this->post(route('apply.store'), $secondPayload)
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    expect(GuestApplicationDraft::count())->toBe(1);
    expect($draft->fresh()->payload['last_name'])->toBe('Original');
    expect(Application::count())->toBe(0);
});

test('guest can change email before verification and the old verification link stops working', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $oldVerificationUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->post(route('apply.pending.change-email', $draft), [
        'email' => 'updated.email@example.com',
    ])->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    expect($draft->fresh()->email)->toBe('updated.email@example.com');

    $this->get($oldVerificationUrl)->assertForbidden();
    Notification::assertSentTo($draft->fresh(), GuestApplicationVerificationNotification::class);
});

test('expired guest verification links redirect back to the pending screen', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'expired.verify@example.com',
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $expiredVerificationUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->subMinute(),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($expiredVerificationUrl)
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false))
        ->assertSessionHas('error', 'This verification link has expired. Please request a fresh verification email below.');

    expect($draft->fresh()->verified_at)->toBeNull()
        ->and(Application::count())->toBe(0);
});

test('relative signed guest verification links finalize applications', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'relative.verify@example.com',
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $relativeVerificationUrl = (new GuestApplicationVerificationNotification($draft))
        ->toMail($draft)
        ->actionUrl;

    $this->get($relativeVerificationUrl)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('apply/verified')
            ->where('draft.id', $draft->id)
            ->where('alreadyVerified', false)
        );

    expect($draft->fresh()->verified_at)->not->toBeNull()
        ->and(Application::count())->toBe(1);
});

test('guest can change email to the same student email from a previous window', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();

    $pastWindow = ApplicationWindow::create([
        'title' => 'January 2026 Graduation',
        'description' => 'Past graduation window.',
        'start_date' => now()->subMonths(2),
        'end_date' => now()->subMonth(),
    ]);

    $user = User::factory()->create([
        'email' => 'same.student.previous@example.com',
        'student_id' => '2020-0099',
    ]);

    $user->applications()->create([
        'window_id' => $pastWindow->id,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'status' => 'approved',
    ]);

    $this->post(route('apply.store'), guestApplicationPayload($window, $department, $course, [
        'email' => 'temporary.wrong@example.com',
        'student_id' => '2020-0099',
    ]));

    $draft = GuestApplicationDraft::firstOrFail();

    $this->post(route('apply.pending.change-email', $draft), [
        'email' => 'same.student.previous@example.com',
    ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    expect($draft->fresh()->email)->toBe('same.student.previous@example.com');
});

test('guest change email still rejects current window email duplicates', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();

    $existingUser = User::factory()->create([
        'email' => 'current.window@example.com',
        'student_id' => '2020-0088',
    ]);

    $existingUser->applications()->create([
        'window_id' => $window->id,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'status' => 'approved',
    ]);

    $this->post(route('apply.store'), guestApplicationPayload($window, $department, $course, [
        'email' => 'needs.correction@example.com',
        'student_id' => '2020-0077',
    ]));

    $draft = GuestApplicationDraft::where('email', 'needs.correction@example.com')->firstOrFail();

    $this->post(route('apply.pending.change-email', $draft), [
        'email' => 'current.window@example.com',
    ])->assertSessionHasErrors(['email']);

    expect($draft->fresh()->email)->toBe('needs.correction@example.com');
});

test('profile photo download resolves legacy storage-prefixed paths', function () {
    Storage::fake('public');

    $application = guestApplicationForDocx();
    Storage::disk('public')->put('profile-photos/legacy.JPG', 'legacy photo body');

    $application->user->profile->update([
        'photo_path' => 'storage/profile-photos/legacy.JPG',
    ]);

    $response = \App\Http\Controllers\ApplicationController::generateProfilePhotoDownload($application);

    expect($response->getFile()->getPathname())->toBe(Storage::disk('public')->path('profile-photos/legacy.JPG'));
    expect($response->headers->get('content-disposition'))->toContain('Andrea Lopez Santos Jr.jpg');
    expect($application->user->profile->fresh()->photo_url)->toContain('/storage/profile-photos/legacy.JPG');
});

test('verifying a guest draft creates the real records and exposes the guest handoff flow until the access link is opened', function () {
    Notification::fake();
    Storage::fake('public');

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'photo' => UploadedFile::fake()->image('student-photo.jpg', 400, 400),
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $verifyResponse = $this->get($verifyUrl);

    $draft->refresh();
    $user = User::first();
    $application = Application::first();
    $accessUrl = null;

    expect($draft->verified_at)->not->toBeNull();
    expect($user)->not->toBeNull();
    expect($user->email)->toBe($payload['email']);
    expect($user->student_id)->toBe($payload['student_id']);
    expect($user->profile)->not->toBeNull();
    expect($user->profile->suffix)->toBe($payload['suffix']);
    expect($user->profile->contact_number)->toBe('09171234567');
    expect($user->profile->photo_path)->not->toBeNull();
    expect(Storage::disk('public')->exists($user->profile->photo_path))->toBeTrue();
    expect($application)->not->toBeNull();
    expect($application->window_id)->toBe($window->id);
    expect($draft->application_id)->toBe($application->id);
    expect(ApplicationRequirement::count())->toBeGreaterThan(0);
    Notification::assertSentTo($draft, GuestApplicationAccessNotification::class, function (GuestApplicationAccessNotification $notification, array $channels) use ($draft, $application, &$accessUrl) {
        $mail = $notification->toMail($draft->fresh());
        $accessUrl = $mail->actionUrl;

        return in_array('mail', $channels, true)
            && str_contains($mail->subject, $draft->tracking_code)
            && collect($mail->introLines)->contains(fn (string $line) => str_contains($line, $draft->tracking_code))
            && collect($mail->introLines)->contains(fn (string $line) => str_contains($line, $draft->tracking_pin))
            && collect($mail->outroLines)->contains(fn (string $line) => str_contains($line, $application->application_number));
    });
    $verifyResponse
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('apply/verified')
            ->where('draft.id', $draft->id)
            ->where('draft.tracking_code', $draft->tracking_code)
            ->where('draft.tracking_pin', $draft->tracking_pin)
            ->where('alreadyVerified', false)
            ->where('draft.access_url', fn (string $url) => str_contains($url, "/apply/access/{$draft->id}"))
        );

    $this->get(route('apply.portal.show', $application->application_number))
        ->assertRedirect(route('apply.index', absolute: false));

    expect($accessUrl)->not->toBeNull();

    $this->get(route('apply.pending.show', $draft))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('apply/pending')
            ->where('draft.tracking_code', $draft->tracking_code)
            ->where('draft.tracking_pin', $draft->tracking_pin)
            ->where('draft.verified_at', fn (?string $verifiedAt) => $verifiedAt !== null)
            ->where('draft.access_url', fn (string $url) => str_contains($url, "/apply/access/{$draft->id}"))
        );

    $this->get($accessUrl)
        ->assertRedirect(route('apply.portal.show', $application->application_number, absolute: false));

    $this->get(route('apply.portal.show', $application->application_number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applications/show')
            ->where('tracking.tracking_code', $draft->tracking_code)
            ->where('tracking.tracking_pin', $draft->tracking_pin)
        );
});

test('guest portal downloads the generated application as a pdf', function () {
    Notification::fake();
    config([
        'services.freeconvert.api_keys' => ['test-freeconvert-key'],
        'services.freeconvert.base_url' => 'https://api.freeconvert.test/v1',
        'services.freeconvert.timeout' => 30,
        'services.freeconvert.poll_interval' => 1,
        'services.freeconvert.max_attempts' => 1,
        'services.freeconvert.retry_delay_ms' => 1,
    ]);
    Http::fake(function ($request) {
        $url = (string) $request->url();

        if ($request->method() === 'POST' && $url === 'https://api.freeconvert.test/v1/process/jobs') {
            return Http::response(freeConvertJobPayload('job-123'), 201);
        }

        if ($request->method() === 'POST' && $url === 'https://upload.freeconvert.test/api/upload/job-123') {
            return Http::response(['ok' => true]);
        }

        if ($request->method() === 'GET' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-123') {
            return Http::response(freeConvertCompletedJobPayload('job-123'));
        }

        if ($request->method() === 'GET' && $url === 'https://download.freeconvert.test/job-123/result.pdf') {
            return Http::response('%PDF-1.4 test pdf body', 200, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        if ($request->method() === 'DELETE' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-123') {
            return Http::response([], 204);
        }

        return Http::response([], 404);
    });

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($verifyUrl);

    $draft->refresh();
    $application = Application::findOrFail($draft->application_id);
    $accessUrl = URL::temporarySignedRoute(
        'apply.access',
        now()->addDays(30),
        ['draft' => $draft->id],
    );

    $this->get($accessUrl)
        ->assertRedirect(route('apply.portal.show', $application->application_number, absolute: false));

    $response = $this->get(route('apply.portal.download', $application->application_number));
    $response->assertDownload('GraduationApplication_Andrea_L_Santos_Jr.pdf');
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect(str_starts_with((string) file_get_contents($response->baseResponse->getFile()->getPathname()), '%PDF'))->toBeTrue();
});

test('application pdf export retries transient freeconvert failures before succeeding', function () {
    config([
        'services.freeconvert.api_keys' => ['retry-freeconvert-key'],
        'services.freeconvert.base_url' => 'https://api.freeconvert.test/v1',
        'services.freeconvert.timeout' => 30,
        'services.freeconvert.poll_interval' => 1,
        'services.freeconvert.max_attempts' => 2,
        'services.freeconvert.retry_delay_ms' => 1,
    ]);

    $jobCreationTokens = [];

    Http::fake(function ($request) use (&$jobCreationTokens) {
        $url = (string) $request->url();

        if ($request->method() === 'POST' && $url === 'https://api.freeconvert.test/v1/process/jobs') {
            $jobCreationTokens[] = $request->header('Authorization')[0] ?? '';

            if (count($jobCreationTokens) === 1) {
                return Http::response(['message' => 'temporary upstream failure'], 503);
            }

            return Http::response(freeConvertJobPayload('job-retry'), 201);
        }

        if ($request->method() === 'POST' && $url === 'https://upload.freeconvert.test/api/upload/job-retry') {
            return Http::response(['ok' => true]);
        }

        if ($request->method() === 'GET' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-retry') {
            return Http::response(freeConvertCompletedJobPayload('job-retry'));
        }

        if ($request->method() === 'GET' && $url === 'https://download.freeconvert.test/job-retry/result.pdf') {
            return Http::response('%PDF-1.4 retry pdf body', 200, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        if ($request->method() === 'DELETE' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-retry') {
            return Http::response([], 204);
        }

        return Http::response([], 404);
    });

    $application = guestApplicationForDocx();
    $response = \App\Http\Controllers\ApplicationController::generatePdf($application);
    $pdfPath = $response->getFile()->getPathname();

    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect(str_starts_with((string) file_get_contents($pdfPath), '%PDF-1.4 retry pdf body'))->toBeTrue();
    expect($jobCreationTokens)->toBe([
        'Bearer retry-freeconvert-key',
        'Bearer retry-freeconvert-key',
    ]);
});

test('application export rotates through configured freeconvert api keys', function () {
    config([
        'services.freeconvert.api_keys' => ['first-freeconvert-key', 'second-freeconvert-key'],
        'services.freeconvert.base_url' => 'https://api.freeconvert.test/v1',
        'services.freeconvert.timeout' => 30,
        'services.freeconvert.poll_interval' => 1,
        'services.freeconvert.max_attempts' => 1,
        'services.freeconvert.retry_delay_ms' => 1,
    ]);

    $jobCreationTokens = [];

    Http::fake(function ($request) use (&$jobCreationTokens) {
        $url = (string) $request->url();

        if ($request->method() === 'POST' && $url === 'https://api.freeconvert.test/v1/process/jobs') {
            $jobCreationTokens[] = $request->header('Authorization')[0] ?? '';

            if (count($jobCreationTokens) === 1) {
                return Http::response([
                    'message' => 'rate limit exceeded',
                ], 429);
            }

            return Http::response(freeConvertJobPayload('job-rotated'), 201);
        }

        if ($request->method() === 'POST' && $url === 'https://upload.freeconvert.test/api/upload/job-rotated') {
            return Http::response(['ok' => true]);
        }

        if ($request->method() === 'GET' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-rotated') {
            return Http::response(freeConvertCompletedJobPayload('job-rotated'));
        }

        if ($request->method() === 'GET' && $url === 'https://download.freeconvert.test/job-rotated/result.pdf') {
            return Http::response('%PDF-1.4 rotated freeconvert pdf body', 200, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        if ($request->method() === 'DELETE' && $url === 'https://api.freeconvert.test/v1/process/jobs/job-rotated') {
            return Http::response([], 204);
        }

        return Http::response([], 404);
    });

    $application = guestApplicationForDocx();
    $response = \App\Http\Controllers\ApplicationController::generatePdf($application);
    $pdfPath = $response->getFile()->getPathname();

    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect(str_starts_with((string) file_get_contents($pdfPath), '%PDF-1.4 rotated freeconvert pdf body'))->toBeTrue();
    expect($jobCreationTokens)->toBe([
        'Bearer first-freeconvert-key',
        'Bearer second-freeconvert-key',
    ]);
});

test('freeconvert timeout is capped below php max execution time for shared hosting', function () {
    config([
        'services.freeconvert.timeout' => 60,
    ]);

    $method = new ReflectionMethod(\App\Http\Controllers\ApplicationController::class, 'freeConvertTimeout');
    $method->setAccessible(true);
    $previousMaxExecutionTime = ini_get('max_execution_time');

    try {
        ini_set('max_execution_time', '30');

        expect($method->invoke(null))->toBe(25);
    } finally {
        ini_set('max_execution_time', (string) $previousMaxExecutionTime);
    }
});

test('application pdf export reuses cached conversion until application data changes', function () {
    config([
        'services.freeconvert.api_keys' => ['cache-freeconvert-key'],
        'services.freeconvert.base_url' => 'https://api.freeconvert.test/v1',
        'services.freeconvert.timeout' => 30,
        'services.freeconvert.poll_interval' => 1,
        'services.freeconvert.max_attempts' => 1,
        'services.freeconvert.retry_delay_ms' => 1,
    ]);

    $conversionRequests = 0;

    Http::fake(function ($request) use (&$conversionRequests) {
        $url = (string) $request->url();

        if ($request->method() === 'POST' && $url === 'https://api.freeconvert.test/v1/process/jobs') {
            $conversionRequests++;

            return Http::response(freeConvertJobPayload('job-'.$conversionRequests), 201);
        }

        if ($request->method() === 'POST' && str_starts_with($url, 'https://upload.freeconvert.test/api/upload/job-')) {
            return Http::response(['ok' => true]);
        }

        if ($request->method() === 'GET' && preg_match('/^https:\/\/api\.freeconvert\.test\/v1\/process\/jobs\/job-(\d+)$/', $url, $matches) === 1) {
            return Http::response(freeConvertCompletedJobPayload('job-'.$matches[1]));
        }

        if ($request->method() === 'GET' && preg_match('/^https:\/\/download\.freeconvert\.test\/job-(\d+)\/result\.pdf$/', $url, $matches) === 1) {
            return Http::response('%PDF-1.4 cached pdf body '.$matches[1], 200, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        if ($request->method() === 'DELETE' && str_starts_with($url, 'https://api.freeconvert.test/v1/process/jobs/job-')) {
            return Http::response([], 204);
        }

        return Http::response([], 404);
    });

    $application = guestApplicationForDocx();

    $first = \App\Http\Controllers\ApplicationController::generatePdf($application);
    expect((string) file_get_contents($first->getFile()->getPathname()))->toContain('cached pdf body 1');

    $second = \App\Http\Controllers\ApplicationController::generatePdf($application->fresh());
    expect($conversionRequests)->toBe(1);
    expect((string) file_get_contents($second->getFile()->getPathname()))->toContain('cached pdf body 1');

    $application->update(['presence' => 'not attending']);

    $third = \App\Http\Controllers\ApplicationController::generatePdf($application->fresh());
    expect($conversionRequests)->toBe(2);
    expect((string) file_get_contents($third->getFile()->getPathname()))->toContain('cached pdf body 2');
});

test('guest portal falls back to docx when freeconvert conversion fails', function () {
    Notification::fake();
    config([
        'services.freeconvert.api_keys' => ['test-freeconvert-key'],
        'services.freeconvert.base_url' => 'https://api.freeconvert.test/v1',
        'services.freeconvert.timeout' => 30,
        'services.freeconvert.poll_interval' => 1,
        'services.freeconvert.max_attempts' => 1,
        'services.freeconvert.retry_delay_ms' => 1,
    ]);
    Http::fake([
        'https://api.freeconvert.test/v1/process/jobs' => Http::response([
            'message' => 'conversion service unavailable',
        ], 503),
    ]);

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($verifyUrl);

    $draft->refresh();
    $application = Application::findOrFail($draft->application_id);
    $accessUrl = URL::temporarySignedRoute(
        'apply.access',
        now()->addDays(30),
        ['draft' => $draft->id],
    );

    $this->get($accessUrl)
        ->assertRedirect(route('apply.portal.show', $application->application_number, absolute: false));

    $response = $this->get(route('apply.portal.download', $application->application_number));
    $response->assertDownload('GraduationApplication_Andrea_L_Santos_Jr.docx');
    expect($response->headers->get('content-type'))->toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

test('public tracking lookup redirects to the guest status page when tracking code and pin match', function () {
    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $this->post(route('apply.track'), [
        'tracking_code' => strtolower($draft->tracking_code),
        'tracking_pin' => $draft->tracking_pin,
    ])->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    $this->get(route('apply.pending.show', $draft))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('apply/pending')
            ->where('draft.email', $draft->email)
            ->where('draft.tracking_code', $draft->tracking_code)
            ->where('draft.tracking_pin', $draft->tracking_pin)
            ->where('draft.verified_at', null)
        );
});

test('public tracking lookup redirects verified applications directly to the guest portal', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($verifyUrl);

    $draft->refresh();
    $application = Application::findOrFail($draft->application_id);

    $this->post(route('apply.track'), [
        'tracking_code' => strtolower($draft->tracking_code),
        'tracking_pin' => $draft->tracking_pin,
    ])->assertRedirect(route('apply.portal.show', $application->application_number, absolute: false));

    $this->get(route('apply.portal.show', $application->application_number))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('applications/show')
            ->where('application.application_number', $application->application_number)
            ->where('portalMode', 'guest')
        );
});

test('tracking recovery by email resends the verification details for an unverified draft', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'recover.pending@example.com',
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    Notification::fake();

    $this->post(route('apply.track.recover'), [
        'email' => strtoupper($draft->email),
    ])
        ->assertRedirect(route('home', absolute: false))
        ->assertSessionHas('success', 'If we found an application for that email, we sent your tracking details and the next link to continue.');

    Notification::assertSentTo($draft->fresh(), GuestApplicationVerificationNotification::class);
});

test('tracking recovery by email resends the guest access email for a verified application', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'recover.verified@example.com',
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($verifyUrl);

    Notification::fake();

    $this->post(route('apply.track.recover'), [
        'email' => $draft->fresh()->email,
    ])
        ->assertRedirect(route('home', absolute: false))
        ->assertSessionHas('success', 'If we found an application for that email, we sent your tracking details and the next link to continue.');

    Notification::assertSentTo($draft->fresh(), GuestApplicationAccessNotification::class);
});

test('legacy tracking codes remain usable once a tracking pin exists', function () {
    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();
    $draft->forceFill([
        'tracking_code' => 'TRK-2026-ABC123',
    ])->save();

    $this->post(route('apply.track'), [
        'tracking_code' => 'trk-2026-abc123',
        'tracking_pin' => $draft->tracking_pin,
    ])->assertRedirect(route('apply.pending.show', $draft, absolute: false));
});

test('guest submit can reuse a previous window account with a new email', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();

    $pastWindow = ApplicationWindow::create([
        'title' => 'January 2026 Graduation',
        'description' => 'Past graduation window.',
        'start_date' => now()->subMonths(2),
        'end_date' => now()->subMonth(),
    ]);

    $user = User::factory()->create([
        'email' => 'previous.email@example.com',
        'student_id' => '2020-0009',
    ]);

    $user->applications()->create([
        'window_id' => $pastWindow->id,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'status' => 'approved',
    ]);

    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'current.email@example.com',
        'student_id' => '2020-0009',
    ]);

    $this->post(route('apply.store'), $payload)
        ->assertSessionHasNoErrors();

    $draft = GuestApplicationDraft::firstOrFail();

    $verifyUrl = URL::temporarySignedRoute(
        'apply.verify',
        now()->addMinutes(config('auth.verification.expire', 60)),
        ['draft' => $draft->id, 'hash' => sha1($draft->email)],
    );

    $this->get($verifyUrl)->assertOk();

    expect(User::count())->toBe(1);
    expect($user->fresh()->email)->toBe('current.email@example.com');
    expect($user->applications()->where('window_id', $window->id)->exists())->toBeTrue();
});

test('guest submit rejects student id duplicates in the current window', function () {
    [$window, $department, $course] = guestApplicationCatalog();

    $user = User::factory()->create([
        'email' => 'registered.student@example.com',
        'student_id' => '2020-0009',
    ]);

    $user->applications()->create([
        'window_id' => $window->id,
        'department_id' => $department->id,
        'course_id' => $course->id,
        'major' => null,
        'degree_title' => $course->name,
        'presence' => 'attending',
        'status' => 'approved',
    ]);

    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'other.email@example.com',
        'student_id' => '2020-0009',
    ]);

    $this->post(route('apply.store'), $payload)
        ->assertSessionHasErrors(['student_id']);

    expect(GuestApplicationDraft::count())->toBe(0);
    expect(Application::count())->toBe(1);
});

test('guest resend verification uses the guest-specific throttle with a friendly redirect', function () {
    Notification::fake();

    [$window, $department, $course] = guestApplicationCatalog();
    $payload = guestApplicationPayload($window, $department, $course, [
        'email' => 'resend.student@example.com',
    ]);

    $this->post(route('apply.store'), $payload);
    $draft = GuestApplicationDraft::firstOrFail();
    RateLimiter::clear("guest-application-resend:burst:{$draft->id}:127.0.0.1");
    RateLimiter::clear('guest-application-resend:window:resend.student@example.com:127.0.0.1');

    $this->post(route('apply.pending.resend', $draft))
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    $this->post(route('apply.pending.resend', $draft))
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false));

    $this->post(route('apply.pending.resend', $draft))
        ->assertRedirect(route('apply.pending.show', $draft, absolute: false))
        ->assertSessionHas('error', 'Please wait about a minute before requesting another email.');
});
