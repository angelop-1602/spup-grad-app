<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TestEmailVerification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email-verification {email : The email address to test} {--create-user : Create a temporary test user if one does not exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test sending email verification to a specific email address';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        // Display mail configuration
        $this->info('=== Mail Configuration ===');
        $this->info('Mail Driver: '.Config::get('mail.default'));
        $this->info('From Address: '.Config::get('mail.from.address'));
        $this->info('From Name: '.Config::get('mail.from.name'));

        if (Config::get('mail.default') === 'sendmail') {
            $sendmailPath = Config::get('mail.mailers.sendmail.path');
            $this->info('Sendmail Path: '.$sendmailPath);

            // Check if sendmail path exists
            $sendmailBinary = explode(' ', $sendmailPath)[0];
            if (file_exists($sendmailBinary)) {
                $this->info("✓ Sendmail binary found at: {$sendmailBinary}");
            } else {
                $this->warn("⚠ Sendmail binary not found at: {$sendmailBinary}");
                $this->warn('Common cPanel sendmail paths:');
                $this->warn('  - /usr/sbin/sendmail');
                $this->warn('  - /usr/local/bin/sendmail');
                $this->warn('  - /usr/bin/sendmail');
                $this->warn('Set MAIL_SENDMAIL_PATH in your .env file if needed.');
            }
        }

        $this->newLine();

        $user = User::where('email', $email)->first();

        if (! $user) {
            if ($this->option('create-user')) {
                $this->warn("User with email '{$email}' not found. Creating temporary test user...");
                $user = User::create([
                    'student_id' => 'TEST-'.time(),
                    'name' => 'Test User',
                    'email' => $email,
                    'password' => bcrypt('temporary-password-'.time()),
                ]);
                $this->info("✓ Temporary test user created (ID: {$user->id})");
            } else {
                $this->error("User with email '{$email}' not found.");
                $this->newLine();
                $this->info('Options:');
                $this->info('1. Use --create-user flag to create a temporary test user');
                $this->info('2. Or register a user with this email first');

                return self::FAILURE;
            }
        }

        $this->info('=== User Information ===');
        $this->info("Found user: {$user->name} ({$user->student_id})");
        $this->info("Email: {$user->email}");
        $this->info('Verified: '.($user->hasVerifiedEmail() ? 'Yes' : 'No'));

        if ($user->hasVerifiedEmail()) {
            $this->warn('User email is already verified. Sending anyway for testing...');
        }

        $this->newLine();
        $this->info('=== Sending Email Verification ===');

        try {
            $user->sendEmailVerificationNotification();
            $this->info('✓ Email verification notification sent successfully!');
            $this->newLine();
            $this->info('Next steps:');
            $this->info('1. Check the recipient\'s inbox (and spam folder)');
            $this->info('2. Check Laravel logs: storage/logs/laravel.log');
            if (Config::get('mail.default') === 'sendmail') {
                $this->info('3. Check server mail logs (usually /var/log/maillog or /var/log/mail.log)');
                $this->info('4. Check cPanel email logs if available');
            }

            Log::info('Test email verification sent', [
                'user_id' => $user->id,
                'email' => $user->email,
                'student_id' => $user->student_id,
                'mail_driver' => Config::get('mail.default'),
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to send email verification: '.$e->getMessage());
            $this->newLine();
            $this->error('Error Details:');
            $this->error('  Message: '.$e->getMessage());
            $this->error('  File: '.$e->getFile().':'.$e->getLine());
            $this->newLine();
            $this->warn('Troubleshooting:');
            $this->warn('1. Verify sendmail is installed and working on the server');
            $this->warn('2. Check file permissions for sendmail binary');
            $this->warn('3. Verify MAIL_SENDMAIL_PATH in .env is correct for your server');
            $this->warn('4. Test sendmail manually: echo "test" | /usr/sbin/sendmail -t -i test@example.com');

            Log::error('Test email verification failed', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return self::FAILURE;
        }
    }
}
