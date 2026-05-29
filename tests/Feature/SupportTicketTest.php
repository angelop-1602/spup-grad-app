<?php

use App\Models\Admin;
use App\Models\Developer;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

function supportConfirmedDeveloper(): Developer
{
    $secret = app(TwoFactorAuthenticationProvider::class)->generateSecretKey();

    return Developer::factory()->create([
        'email' => 'support.developer@example.com',
        'password' => Hash::make('password'),
        'two_factor_secret' => Fortify::currentEncrypter()->encrypt($secret),
        'two_factor_recovery_codes' => Fortify::currentEncrypter()->encrypt(json_encode(['recovery-one'])),
        'two_factor_confirmed_at' => now(),
    ]);
}

function supportTicketPayload(array $overrides = []): array
{
    return [
        'category' => 'technical',
        'priority' => 'high',
        'subject' => 'Unable to upload requirement',
        'description' => 'The upload button stops responding after choosing a screenshot.',
        'reporter_name' => 'Guest Applicant',
        'reporter_email' => 'guest.ticket@example.com',
        'page_url' => 'https://grad.test/apply',
        ...$overrides,
    ];
}

test('guest can submit an issue report with a private screenshot', function () {
    Storage::fake('local');

    $this->from('/apply')
        ->post(route('support.issues.store'), supportTicketPayload([
            'screenshot' => UploadedFile::fake()->image('upload-error.png', 800, 500),
        ]))
        ->assertRedirect('/apply')
        ->assertSessionHas('success');

    $ticket = SupportTicket::firstOrFail();

    expect($ticket->ticket_number)->toStartWith('HD-')
        ->and($ticket->status)->toBe(SupportTicket::STATUS_OPEN)
        ->and($ticket->reporter_guard)->toBe('guest')
        ->and($ticket->screenshot_disk)->toBe('local')
        ->and($ticket->screenshot_path)->not->toBeNull();

    Storage::disk('local')->assertExists($ticket->screenshot_path);

    $this->assertDatabaseHas('system_events', [
        'module' => 'support',
        'action' => 'support.ticket.created',
        'subject_type' => SupportTicket::class,
        'subject_id' => $ticket->id,
    ]);
});

test('student issue reports are linked to the web user', function () {
    $user = User::factory()->create([
        'name' => 'Student Reporter',
        'email' => 'student.reporter@example.com',
    ]);

    $this->actingAs($user)
        ->from('/dashboard')
        ->post(route('support.issues.store'), supportTicketPayload([
            'reporter_name' => '',
            'reporter_email' => '',
        ]))
        ->assertRedirect('/dashboard');

    $this->assertDatabaseHas('support_tickets', [
        'reporter_guard' => 'student',
        'reporter_type' => User::class,
        'reporter_id' => $user->id,
        'reporter_name' => 'Student Reporter',
        'reporter_email' => 'student.reporter@example.com',
    ]);
});

test('issue report screenshot must be an allowed image type', function () {
    Storage::fake('local');

    $this->from('/apply')
        ->post(route('support.issues.store'), supportTicketPayload([
            'screenshot' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf'),
        ]))
        ->assertRedirect('/apply')
        ->assertSessionHasErrors('screenshot');

    $this->assertDatabaseCount('support_tickets', 0);
});

test('staff sessions cannot submit applicant issue reports', function () {
    $admin = Admin::create([
        'name' => 'Support Admin',
        'email' => 'support.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'admin',
    ]);

    $this->actingAs($admin, 'admin')
        ->from('/apply')
        ->post(route('support.issues.store'), supportTicketPayload())
        ->assertRedirect(route('admin.dashboard', absolute: false));

    $this->assertDatabaseCount('support_tickets', 0);
});

test('developer can view, open screenshot, and resolve a support ticket', function () {
    Storage::fake('local');
    Storage::disk('local')->put('support-ticket-screenshots/test/error.png', 'image-bytes');

    $developer = supportConfirmedDeveloper();
    $ticket = SupportTicket::factory()->create([
        'ticket_number' => 'HD-20260526-ABC123',
        'screenshot_disk' => 'local',
        'screenshot_path' => 'support-ticket-screenshots/test/error.png',
        'screenshot_original_name' => 'error.png',
        'screenshot_mime' => 'image/png',
        'screenshot_size' => 11,
    ]);

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.tickets.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/tickets/index')
            ->has('tickets.data', 1)
            ->where('tickets.data.0.ticket_number', $ticket->ticket_number)
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.tickets.show', $ticket))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('developer/tickets/show')
            ->where('ticket.ticket_number', $ticket->ticket_number)
            ->where('ticket.screenshot_url', route('developer.tickets.screenshot', $ticket, absolute: false))
        );

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->get(route('developer.tickets.screenshot', $ticket))
        ->assertOk()
        ->assertHeader('content-type', 'image/png');

    $this->actingAs($developer, 'developer')
        ->withSession(['developer.two_factor_passed' => true])
        ->post(route('developer.tickets.resolve', $ticket), [
            'resolution_note' => 'Cleared the failed upload state.',
        ])
        ->assertRedirect();

    $ticket->refresh();

    expect($ticket->status)->toBe(SupportTicket::STATUS_RESOLVED)
        ->and($ticket->resolved_at)->not->toBeNull()
        ->and($ticket->resolved_by_developer_id)->toBe($developer->id)
        ->and($ticket->resolution_note)->toBe('Cleared the failed upload state.');

    $this->assertDatabaseHas('system_events', [
        'module' => 'support',
        'action' => 'support.ticket.resolved',
        'subject_type' => SupportTicket::class,
        'subject_id' => $ticket->id,
    ]);
});

test('developer ticket routes require developer authentication', function () {
    $ticket = SupportTicket::factory()->create();

    $this->get(route('developer.tickets.index'))
        ->assertRedirect(route('developer.login', absolute: false));

    $this->get(route('developer.tickets.show', $ticket))
        ->assertRedirect(route('developer.login', absolute: false));
});

test('issue report submission is rate limited', function () {
    RateLimiter::clear('support-issues:guest:127.0.0.1');

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $this->from('/apply')
            ->post(route('support.issues.store'), supportTicketPayload([
                'subject' => "Issue attempt {$attempt}",
            ]))
            ->assertRedirect('/apply');
    }

    $this->from('/apply')
        ->post(route('support.issues.store'), supportTicketPayload([
            'subject' => 'Issue attempt 6',
        ]))
        ->assertStatus(429);
});
