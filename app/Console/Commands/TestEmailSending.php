<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Mail\Message;

class TestEmailSending extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email {email : The email address to send test email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test email sending configuration';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        $this->info('=== Testing Email Configuration ===');
        $this->info('Mail Driver: '.config('mail.default'));
        
        if (config('mail.default') === 'sendmail') {
            $this->info('Sendmail Path: '.config('mail.mailers.sendmail.path'));
        } else {
            $this->info('SMTP Host: '.config('mail.mailers.smtp.host'));
            $this->info('SMTP Port: '.config('mail.mailers.smtp.port'));
            $this->info('SMTP Encryption: '.config('mail.mailers.smtp.encryption') ?? 'none');
        }
        
        $this->info('From Address: '.config('mail.from.address'));
        $this->info('From Name: '.config('mail.from.name'));
        $this->newLine();

        $this->info("Sending test email to: {$email}");

        try {
            Mail::raw('This is a test email from SPUP Graduation Application. If you receive this, your email configuration is working correctly.', function (Message $message) use ($email) {
                $message->to($email)
                        ->subject('Test Email - SPUP Graduation Application');
            });

            $this->info('✓ Email sent successfully!');
            $this->warn('⚠ If you don\'t receive the email:');
            $this->warn('  1. Check your spam/junk folder');
            $this->warn('  2. Check Gmail security settings');
            $this->warn('  3. Verify the app password is correct');
            $this->warn('  4. Wait a few minutes - emails can be delayed');

            Log::info('Test email sent successfully', ['to' => $email]);

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('✗ Failed to send email: '.$e->getMessage());
            $this->error('Stack trace: '.$e->getTraceAsString());

            Log::error('Failed to send test email', [
                'to' => $email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return Command::FAILURE;
        }
    }
}

