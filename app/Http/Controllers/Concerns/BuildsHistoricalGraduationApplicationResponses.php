<?php

namespace App\Http\Controllers\Concerns;

use App\Models\HistoricalGraduationApplication;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait BuildsHistoricalGraduationApplicationResponses
{
    /**
     * @return array<string, mixed>
     */
    protected function historicalIndexProps(Request $request): array
    {
        $filters = [
            'search' => trim((string) $request->input('search', '')),
            'batch' => (string) $request->input('batch', 'all'),
            'status' => (string) $request->input('status', 'all'),
        ];

        $applications = $this->historicalApplicationsQuery($filters)
            ->orderByRaw("
                CASE source_batch
                    WHEN 'june_2025' THEN 0
                    WHEN 'january_2025' THEN 1
                    ELSE 2
                END
            ")
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (HistoricalGraduationApplication $record) => $this->historicalIndexRecord($record));

        return [
            'applications' => $applications,
            'filters' => $filters,
            'batchOptions' => [
                ['value' => 'all', 'label' => 'All Batches'],
                ['value' => 'january_2025', 'label' => 'January 2025'],
                ['value' => 'june_2025', 'label' => 'June 2025'],
            ],
            'statusOptions' => [
                ['value' => 'all', 'label' => 'All Statuses'],
                ['value' => 'approved', 'label' => 'Approved'],
                ['value' => 'pending', 'label' => 'Pending'],
                ['value' => 'incomplete', 'label' => 'Incomplete'],
                ['value' => 'unknown', 'label' => 'Unknown'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function historicalShowRecord(HistoricalGraduationApplication $record): array
    {
        $subjects = collect($record->subjects_json ?? [])
            ->map(fn (array $subject) => [
                'order' => $subject['order'] ?? null,
                'title' => $subject['title'] ?? null,
                'units' => $subject['units'] ?? null,
            ])
            ->values()
            ->all();

        return [
            'id' => $record->id,
            'source_period_label' => $record->source_period_label,
            'reference_code' => $record->reference_code,
            'student_id' => $record->student_id,
            'full_name' => $record->full_name,
            'attendance' => $record->attendance,
            'attendance_raw' => $record->attendance_raw,
            'status' => $record->status_bucket,
            'status_raw' => $record->status_raw,
            'submitted_at' => $record->submitted_at?->toIso8601String(),
            'program' => [
                'department_name' => $record->department_name,
                'course_name' => $record->course_name,
                'major_name' => $record->major_name,
                'degree_title' => $record->degree_title,
            ],
            'personal' => [
                'first_name' => $record->first_name,
                'middle_name' => $record->middle_name,
                'last_name' => $record->last_name,
                'sex' => $record->sex,
                'civil_status' => $record->civil_status,
                'religion' => $record->religion,
                'nationality' => $record->nationality,
                'date_of_birth' => $record->date_of_birth,
                'place_of_birth' => $record->place_of_birth,
            ],
            'contacts' => [
                'email' => $record->email,
                'contact_number' => $record->contact_number,
                'address' => $record->address,
            ],
            'thesis' => [
                'title' => $record->thesis_title,
                'adviser' => $record->thesis_adviser,
            ],
            'subjects' => $subjects,
            'education_history' => $record->education_history_json ?? [],
            'metadata' => [
                'source_batch' => $record->source_batch,
                'source_table' => $record->source_table,
                'source_row_id' => $record->source_row_id,
                'source_created_at' => $record->source_created_at?->toIso8601String(),
                'source_updated_at' => $record->source_updated_at?->toIso8601String(),
            ],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     */
    private function historicalApplicationsQuery(array $filters): Builder
    {
        return HistoricalGraduationApplication::query()
            ->when($filters['search'] !== '', function (Builder $query) use ($filters) {
                $search = $filters['search'];

                $query->where(function (Builder $inner) use ($search) {
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
            ->when($filters['batch'] !== 'all', fn (Builder $query) => $query->where('source_batch', $filters['batch']))
            ->when($filters['status'] !== 'all', fn (Builder $query) => $query->where('status_bucket', $filters['status']));
    }

    /**
     * @return array<string, mixed>
     */
    private function historicalIndexRecord(HistoricalGraduationApplication $record): array
    {
        return [
            'id' => $record->id,
            'source_period_label' => $record->source_period_label,
            'reference_code' => $record->reference_code,
            'student_id' => $record->student_id,
            'full_name' => $record->full_name,
            'email' => $record->email,
            'department_name' => $record->department_name,
            'course_name' => $record->course_name,
            'major_name' => $record->major_name,
            'degree_title' => $record->degree_title,
            'attendance' => $record->attendance,
            'status' => $record->status_bucket,
            'status_raw' => $record->status_raw,
            'submitted_at' => $record->submitted_at?->toIso8601String(),
        ];
    }
}
