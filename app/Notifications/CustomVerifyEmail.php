<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class CustomVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Get the verification URL for the given notifiable.
     *
     * @param  mixed  $notifiable
     * @return string
     */
    protected function verificationUrl($notifiable)
    {
        return URL::temporarySignedRoute(
            'email.verified',
            Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );
    }

    /**
     * Get the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        if (static::$toMailCallback) {
            return call_user_func(static::$toMailCallback, $notifiable, $verificationUrl);
        }

        // Log email sending for debugging before building the message
        $email = method_exists($notifiable, 'getEmailForVerification')
            ? $notifiable->getEmailForVerification()
            : ($notifiable->email ?? 'unknown');

        // Determine from address (Gmail for local, env for production)
        $fromAddress = config('app.env') === 'local'
            ? 'a.peralta0216@gmail.com'
            : config('mail.from.address', 'grad-application@spup.edu.ph');

        \Illuminate\Support\Facades\Log::info('Sending email verification', [
            'from' => $fromAddress,
            'from_name' => config('mail.from.name', 'SPUP Graduation Application'),
            'to' => $email,
            'url' => $verificationUrl,
            'subject' => 'Verify Your Email Address - '.config('app.name', 'SPUP Graduation Application'),
            'user_id' => method_exists($notifiable, 'getKey') ? $notifiable->getKey() : 'unknown',
            'environment' => config('app.env'),
        ]);

        return $this->buildMailMessage($verificationUrl);
    }

    /**
     * Build the mail representation of the notification.
     *
     * @param  string  $url
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    protected function buildMailMessage($url)
    {
        $appName = config('app.name', 'SPUP Graduation Application');
        $appUrl = config('app.url', url('/'));

        // Get logo path and URL
        $logoPath = public_path('SPUP-Logo-with-yellow.png');
        $baseUrl = config('app.url') ?: request()->getSchemeAndHttpHost();
        $logoUrl = rtrim($baseUrl, '/').'/SPUP-Logo-with-yellow.png';

        // Use Gmail for local development, env credentials for production
        $fromAddress = config('app.env') === 'local'
            ? 'a.peralta0216@gmail.com'
            : config('mail.from.address', 'grad-application@spup.edu.ph');
        $fromName = config('mail.from.name', 'SPUP Graduation Application');

        $mailMessage = (new MailMessage)
            ->from($fromAddress, $fromName)
            ->subject('Verify Your Email Address - '.$appName)
            ->view('emails.verify-email', [
                'url' => $url,
                'appName' => $appName,
                'appUrl' => $appUrl,
                'logoUrl' => $logoUrl,
                'logoPath' => file_exists($logoPath) ? $logoPath : null,
            ]);

        // Add headers to improve deliverability
        $mailMessage->withSymfonyMessage(function ($message) use ($appUrl) {
            $message->getHeaders()
                ->addTextHeader('X-Mailer', 'Laravel')
                ->addTextHeader('X-Priority', '1')
                ->addTextHeader('List-Unsubscribe', '<'.$appUrl.'/unsubscribe>')
                ->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
        });

        // Attach logo if it exists (will be embedded in the view using $message->embed())
        if (file_exists($logoPath)) {
            $mailMessage->attach($logoPath, [
                'as' => 'logo.png',
                'mime' => 'image/png',
            ]);
        }

        return $mailMessage;
    }
}
