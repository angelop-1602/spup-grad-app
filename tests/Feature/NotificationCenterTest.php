<?php

use App\Models\Admin;
use App\Models\Coordinator;
use App\Notifications\ApplicationSubmitted;
use App\Notifications\RequirementFileUploaded;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

function createRequirementUploadNotification(object $notifiable, array $data = []): string
{
    $id = (string) Str::uuid();

    $notifiable->notifications()->create([
        'id' => $id,
        'type' => RequirementFileUploaded::class,
        'data' => [
            'type' => 'requirement_file_uploaded',
            'application_number' => 'GA-2026-TEST01',
            'requirement_label' => 'Transcript of Records (TOR)',
            'student_name' => 'Andrea Santos',
            'student_id' => '2026-0001',
            'student_avatar' => null,
            'course_name' => 'Master of Science in Nursing',
            'department_name' => 'Graduate School',
            ...$data,
        ],
    ]);

    return $id;
}

function createApplicationSubmittedNotification(object $notifiable, array $data = []): string
{
    $id = (string) Str::uuid();

    $notifiable->notifications()->create([
        'id' => $id,
        'type' => ApplicationSubmitted::class,
        'data' => [
            'type' => 'application_submitted',
            'application_number' => 'GA-2026-NEW01',
            'student_name' => 'New Applicant',
            'student_id' => '2026-0099',
            'student_avatar' => null,
            'course_name' => 'Bachelor of Science in Information Technology',
            'department_name' => 'School of Information Technology',
            'department_code' => 'SIT',
            ...$data,
        ],
    ]);

    return $id;
}

test('admin can poll and mark all requirement upload notifications as read', function () {
    $admin = Admin::create([
        'name' => 'Notification Admin',
        'email' => 'notification.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'admin',
    ]);

    createRequirementUploadNotification($admin);
    createRequirementUploadNotification($admin, [
        'requirement_label' => 'Complete Grades',
    ]);

    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.notifications.index'))
        ->assertOk()
        ->assertJsonPath('unreadNotificationCount', 2)
        ->assertJsonPath('notifications.0.application_number', 'GA-2026-TEST01')
        ->assertJsonPath('notifications.0.upload_count', 2);

    $this->actingAs($admin, 'admin')
        ->postJson(route('admin.notifications.mark-all-as-read'))
        ->assertOk()
        ->assertJsonPath('unreadNotificationCount', 0)
        ->assertJsonCount(0, 'notifications');

    expect($admin->fresh()->unreadNotifications()->where('type', RequirementFileUploaded::class)->count())->toBe(0);
});

test('coordinator can mark a single notification as read', function () {
    $coordinator = Coordinator::factory()->create();
    $readNotificationId = createRequirementUploadNotification($coordinator);
    $remainingNotificationId = createRequirementUploadNotification($coordinator, [
        'application_number' => 'GA-2026-TEST02',
    ]);

    $this->actingAs($coordinator, 'coordinator')
        ->postJson(route('coordinator.notifications.mark-as-read', $readNotificationId))
        ->assertOk()
        ->assertJsonPath('unreadNotificationCount', 1)
        ->assertJsonPath('notifications.0.id', $remainingNotificationId);

    expect($coordinator->notifications()->find($readNotificationId)->read_at)->not->toBeNull()
        ->and($coordinator->notifications()->find($remainingNotificationId)->read_at)->toBeNull();
});

test('new application notifications are included in the notification center', function () {
    $admin = Admin::create([
        'name' => 'Application Notification Admin',
        'email' => 'application.notification.admin@example.com',
        'password' => Hash::make('password'),
        'role' => 'admin',
    ]);

    $notificationId = createApplicationSubmittedNotification($admin);

    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.notifications.index'))
        ->assertOk()
        ->assertJsonPath('unreadNotificationCount', 1)
        ->assertJsonPath('notifications.0.id', $notificationId)
        ->assertJsonPath('notifications.0.type', 'application_submitted')
        ->assertJsonPath('notifications.0.department_code', 'SIT');

    $this->actingAs($admin, 'admin')
        ->postJson(route('admin.notifications.mark-as-read', $notificationId))
        ->assertOk()
        ->assertJsonPath('unreadNotificationCount', 0);

    expect($admin->notifications()->find($notificationId)->read_at)->not->toBeNull();
});
