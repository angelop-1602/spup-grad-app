<?php

namespace Database\Seeders;

use App\Support\HistoricalGraduationApplicationImportService;
use Illuminate\Database\Seeder;

class HistoricalGraduationApplicationsSeeder extends Seeder
{
    /**
     * Seed the application's historical 2025 graduation application data.
     */
    public function run(HistoricalGraduationApplicationImportService $importer): void
    {
        $counts = $importer->import();

        $this->command?->info(sprintf(
            'Imported historical graduation applications: January 2025 = %d, June 2025 = %d',
            $counts['january_2025'] ?? 0,
            $counts['june_2025'] ?? 0,
        ));
    }
}
