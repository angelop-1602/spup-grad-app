<?php

namespace App\Support;

use App\Notifications\RequirementFileUploaded;

class NotificationCenter
{
    /**
     * @return array{notifications: mixed, unreadNotificationCount: int}
     */
    public function payloadFor(object $notifiable): array
    {
        $unreadNotifications = $this->unreadRequirementUploads($notifiable)->get();

        $countsByApplication = $unreadNotifications
            ->groupBy(fn ($notification) => $notification->data['application_number'] ?? '')
            ->map->count();

        $notifications = $unreadNotifications
            ->sortByDesc('created_at')
            ->map(function ($notification) use ($countsByApplication) {
                $data = $notification->data;
                $applicationNumber = $data['application_number'] ?? '';

                return [
                    'id' => $notification->id,
                    'type' => $data['type'] ?? 'requirement_file_uploaded',
                    'student_name' => $data['student_name'] ?? 'Unknown',
                    'student_avatar' => $data['student_avatar'] ?? null,
                    'student_id' => $data['student_id'] ?? '',
                    'requirement_label' => $data['requirement_label'] ?? 'Requirement',
                    'application_number' => $applicationNumber,
                    'upload_count' => $countsByApplication[$applicationNumber] ?? 1,
                    'course_name' => $data['course_name'] ?? '',
                    'department_name' => $data['department_name'] ?? '',
                    'created_at' => $notification->created_at->toIso8601String(),
                    'read_at' => $notification->read_at?->toIso8601String(),
                ];
            })
            ->values();

        return [
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadNotifications->count(),
        ];
    }

    public function markAsRead(object $notifiable, string $notificationId): void
    {
        $notification = $notifiable->notifications()
            ->where('type', RequirementFileUploaded::class)
            ->find($notificationId);

        if ($notification && ! $notification->read_at) {
            $notification->markAsRead();
        }
    }

    public function markAllAsRead(object $notifiable): void
    {
        $this->unreadRequirementUploads($notifiable)
            ->get()
            ->markAsRead();
    }

    private function unreadRequirementUploads(object $notifiable): mixed
    {
        return $notifiable->unreadNotifications()
            ->where('type', RequirementFileUploaded::class);
    }
}
