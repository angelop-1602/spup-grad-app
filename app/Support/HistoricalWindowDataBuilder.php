<?php

namespace App\Support;

use App\Models\HistoricalGraduationApplication;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class HistoricalWindowDataBuilder
{
    /**
     * @return array<string, mixed>
     */
    public function build(Request $request, string $batch, string $viewer): array
    {
        $windowConfig = $this->windowConfig($batch, $viewer);
        if ($windowConfig === null) {
            abort(404);
        }

        $filters = [
            'search' => trim((string) $request->input('search', '')),
            'status' => (string) $request->input('status', 'all'),
        ];

        $query = $this->baseQuery($batch, $filters);

        $applications = (clone $query)
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (HistoricalGraduationApplication $record) => $this->mapRecord($record, $viewer));

        $allRecords = (clone $query)->get();
        $stats = $this->buildStats($allRecords);

        return [
            'window' => [
                'id' => 0,
                'title' => $windowConfig['title'],
                'description' => 'Historical applications import',
                'start_date' => $windowConfig['start_date'],
                'end_date' => $windowConfig['end_date'],
                'is_historical' => true,
                'view_url' => $windowConfig['view_url'],
            ],
            'applications' => $applications,
            'stats' => $stats,
            'filters' => $filters,
        ];
    }

    /**
     * @return array<string, string>|null
     */
    private function windowConfig(string $batch, string $viewer): ?array
    {
        $routeName = $viewer === 'coordinator'
            ? 'coordinator.windows.historical'
            : 'admin.windows.historical';

        return match ($batch) {
            'january_2025' => [
                'title' => 'January 2025',
                'start_date' => '2025-01-01T00:00:00',
                'end_date' => '2025-01-31T23:59:59',
                'view_url' => route($routeName, ['batch' => 'january_2025']),
            ],
            'june_2025' => [
                'title' => 'June 2025',
                'start_date' => '2025-06-01T00:00:00',
                'end_date' => '2025-06-30T23:59:59',
                'view_url' => route($routeName, ['batch' => 'june_2025']),
            ],
            default => null,
        };
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function baseQuery(string $batch, array $filters)
    {
        return HistoricalGraduationApplication::query()
            ->where('source_batch', $batch)
            ->when($filters['search'] !== '', function ($query) use ($filters) {
                $search = $filters['search'];

                $query->where(function ($inner) use ($search) {
                    $inner->where('full_name', 'like', "%{$search}%")
                        ->orWhere('student_id', 'like', "%{$search}%")
                        ->orWhere('reference_code', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('department_name', 'like', "%{$search}%")
                        ->orWhere('course_name', 'like', "%{$search}%")
                        ->orWhere('major_name', 'like', "%{$search}%")
                        ->orWhere('degree_title', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] !== 'all', function ($query) use ($filters) {
                if ($filters['status'] === 'pending') {
                    $query->whereIn('status_bucket', ['pending', 'unknown']);
                } else {
                    $query->where('status_bucket', $filters['status']);
                }
            });
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRecord(HistoricalGraduationApplication $record, string $viewer): array
    {
        $name = $record->full_name ?: 'N/A';
        $studentId = $record->student_id ?: $record->reference_code;

        $profile = null;
        if ($record->first_name || $record->last_name || $record->middle_name) {
            $profile = [
                'first_name' => $record->first_name ?? '',
                'last_name' => $record->last_name ?? '',
                'middle_name' => $record->middle_name,
                'suffix' => null,
                'photo_path' => null,
            ];
        }

        $departmentName = $record->department_name ?: 'N/A';
        $courseName = $record->course_name ?: ($record->degree_title ?: 'N/A');

        return [
            'id' => $record->id,
            'application_number' => $this->applicationNumber($record),
            'is_historical' => true,
            'detail_url' => $this->detailUrl($record, $viewer),
            'download_url' => null,
            'user' => [
                'id' => 0,
                'name' => $name,
                'email' => $record->email ?? '',
                'student_id' => $studentId ?? '',
                'profile' => $profile,
            ],
            'department' => [
                'id' => 0,
                'name' => $departmentName,
                'code' => $departmentName,
            ],
            'course' => [
                'id' => 0,
                'name' => $courseName,
                'code' => $courseName,
            ],
            'major' => $record->major_name,
            'status' => $record->status_bucket ?: 'unknown',
            'created_at' => $this->displayDate($record),
        ];
    }

    private function applicationNumber(HistoricalGraduationApplication $record): string
    {
        $prefix = $record->source_batch === 'june_2025' ? 'JUNE-2025' : 'JAN-2025';

        return sprintf('%s-%05d', $prefix, $record->id);
    }

    private function detailUrl(HistoricalGraduationApplication $record, string $viewer): string
    {
        $routeName = $viewer === 'coordinator'
            ? 'coordinator.historical-applications.show'
            : 'admin.historical-applications.show';

        return route($routeName, ['historicalApplication' => $record->id]);
    }

    private function displayDate(HistoricalGraduationApplication $record): string
    {
        $date = $record->submitted_at ?: $record->source_created_at ?: $record->created_at;

        return $date instanceof Carbon ? $date->toIso8601String() : now()->toIso8601String();
    }

    /**
     * @return array<string, mixed>
     */
    private function buildStats(Collection $records): array
    {
        $attendanceStats = $records
            ->groupBy('attendance')
            ->map(fn (Collection $group) => $group->count())
            ->toArray();

        $attendance = [
            'attending' => (int) ($attendanceStats['attending'] ?? 0),
            'not_attending' => (int) ($attendanceStats['not attending'] ?? 0),
        ];

        $departments = $this->groupTotals($records, 'department_name');
        $programs = $this->groupTotals($records, 'course_name');
        $majors = $this->groupTotals($records, 'major_name');

        $nationalities = $records
            ->map(function (HistoricalGraduationApplication $record) {
                return NationalityNormalizer::normalize($record->nationality);
            })
            ->filter()
            ->groupBy(fn (string $value) => $value)
            ->map(fn (Collection $group, string $nationality) => [
                'nationality' => $nationality,
                'total' => $group->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values()
            ->toArray();

        $hierarchical = $this->buildHierarchical($records);

        $statusCountsRaw = $records
            ->groupBy('status_bucket')
            ->map(fn (Collection $group) => $group->count())
            ->toArray();

        $pendingCount = (int) (($statusCountsRaw['pending'] ?? 0) + ($statusCountsRaw['unknown'] ?? 0));

        $statusCounts = [
            'all' => $records->count(),
            'submitted' => (int) ($statusCountsRaw['submitted'] ?? 0),
            'pending' => $pendingCount,
            'approved' => (int) ($statusCountsRaw['approved'] ?? 0),
            'incomplete' => (int) ($statusCountsRaw['incomplete'] ?? 0),
        ];

        return [
            'attendance' => $attendance,
            'departments' => $departments,
            'programs' => $programs,
            'majors' => $majors,
            'nationalities' => $nationalities,
            'hierarchical' => $hierarchical,
            'status_counts' => $statusCounts,
        ];
    }

    /**
     * @return array<int, array{code: string, name: string, total: int}>
     */
    private function groupTotals(Collection $records, string $field): array
    {
        return $records
            ->map(fn (HistoricalGraduationApplication $record) => $record->{$field} ?: 'N/A')
            ->groupBy(fn (string $value) => $value)
            ->map(fn (Collection $group, string $name) => [
                'code' => $name,
                'name' => $name,
                'total' => $group->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values()
            ->toArray();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildHierarchical(Collection $records): array
    {
        return $records
            ->groupBy(fn (HistoricalGraduationApplication $record) => $record->department_name ?: 'N/A')
            ->map(function (Collection $deptGroup, string $departmentName) {
                $programs = $deptGroup
                    ->groupBy(fn (HistoricalGraduationApplication $record) => $record->course_name ?: 'N/A')
                    ->map(function (Collection $programGroup, string $programName) {
                        $majors = $programGroup
                            ->groupBy(fn (HistoricalGraduationApplication $record) => $record->major_name ?: 'N/A')
                            ->map(function (Collection $majorGroup, string $majorName) {
                                return [
                                    'name' => $majorName,
                                    'total' => $majorGroup->count(),
                                    'attendance' => [
                                        'attending' => (int) $majorGroup->where('attendance', 'attending')->count(),
                                        'not_attending' => (int) $majorGroup->where('attendance', 'not attending')->count(),
                                    ],
                                    'nationalities' => $this->groupNationalities($majorGroup),
                                ];
                            })
                            ->values()
                            ->toArray();

                        return [
                            'name' => $programName,
                            'total' => $programGroup->count(),
                            'attendance' => [
                                'attending' => (int) $programGroup->where('attendance', 'attending')->count(),
                                'not_attending' => (int) $programGroup->where('attendance', 'not attending')->count(),
                            ],
                            'nationalities' => $this->groupNationalities($programGroup),
                            'majors' => $majors,
                        ];
                    })
                    ->values()
                    ->toArray();

                return [
                    'name' => $departmentName,
                    'total' => $deptGroup->count(),
                    'attendance' => [
                        'attending' => (int) $deptGroup->where('attendance', 'attending')->count(),
                        'not_attending' => (int) $deptGroup->where('attendance', 'not attending')->count(),
                    ],
                    'nationalities' => $this->groupNationalities($deptGroup),
                    'programs' => $programs,
                ];
            })
            ->values()
            ->sortBy('name')
            ->values()
            ->toArray();
    }

    /**
     * @return array<int, array{nationality: string, count: int}>
     */
    private function groupNationalities(Collection $records): array
    {
        return $records
            ->map(function (HistoricalGraduationApplication $record) {
                return NationalityNormalizer::normalize($record->nationality);
            })
            ->filter()
            ->groupBy(fn (string $value) => $value)
            ->map(fn (Collection $group, string $nationality) => [
                'nationality' => $nationality,
                'count' => $group->count(),
            ])
            ->values()
            ->sortByDesc('count')
            ->values()
            ->toArray();
    }
}
