<?php

namespace App\Console\Commands;

use Database\Seeders\HistoricalGraduationApplicationsSeeder;
use Database\Seeders\January2026ApplicationSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class ImportHistoricalGraduationData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'graduation:import-historical
        {--force : Force historical imports to run in production}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import January 2025, June 2025, and January 2026 graduation data outside normal seeding.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $force = (bool) $this->option('force');

        if (! $this->databaseIsAvailable()) {
            return self::FAILURE;
        }

        $this->info('Importing January 2025 and June 2025 historical graduation applications...');
        $exitCode = $this->call('db:seed', [
            '--class' => HistoricalGraduationApplicationsSeeder::class,
            ...$this->forceOption($force),
        ]);

        if ($exitCode !== self::SUCCESS) {
            return $exitCode;
        }

        $this->info('Importing January 2026 graduation application data...');
        $exitCode = $this->call('db:seed', [
            '--class' => January2026ApplicationSeeder::class,
            ...$this->forceOption($force),
        ]);

        if ($exitCode !== self::SUCCESS) {
            return $exitCode;
        }

        $this->info('Historical graduation data import completed.');

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
            $this->line('Run the normal migrations first, verify the database exists, then rerun this command.');
            $this->line("Original error: {$exception->getMessage()}");

            return false;
        }
    }
}
