<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportSqlFile extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:import-sql {file : Path to SQL file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import SQL file into database';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $filePath = $this->argument('file');

        if (! file_exists($filePath)) {
            $this->error("File not found: {$filePath}");

            return self::FAILURE;
        }

        $this->info("Reading SQL file: {$filePath}");
        $sql = file_get_contents($filePath);

        if (empty($sql)) {
            $this->error('SQL file is empty');

            return self::FAILURE;
        }

        $this->info('Processing SQL statements...');

        // Remove comments and split by semicolon
        $sql = preg_replace('/--.*$/m', '', $sql);
        $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);

        // Split into individual statements, handling multi-line INSERTs
        $statements = [];
        $currentStatement = '';
        $inInsert = false;
        $parenCount = 0;

        $lines = explode("\n", $sql);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }

            // Check if this is an INSERT statement
            if (preg_match('/^INSERT\s+INTO/i', $line)) {
                $inInsert = true;
                $currentStatement = $line;
                $parenCount = substr_count($line, '(') - substr_count($line, ')');
                continue;
            }

            if ($inInsert) {
                $currentStatement .= ' '.$line;
                $parenCount += substr_count($line, '(') - substr_count($line, ')');

                // If we've closed all parentheses and hit a semicolon, the statement is complete
                if ($parenCount === 0 && str_ends_with($line, ';')) {
                    $statements[] = rtrim($currentStatement, ';');
                    $currentStatement = '';
                    $inInsert = false;
                    $parenCount = 0;
                }
            } else {
                // Regular statement
                if (str_ends_with($line, ';')) {
                    $statement = rtrim($line, ';');
                    if (! empty($statement) && ! preg_match('/^(SET|START|COMMIT|ALTER|CREATE|DROP|INDEX|AUTO_INCREMENT|MODIFY|ADD|PRIMARY|UNIQUE|KEY|CONSTRAINT)/i', $statement)) {
                        $statements[] = $statement;
                    }
                }
            }
        }

        // Filter out cache and non-data statements
        $statements = array_filter($statements, function ($statement) {
            $trimmed = trim($statement);
            if (empty($trimmed)) {
                return false;
            }
            // Skip cache, sessions, jobs, migrations, password reset tokens
            if (preg_match('/INSERT\s+INTO\s+`?(cache|sessions|jobs|job_batches|migrations|password_reset_tokens|failed_jobs|notifications)/i', $trimmed)) {
                return false;
            }
            // Skip structure statements
            if (preg_match('/^(SET|START|COMMIT|ALTER|CREATE|DROP|INDEX|AUTO_INCREMENT|MODIFY|ADD|PRIMARY|UNIQUE|KEY|CONSTRAINT)/i', $trimmed)) {
                return false;
            }

            return true;
        });

        $this->info('Found '.count($statements).' data statements to execute');

        $bar = $this->output->createProgressBar(count($statements));
        $bar->start();

        $successCount = 0;
        $errorCount = 0;

        // Disable foreign key checks temporarily
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        DB::beginTransaction();

        try {
            foreach ($statements as $statement) {
                $statement = trim($statement);
                if (empty($statement)) {
                    continue;
                }

                try {
                    // Convert INSERT to INSERT IGNORE to skip duplicates
                    $statement = preg_replace('/^INSERT\s+INTO/i', 'INSERT IGNORE INTO', $statement);
                    DB::statement($statement);
                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    // Only show first 10 errors to avoid spam
                    if ($errorCount <= 10) {
                        $this->newLine();
                        $this->warn('Error executing statement: '.substr($statement, 0, 100).'...');
                        $this->warn('Error: '.$e->getMessage());
                    }
                }

                $bar->advance();
            }

            DB::commit();

            // Re-enable foreign key checks
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            $bar->finish();
            $this->newLine(2);

            $this->info("Import completed!");
            $this->info("Successfully executed: {$successCount} statements");
            if ($errorCount > 0) {
                $this->warn("Errors encountered: {$errorCount} statements");
            }

            return self::SUCCESS;
        } catch (\Exception $e) {
            DB::rollBack();
            $bar->finish();
            $this->newLine(2);
            $this->error('Import failed: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
