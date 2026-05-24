<?php

namespace App\Notifications;

use App\Models\GuestApplicationDraft;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;

class GuestApplicationAccessNotification extends Notification
{
    public function __construct(private readonly GuestApplicationDraft $draft)
    {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $trackingCode = $this->draft->ensureTrackingCode();
        $trackingPin = $this->draft->ensureTrackingPin();
        $url = URL::temporarySignedRoute(
            'apply.access',
            Carbon::now()->addDays(30),
            ['draft' => $this->draft->getKey()]
        );

        $mail = (new MailMessage)
            ->subject("Access Your Graduation Application ({$trackingCode})")
            ->greeting('Your application is now active')
            ->line('Your email has been verified and your graduation application is now available in the system.')
            ->line("Tracking code: {$trackingCode}")
            ->line("Tracking PIN: {$trackingPin}")
            ->line('Use the link below to view your application, edit your information, and upload requirements without logging in.')
            ->action('Open application portal', $url);

        if ($this->draft->application?->application_number) {
            $mail->line("Application number: {$this->draft->application->application_number}");
        }

        return $mail
            ->line('This access link expires in 30 days. You can request a new one from the application status page if needed.');
    }
}
