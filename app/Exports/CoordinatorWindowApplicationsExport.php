<?php

namespace App\Exports;

use App\Models\Application;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class CoordinatorWindowApplicationsExport implements FromCollection, WithHeadings
{
    public function __construct(
        protected int $windowId,
        protected array $departmentIds,
        protected ?string $search = null,
    ) {
    }

    public function collection(): Collection
    {
        $query = Application::query()
            ->with(['user.profile', 'department', 'course'])
            ->where('window_id', $this->windowId)
            ->whereIn('department_id', $this->departmentIds);

        if ($this->search) {
            $search = $this->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('user.profile', function ($query) use ($search) {
                    $query->where('first_name', 'like', '%'.$search.'%')
                        ->orWhere('last_name', 'like', '%'.$search.'%')
                        ->orWhere('middle_name', 'like', '%'.$search.'%')
                        ->orWhere('suffix', 'like', '%'.$search.'%');
                })
                    ->orWhereHas('user', function ($query) use ($search) {
                        $query->where('student_id', 'like', '%'.$search.'%');
                    });
            });
        }

        return $query
            ->get()
            ->map(function (Application $application) {
                $profile = $application->user->profile;
                
                // Format name as "Last, First Middle" for Excel export
                if ($profile && $profile->last_name) {
                    $firstMiddleSuffix = collect([
                        $profile->first_name ?? '',
                        $profile->middle_name ?? '',
                        $profile->suffix ?? '',
                    ])->filter()->implode(' ');
                    $name = $firstMiddleSuffix
                        ? $profile->last_name.', '.$firstMiddleSuffix
                        : $profile->last_name;
                } else {
                    $name = $application->user->name;
                }

                return [
                    'Student ID' => $application->user->student_id,
                    'Name' => $name,
                    'Department' => $application->department?->name,
                    'Course' => $application->course?->name,
                    'Major' => $application->major,
                    'Birthday' => $profile?->date_of_birth?->format('Y-m-d') ?? '',
                    'Thesis Title' => $application->thesis_dissertation_title ?? '',
                    'Thesis Advisor' => $application->thesis_dissertation_adviser ?? '',
                    'Status' => ucfirst(str_replace('_', ' ', $application->status)),
                    'Presence' => $application->presence === 'attending' ? 'Attending' : 'Not Attending',
                    'Submitted At' => $application->created_at->toDateTimeString(),
                    // Store last name for sorting
                    '_sort_last_name' => $profile?->last_name ?? '',
                ];
            })
            ->sortBy(function ($item) {
                return strtolower($item['_sort_last_name']);
            })
            ->map(function ($item) {
                unset($item['_sort_last_name']);
                
                return $item;
            })
            ->values();
    }

    public function headings(): array
    {
        return [
            'Student ID',
            'Name',
            'Department',
            'Course',
            'Major',
            'Birthday',
            'Thesis Title',
            'Thesis Advisor',
            'Status',
            'Presence',
            'Submitted At',
        ];
    }
}


