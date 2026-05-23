<?php

namespace App\Console\Commands;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class SetupGraduationDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'graduation:setup-database
        {--fresh : Drop all tables before running migrations}
        {--seed-only : Skip migrations and only run the seeders}
        {--force : Force migrations and seeders to run in production}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run application migrations and baseline seeders.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $force = (bool) $this->option('force');

        if (! $this->databaseIsAvailable()) {
            return self::FAILURE;
        }

        if (! $this->option('seed-only')) {
            $migrationCommand = $this->option('fresh') ? 'migrate:fresh' : 'migrate';

            $this->info("Running {$migrationCommand}...");
            $exitCode = $this->call($migrationCommand, $this->forceOption($force));

            if ($exitCode !== self::SUCCESS) {
                return $exitCode;
            }
        }

        $this->info('Running DatabaseSeeder...');
        $exitCode = $this->call('db:seed', [
            '--class' => DatabaseSeeder::class,
            ...$this->forceOption($force),
        ]);

        if ($exitCode !== self::SUCCESS) {
            return $exitCode;
        }

        $this->info('Graduation database setup completed.');
        $this->line('Historical imports are separate. Run php artisan graduation:import-historical when needed.');

        return self::SUCCESS;
    }

    /**
     * @return array<string, bool>
     */
    private function forceOption(bool $force): array
    {
        return $force ? ['--force' => true] : [];
    }

    private function databaseIsAvailable(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (Throwable $exception) {
            $connection = config('database.default');
            $host = config("database.connections.{$connection}.host");
            $port = config("database.connections.{$connection}.port");
            $database = config("database.connections.{$connection}.database");

            $this->error("Cannot connect to the {$connection} database.");
            $this->line("Configured target: {$host}:{$port} / {$database}");
            $this->line('Start MySQL, verify the database exists, then rerun this command.');
            $this->line("Original error: {$exception->getMessage()}");

            return false;
        }
    }
}
