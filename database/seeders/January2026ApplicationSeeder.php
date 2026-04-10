<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class January2026ApplicationSeeder extends Seeder
{
    private const SQL_PATH = 'database/seeders/january-2026_application_graduation.sql';

    public function run(): void
    {
        $sql = File::get(base_path(self::SQL_PATH));
        $statements = $this->extractInsertStatements($sql);

        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        try {
            foreach ($statements as $statement) {
                DB::statement($statement);
            }
        } finally {
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
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
}
