<?php

namespace App\Http\Controllers\Concerns;

use App\Models\HistoricalGraduationApplication;
use Illuminate\Support\Facades\DB;

trait BuildsHistoricalApplicationWindows
{
    /**
     * @return array<int, array<string, mixed>>
     */
    protected function historicalWindows(string $indexRouteName): array
    {
        $counts = HistoricalGraduationApplication::query()
            ->select('source_batch', DB::raw('count(*) as total'))
            ->groupBy('source_batch')
            ->pluck('total', 'source_batch')
            ->all();

        return [
            $this->buildHistoricalWindowRow(
                batch: 'june_2025',
                title: 'June 2025',
                startDate: '2025-06-01T00:00:00',
                endDate: '2025-06-30T23:59:59',
                counts: $counts,
                indexRouteName: $indexRouteName
            ),
            $this->buildHistoricalWindowRow(
                batch: 'january_2025',
                title: 'January 2025',
                startDate: '2025-01-01T00:00:00',
                endDate: '2025-01-31T23:59:59',
                counts: $counts,
                indexRouteName: $indexRouteName
            ),
        ];
    }

    /**
     * @param  array<string, int>  $counts
     * @return array<string, mixed>
     */
    private function buildHistoricalWindowRow(
        string $batch,
        string $title,
        string $startDate,
        string $endDate,
        array $counts,
        string $indexRouteName,
    ): array {
        return [
            'key' => $batch,
            'batch' => $batch,
            'title' => $title,
            'description' => 'Historical applications import',
            'start_date' => $startDate,
            'end_date' => $endDate,
            'applications_count' => (int) ($counts[$batch] ?? 0),
            'is_historical' => true,
            'view_url' => route($indexRouteName, ['batch' => $batch]),
        ];
    }
}
