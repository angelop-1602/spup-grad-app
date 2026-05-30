<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ApplicationSubmitted extends Notification
{
    use Queueable;

    public function __construct(
        public Application $application,
        public string $studentName
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $this->application->loadMissing(['user.profile', 'course', 'department']);

        return [
            'type' => 'application_submitted',
            'application_id' => $this->application->id,
            'application_number' => $this->application->application_number,
            'student_name' => $this->studentName,
            'student_id' => $this->application->user?->student_id,
            'student_avatar' => $this->application->user?->avatar,
            'course_name' => $this->application->course?->name,
            'department_name' => $this->application->department?->name,
            'department_code' => $this->application->department?->code,
            'status' => $this->application->status,
        ];
    }
}
