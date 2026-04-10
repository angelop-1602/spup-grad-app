<?php

namespace App\Notifications;

use App\Models\Application;
use App\Models\ApplicationRequirement;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequirementFileUploaded extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Application $application,
        public ApplicationRequirement $requirement,
        public string $studentName
    ) {
        //
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        // Ensure user and profile are loaded for avatar
        if (!$this->application->relationLoaded('user')) {
            $this->application->load('user.profile');
        } elseif ($this->application->user && !$this->application->user->relationLoaded('profile')) {
            $this->application->user->load('profile');
        }
        
        // Get student avatar from user
        $studentAvatar = $this->application->user->avatar ?? null;

        return [
            'type' => 'requirement_file_uploaded',
            'application_id' => $this->application->id,
            'application_number' => $this->application->application_number,
            'requirement_id' => $this->requirement->id,
            'requirement_label' => $this->requirement->requirement_label,
            'student_name' => $this->studentName,
            'student_id' => $this->application->user->student_id,
            'student_avatar' => $studentAvatar,
            'course_name' => $this->application->course->name,
            'department_name' => $this->application->department->name,
        ];
    }
}
