<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class VerifyUserEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:verify-email {email : The email address to verify}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manually verify a user\'s email address (for development)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return self::FAILURE;
        }

        if ($user->hasVerifiedEmail()) {
            $this->warn("User '{$email}' is already verified.");
            return self::SUCCESS;
        }

        $user->markEmailAsVerified();

        $this->info("Email '{$email}' has been verified successfully.");

        return self::SUCCESS;
    }
}
