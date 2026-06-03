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

class WindowApplicationSummarySheet implements FromArray, ShouldAutoSize, WithEvents, WithTitle
{
    private const LAST_COLUMN = 'H';

    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(private readonly array $data) {}

    public function title(): string
    {
        return 'Application Summary';
    }

    /**
     * @return list<array<int, mixed>>
     */
    public function array(): array
    {
        $rows = [
            ['Application Summary'],
            ['Window: '.$this->data['window_title']],
            ['Scope: '.$this->data['scope_label']],
            ['Generated: '.$this->data['generated_at']->format('F d, Y h:i A')],
            ['Total Records: '.$this->data['total']],
            [''],
            [
                'Level',
                'Department',
                'Program / Degree',
                'Major',
                'Total',
                'Attending',
                'Not Attending',
                'Nationalities',
            ],
        ];

        foreach ($this->data['departments'] as $department) {
            $rows[] = [
                'Department',
                $department['code'] ?? $department['name'],
                '',
                '',
                $department['total'],
                $department['attendance']['attending'] ?? 0,
                $department['attendance']['not_attending'] ?? 0,
                $this->nationalitySummary($department['nationalities'] ?? []),
            ];

            foreach ($department['programs'] as $program) {
                $rows[] = [
                    'Program',
                    $department['code'] ?? $department['name'],
                    $program['name'],
                    '',
                    $program['total'],
                    $program['attendance']['attending'] ?? 0,
                    $program['attendance']['not_attending'] ?? 0,
                    $this->nationalitySummary($program['nationalities'] ?? []),
                ];

                foreach ($program['majors'] as $major) {
                    $rows[] = [
                        'Major',
                        $department['code'] ?? $department['name'],
                        $program['name'],
                        $major['name'],
                        $major['total'],
                        $major['attendance']['attending'] ?? 0,
                        $major['attendance']['not_attending'] ?? 0,
                        $this->nationalitySummary($major['nationalities'] ?? []),
                    ];
                }
            }
        }

        if ((int) $this->data['total'] === 0) {
            $rows[] = ['No graduate records found for this export.'];
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
                $sheet->getStyle('A7:'.self::LAST_COLUMN.'7')->applyFromArray([
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
                $sheet->getStyle('A1:'.self::LAST_COLUMN.$lastRow)->getBorders()->getAllBorders()
                    ->setBorderStyle(Border::BORDER_HAIR)
                    ->getColor()
                    ->setRGB('e5e7eb');
                $sheet->freezePane('A8');
                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setFitToWidth(1)
                    ->setFitToHeight(0);
            },
        ];
    }

    /**
     * @param  array<int, array{nationality: string, count: int}>  $nationalities
     */
    private function nationalitySummary(array $nationalities): string
    {
        return collect($nationalities)
            ->map(fn (array $row) => $row['nationality'].' ('.$row['count'].')')
            ->implode(', ');
    }
}
