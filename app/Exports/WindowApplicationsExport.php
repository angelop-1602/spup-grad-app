<?php

namespace App\Exports;

use App\Models\ApplicationWindow;
use App\Support\GraduateExportData;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use Maatwebsite\Excel\Concerns\WithTitle;

class WindowApplicationsExport implements WithMultipleSheets
{
    public function __construct(
        protected int $windowId,
        protected ?string $departmentName = null,
        protected ?array $departmentIds = null,
        protected ?string $search = null,
    ) {}

    /**
     * @return array<int, WithTitle>
     */
    public function sheets(): array
    {
        $window = ApplicationWindow::findOrFail($this->windowId);
        $applications = GraduateExportData::applicationsForWindow(
            window: $window,
            departmentIds: $this->departmentIds,
            departmentName: $this->departmentName,
            search: $this->search,
        );
        $data = GraduateExportData::build(
            window: $window,
            applications: $applications,
            scopeLabel: $this->departmentName ? GraduateExportData::titleCase($this->departmentName) : null,
        );

        $sheets = [
            new WindowApplicationSummarySheet($data),
        ];
        $usedTitles = ['Application Summary' => true];

        foreach ($data['departments'] as $department) {
            $title = $this->uniqueSheetTitle($department['code'] ?? $department['name'] ?? 'Department', $usedTitles);
            $sheets[] = new WindowDepartmentApplicationsSheet($data, $department, $title);
        }

        return $sheets;
    }

    /**
     * @param  array<string, bool>  $usedTitles
     */
    private function uniqueSheetTitle(string $value, array &$usedTitles): string
    {
        $base = preg_replace('/[\[\]\:\*\?\/\\\\]+/', ' ', $value) ?: 'Department';
        $base = trim(preg_replace('/\s+/', ' ', $base) ?: 'Department');
        $base = mb_substr($base, 0, 31) ?: 'Department';
        $title = $base;
        $counter = 2;

        while (isset($usedTitles[$title])) {
            $suffix = ' '.$counter;
            $title = mb_substr($base, 0, 31 - mb_strlen($suffix)).$suffix;
            $counter++;
        }

        $usedTitles[$title] = true;

        return $title;
    }
}
