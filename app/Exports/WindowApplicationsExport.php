<?php

namespace App\Exports;

use App\Models\ApplicationWindow;
use App\Support\GraduateExportData;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class WindowApplicationsExport implements FromArray, ShouldAutoSize, WithEvents, WithTitle
{
    protected const LAST_COLUMN = 'J';

    public function __construct(
        protected int $windowId,
        protected ?string $departmentName = null,
        protected ?array $departmentIds = null,
        protected ?string $search = null,
    ) {
    }

    public function title(): string
    {
        return 'Graduate List';
    }

    public function array(): array
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

        return $this->rows($data);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();
                $lastColumn = self::LAST_COLUMN;

                foreach ([1, 2, 3, 4, 5] as $row) {
                    $sheet->mergeCells("A{$row}:{$lastColumn}{$row}");
                }

                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(15);
                $sheet->getStyle('A1:A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
                $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->getAlignment()->setWrapText(true);

                for ($row = 1; $row <= $lastRow; $row++) {
                    $label = trim((string) $sheet->getCell("A{$row}")->getValue());

                    if (str_starts_with($label, 'Department:')) {
                        $this->styleBand($sheet, $row, '1f4e79', 'ffffff');

                        continue;
                    }

                    if (str_starts_with($label, 'Program/Degree:')) {
                        $this->styleBand($sheet, $row, 'd9eaf7', '000000');

                        continue;
                    }

                    if (str_starts_with($label, 'Major:')) {
                        $this->styleBand($sheet, $row, 'eaf4e4', '000000');

                        continue;
                    }

                    if (str_starts_with($label, 'Thesis Category:')) {
                        $this->styleBand($sheet, $row, 'fff2cc', '000000');

                        continue;
                    }

                    if ($label === 'No.') {
                        $sheet->getStyle("A{$row}:{$lastColumn}{$row}")->applyFromArray([
                            'font' => ['bold' => true],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => 'f3f4f6'],
                            ],
                            'borders' => [
                                'allBorders' => [
                                    'borderStyle' => Border::BORDER_THIN,
                                    'color' => ['rgb' => 'd1d5db'],
                                ],
                            ],
                        ]);
                    }
                }

                $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->getBorders()->getAllBorders()
                    ->setBorderStyle(Border::BORDER_HAIR)
                    ->getColor()
                    ->setRGB('e5e7eb');

                $sheet->freezePane('A7');
                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setFitToWidth(1)
                    ->setFitToHeight(0);
            },
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<array<int, mixed>>
     */
    protected function rows(array $data): array
    {
        $rows = [
            ['Graduate List by Department, Program/Degree, Major, and Thesis Category'],
            ['Window: '.$data['window_title']],
            ['Scope: '.$data['scope_label']],
            ['Generated: '.$data['generated_at']->format('F d, Y h:i A')],
            ['Total Records: '.$data['total']],
            [],
        ];

        foreach ($data['departments'] as $department) {
            $rows[] = ["Department: {$department['name']}", '', '', '', '', '', '', '', '', "Total: {$department['total']}"];

            foreach ($department['programs'] as $program) {
                $rows[] = ["Program/Degree: {$program['name']}", '', '', '', '', '', '', '', '', "Total: {$program['total']}"];

                foreach ($program['majors'] as $major) {
                    $rows[] = ["Major: {$major['name']}", '', '', '', '', '', '', '', '', "Total: {$major['total']}"];

                    foreach ($major['thesis_groups'] as $thesisGroup) {
                        $rows[] = ["Thesis Category: {$thesisGroup['type']}", '', '', '', '', '', '', '', '', "Total: {$thesisGroup['total']}"];

                        $rows[] = [
                            'No.',
                            'Student ID',
                            'Graduate Name',
                            'Department',
                            'Program / Degree',
                            'Major',
                            'Thesis Category',
                            'Thesis / Dissertation Title',
                            'Adviser',
                            'Status',
                        ];

                        foreach ($thesisGroup['graduates'] as $index => $graduate) {
                            $rows[] = [
                                $index + 1,
                                $graduate['student_id'],
                                $graduate['name'],
                                $graduate['department'],
                                $graduate['degree'],
                                $graduate['major'],
                                $graduate['thesis_type'],
                                $graduate['thesis_title'],
                                $graduate['thesis_adviser'],
                                $graduate['status'],
                            ];
                        }

                        $rows[] = [];
                    }
                }
            }
        }

        if ((int) $data['total'] === 0) {
            $rows[] = ['No graduate records found for this export.'];
        }

        return $rows;
    }

    protected function styleBand($sheet, int $row, string $background, string $foreground): void
    {
        $sheet->getStyle('A'.$row.':'.self::LAST_COLUMN.$row)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => $foreground],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => $background],
            ],
        ]);
    }

}
