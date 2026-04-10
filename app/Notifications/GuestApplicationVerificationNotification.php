<?php

namespace App\Notifications;

use App\Models\GuestApplicationDraft;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class GuestApplicationVerificationNotification extends Notification implements ShouldQueue
{
    use Queueable;

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
            'apply.verify',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'draft' => $this->draft->getKey(),
                'hash' => sha1($this->draft->email),
            ]
        );

        return (new MailMessage)
            ->subject("Verify Your Graduation Application Email ({$trackingCode})")
            ->greeting('Hello!')
            ->line('Your graduation application draft has been saved.')
            ->line("Tracking code: {$trackingCode}")
            ->line("Tracking PIN: {$trackingPin}")
            ->line('Verify your email to finalize the application and make it visible to the graduation office.')
            ->action('Verify email and submit application', $url)
            ->line('Keep both the tracking code and PIN for future status checks and portal access recovery.')
            ->line('If you entered the wrong email, return to the application status page to correct it before verifying.');
    }
}
