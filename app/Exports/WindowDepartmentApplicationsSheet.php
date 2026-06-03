<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class WindowDepartmentApplicationsSheet implements FromArray, ShouldAutoSize, WithEvents, WithTitle
{
    private const LAST_COLUMN = 'N';

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $department
     */
    public function __construct(
        private readonly array $data,
        private readonly array $department,
        private readonly string $title,
    ) {}

    public function title(): string
    {
        return $this->title;
    }

    /**
     * @return list<array<int, mixed>>
     */
    public function array(): array
    {
        $departmentLabel = $this->department['code'] ?? $this->department['name'];
        $rows = [
            ['Graduate List by Department, Program/Degree, Major, and Thesis Category'],
            ['Window: '.$this->data['window_title']],
            ['Department: '.$departmentLabel],
            ['Generated: '.$this->data['generated_at']->format('F d, Y h:i A')],
            ['Total Records: '.$this->department['total']],
            [''],
        ];

        foreach ($this->department['programs'] as $program) {
            $rows[] = ["Program/Degree: {$program['name']}", '', '', '', '', '', '', '', '', '', '', '', '', "Total: {$program['total']}"];

            foreach ($program['majors'] as $major) {
                $rows[] = ["Major: {$major['name']}", '', '', '', '', '', '', '', '', '', '', '', '', "Total: {$major['total']}"];

                foreach ($major['thesis_groups'] as $thesisGroup) {
                    $rows[] = ["Thesis Category: {$thesisGroup['type']}", '', '', '', '', '', '', '', '', '', '', '', '', "Total: {$thesisGroup['total']}"];
                    $rows[] = [
                        'No.',
                        'Application No.',
                        'Student ID',
                        'Graduate Name',
                        'Birthday',
                        'Nationality',
                        'Department',
                        'Program / Degree',
                        'Major',
                        'Thesis Category',
                        'Thesis / Dissertation Title',
                        'Adviser',
                        'Attendance',
                        'Application Status',
                    ];

                    foreach ($thesisGroup['graduates'] as $index => $graduate) {
                        $rows[] = [
                            $index + 1,
                            $graduate['application_number'],
                            $graduate['student_id'],
                            $graduate['name'],
                            $graduate['birthday'],
                            $graduate['nationality'],
                            $graduate['department_code'],
                            $graduate['degree'],
                            $graduate['major'],
                            $graduate['thesis_type'],
                            $graduate['thesis_title'],
                            $graduate['thesis_adviser'],
                            $graduate['attendance'],
                            $graduate['application_status'],
                        ];
                    }

                    $rows[] = [''];
                }
            }
        }

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();

                foreach ([1, 2, 3, 4, 5] as $row) {
                    $sheet->mergeCells("A{$row}:".self::LAST_COLUMN.$row);
                }

                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(15);
                $sheet->getStyle('A1:A5')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('A1:'.self::LAST_COLUMN.$lastRow)->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
                $sheet->getStyle('A1:'.self::LAST_COLUMN.$lastRow)->getAlignment()->setWrapText(true);

                for ($row = 1; $row <= $lastRow; $row++) {
                    $label = trim((string) $sheet->getCell("A{$row}")->getValue());

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
                        $sheet->getStyle("A{$row}:".self::LAST_COLUMN.$row)->applyFromArray([
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

                $sheet->getStyle('A1:'.self::LAST_COLUMN.$lastRow)->getBorders()->getAllBorders()
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
