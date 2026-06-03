<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DuplicateApplicationDetected extends Notification
{
    /**
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     */
    public function __construct(
        private readonly array $left,
        private readonly array $right,
        private readonly string $reviewUrl,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Duplicate Graduation Applications Need Review')
            ->greeting('Duplicate application review needed')
            ->line('We found two graduation application records with matching applicant identity details.')
            ->line('Record A: '.$this->recordLine($this->left))
            ->line('Record B: '.$this->recordLine($this->right))
            ->line('Open the secure link below to review both records and delete only the duplicate record you choose.')
            ->action('Review duplicate applications', $this->reviewUrl)
            ->line('This link is intended only for the owner of these application records.');
    }

    public function reviewUrl(): string
    {
        return $this->reviewUrl;
    }

    /**
     * @param  array<string, mixed>  $record
     */
    private function recordLine(array $record): string
    {
        return trim(implode(' - ', array_filter([
            (string) ($record['record_label'] ?? ''),
            (string) ($record['applicant_name'] ?? ''),
            (string) ($record['student_id'] ?? ''),
            (string) ($record['email'] ?? ''),
            (string) ($record['window_title'] ?? ''),
        ])));
    }
}
