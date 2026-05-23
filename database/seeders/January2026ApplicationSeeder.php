<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class January2026ApplicationSeeder extends Seeder
{
    private const SQL_PATH = 'database/seeders/january-2026_application_graduation.sql';

    /**
     * Tables from the dump that are runtime metadata rather than seed data.
     *
     * @var array<int, string>
     */
    private const SKIPPED_TABLES = [
        'cache',
        'migrations',
        'password_reset_tokens',
    ];

    public function run(): void
    {
        $sql = File::get(base_path(self::SQL_PATH));
        $statements = $this->extractInsertStatements($sql);

        $executedByTable = [];
        $skippedByTable = [];

        Schema::disableForeignKeyConstraints();

        try {
            foreach ($statements as $statement) {
                $table = $this->statementTable($statement);

                if ($table === null || $this->shouldSkipTable($table)) {
                    $skippedByTable[$table ?? 'unknown'] = ($skippedByTable[$table ?? 'unknown'] ?? 0) + 1;

                    continue;
                }

                if (! Schema::hasTable($table)) {
                    $skippedByTable[$table] = ($skippedByTable[$table] ?? 0) + 1;
                    $this->command?->warn("Skipped January 2026 table '{$table}' because it does not exist.");

                    continue;
                }

                DB::statement($this->makeInsertIdempotent($statement));
                $executedByTable[$table] = ($executedByTable[$table] ?? 0) + 1;
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        foreach ($executedByTable as $table => $count) {
            $this->command?->info("Imported January 2026 {$table}: {$count} statement(s).");
        }

        if ($skippedByTable !== []) {
            $skipped = collect($skippedByTable)
                ->map(fn (int $count, string $table) => "{$table} ({$count})")
                ->implode(', ');

            $this->command?->info("Skipped January 2026 dump metadata: {$skipped}.");
        }
    }

    /**
     * @return array<int, string>
     */
    private function extractInsertStatements(string $sql): array
    {
        $statements = [];
        $offset = 0;

        while (($start = strpos($sql, 'INSERT INTO `', $offset)) !== false) {
            $end = $this->findStatementEnd($sql, $start);
            $statement = substr($sql, $start, ($end - $start) + 1);
            $offset = $end + 1;

            $statements[] = $statement;
        }

        return $statements;
    }

    private function findStatementEnd(string $sql, int $start): int
    {
        $inString = false;
        $escaped = false;
        $length = strlen($sql);

        for ($index = $start; $index < $length; $index++) {
            $character = $sql[$index];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;
                    continue;
                }

                if ($character === '\\') {
                    $escaped = true;
                    continue;
                }

                if ($character === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($character === "'") {
                $inString = true;
                continue;
            }

            if ($character === ';') {
                return $index;
            }
        }

        return $length - 1;
    }

    private function statementTable(string $statement): ?string
    {
        preg_match('/^INSERT\s+INTO\s+`([^`]+)`/i', trim($statement), $matches);

        return $matches[1] ?? null;
    }

    private function shouldSkipTable(string $table): bool
    {
        return in_array($table, self::SKIPPED_TABLES, true);
    }

    private function makeInsertIdempotent(string $statement): string
    {
        return preg_replace('/^INSERT\s+INTO/i', 'INSERT IGNORE INTO', trim($statement), 1) ?? $statement;
    }
}
