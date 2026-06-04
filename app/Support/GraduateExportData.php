<?php

namespace App\Support;

use App\Models\Application;
use App\Models\ApplicationWindow;
use DateTimeInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class GraduateExportData
{
    /**
     * @param  array<int, int>|null  $departmentIds
     * @return Collection<int, Application>
     */
    public static function applicationsForWindow(
        ApplicationWindow $window,
        ?array $departmentIds = null,
        ?string $departmentName = null,
        ?string $search = null,
    ): Collection {
        $query = $window->applications()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,last_name,middle_name,suffix,date_of_birth,nationality',
                'department:id,name,code',
                'course:id,name,code,department_id',
                'subjectEnrollments:id,application_id,subject_name,units,order',
            ]);

        if ($departmentIds !== null) {
            $query->whereIn('department_id', $departmentIds);
        }

        if ($departmentName) {
            $query->whereHas('department', function ($departmentQuery) use ($departmentName): void {
                $departmentQuery->where('name', $departmentName)
                    ->orWhere('code', $departmentName);
            });
        }

        if ($search) {
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery->where('application_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('student_id', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhereHas('profile', function ($profileQuery) use ($search) {
                                $profileQuery->where('first_name', 'like', "%{$search}%")
                                    ->orWhere('last_name', 'like', "%{$search}%")
                                    ->orWhere('middle_name', 'like', "%{$search}%")
                                    ->orWhere('suffix', 'like', "%{$search}%");
                            });
                    })
                    ->orWhereHas('department', function ($departmentQuery) use ($search) {
                        $departmentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('course', function ($courseQuery) use ($search) {
                        $courseQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        return $query->get();
    }

    /**
     * @param  Collection<int, Application>  $applications
     * @return array<string, mixed>
     */
    public static function build(ApplicationWindow $window, Collection $applications, ?string $scopeLabel = null): array
    {
        $graduates = $applications
            ->map(fn (Application $application) => self::graduateRow($application))
            ->sortBy([
                ['department', 'asc'],
                ['degree', 'asc'],
                ['major', 'asc'],
                ['thesis_type_sort', 'asc'],
                ['sort_name', 'asc'],
            ])
            ->values();

        $departments = $graduates
            ->groupBy('department_code')
            ->map(function (Collection $departmentRows, string $departmentCode) {
                $programs = $departmentRows
                    ->groupBy('degree')
                    ->map(function (Collection $programRows, string $degree) {
                        $majors = $programRows
                            ->groupBy('major')
                            ->map(function (Collection $majorRows, string $major) {
                                $thesisGroups = $majorRows
                                    ->groupBy('thesis_type')
                                    ->map(function (Collection $thesisRows, string $thesisType) {
                                        return [
                                            'type' => $thesisType,
                                            'total' => $thesisRows->count(),
                                            'graduates' => $thesisRows->values()->all(),
                                        ];
                                    })
                                    ->sortBy(fn (array $group) => $group['type'] === 'With Thesis/Dissertation' ? 0 : 1)
                                    ->values()
                                    ->all();

                                return [
                                    'name' => $major,
                                    'total' => $majorRows->count(),
                                    'attendance' => self::attendanceCounts($majorRows),
                                    'nationalities' => self::nationalityCounts($majorRows),
                                    'thesis_groups' => $thesisGroups,
                                ];
                            })
                            ->values()
                            ->all();

                        return [
                            'name' => $degree,
                            'total' => $programRows->count(),
                            'attendance' => self::attendanceCounts($programRows),
                            'nationalities' => self::nationalityCounts($programRows),
                            'majors' => $majors,
                        ];
                    })
                    ->values()
                    ->all();

                $first = $departmentRows->first();

                return [
                    'code' => $departmentCode,
                    'name' => $first['department_name'] ?? $departmentCode,
                    'total' => $departmentRows->count(),
                    'attendance' => self::attendanceCounts($departmentRows),
                    'nationalities' => self::nationalityCounts($departmentRows),
                    'programs' => $programs,
                ];
            })
            ->values()
            ->all();

        return [
            'window_title' => self::titleCase($window->title),
            'scope_label' => $scopeLabel ?: 'All Departments',
            'generated_at' => now(),
            'total' => $graduates->count(),
            'departments' => $departments,
        ];
    }

    public static function titleCase(?string $value, string $fallback = ''): string
    {
        $clean = self::cleanText($value);

        if ($clean === '' || self::isBlankLike($clean)) {
            return $fallback;
        }

        $title = Str::of($clean)->lower()->title()->toString();
        $words = explode(' ', $title);
        $minorWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'vs', 'via', 'with'];
        $lastIndex = count($words) - 1;

        foreach ($words as $index => $word) {
            $plain = trim($word, " \t\n\r\0\x0B.,:;()[]{}");

            if ($index > 0 && $index < $lastIndex && in_array(Str::lower($plain), $minorWords, true)) {
                $words[$index] = Str::lower($word);
            }
        }

        $title = implode(' ', $words);
        $replacements = [
            'Spup' => 'SPUP',
            'Phd' => 'PhD',
            'Ph.D' => 'Ph.D.',
            'Dnp' => 'DNP',
            'Bsn' => 'BSN',
            'Bsit' => 'BSIT',
            'Bsed' => 'BSED',
            'Beed' => 'BEED',
            'Usa' => 'USA',
            'Uae' => 'UAE',
        ];

        foreach ($replacements as $needle => $replacement) {
            $title = preg_replace('/\b'.preg_quote($needle, '/').'\b/u', $replacement, $title) ?? $title;
        }

        return $title;
    }

    public static function safeFileName(string $value): string
    {
        $safe = preg_replace('/[\\\\\/:\*\?"<>\|]+/', '-', $value) ?: 'Graduates';

        return trim($safe, " \t\n\r\0\x0B.-") ?: 'Graduates';
    }

    /**
     * @return array<string, mixed>
     */
    private static function graduateRow(Application $application): array
    {
        $profile = $application->user?->profile;
        $department = $application->department?->code ?: self::titleCase($application->department?->name, 'No Department');
        $departmentName = self::titleCase($application->department?->name, $department);
        $degree = self::titleCase($application->course?->name ?: $application->degree_title, 'No Degree');
        $major = self::titleCase($application->major, 'No Major');
        $thesisType = self::thesisType($application);
        $nationality = NationalityNormalizer::normalize($profile?->nationality) ?? '';
        $birthday = self::dateValue($profile?->date_of_birth);

        return [
            'application_number' => (string) ($application->application_number ?? ''),
            'student_id' => (string) ($application->user?->student_id ?? ''),
            'name' => self::studentName($application),
            'birthday' => $birthday,
            'nationality' => $nationality,
            'department' => $department,
            'department_code' => $department,
            'department_name' => $departmentName,
            'degree' => $degree,
            'major' => $major,
            'presence' => (string) ($application->presence ?? ''),
            'attendance' => self::titleCase($application->presence, 'N/A'),
            'thesis_type' => $thesisType,
            'thesis_type_sort' => $thesisType === 'With Thesis/Dissertation' ? 0 : 1,
            'thesis_title' => $thesisType === 'With Thesis/Dissertation'
                ? self::titleCase($application->thesis_dissertation_title)
                : '',
            'thesis_adviser' => $thesisType === 'With Thesis/Dissertation'
                ? self::titleCase($application->thesis_dissertation_adviser)
                : '',
            'application_status' => self::titleCase(str_replace('_', ' ', (string) $application->status)),
            'status' => self::titleCase(str_replace('_', ' ', (string) $application->status)),
            'sort_name' => Str::lower(implode(' ', array_filter([
                $profile?->last_name,
                $profile?->first_name,
                $profile?->middle_name,
                $profile?->suffix,
                $application->user?->name,
            ]))),
        ];
    }

    private static function studentName(Application $application): string
    {
        $profile = $application->user?->profile;

        if (! $profile) {
            return self::titleCase($application->user?->name, 'Unknown');
        }

        $lastName = self::titleCase($profile->last_name);
        $firstMiddleSuffix = collect([
            self::titleCase($profile->first_name),
            self::titleCase($profile->middle_name),
            self::titleCase($profile->suffix),
        ])->filter()->implode(' ');

        if ($lastName !== '' && $firstMiddleSuffix !== '') {
            return "{$lastName}, {$firstMiddleSuffix}";
        }

        return $lastName ?: ($firstMiddleSuffix ?: self::titleCase($application->user?->name, 'Unknown'));
    }

    private static function dateValue(mixed $value): string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('F j, Y');
        }

        $date = trim((string) $value);

        if ($date === '') {
            return '';
        }

        $timestamp = strtotime($date);

        return $timestamp ? date('F j, Y', $timestamp) : $date;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array{attending: int, not_attending: int}
     */
    private static function attendanceCounts(Collection $rows): array
    {
        return [
            'attending' => $rows->where('presence', 'attending')->count(),
            'not_attending' => $rows->where('presence', 'not attending')->count(),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return array<int, array{nationality: string, count: int}>
     */
    private static function nationalityCounts(Collection $rows): array
    {
        return $rows
            ->pluck('nationality')
            ->filter()
            ->groupBy(fn (string $nationality) => $nationality)
            ->map(fn (Collection $group, string $nationality) => [
                'nationality' => $nationality,
                'count' => $group->count(),
            ])
            ->values()
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    private static function thesisType(Application $application): string
    {
        $title = self::cleanText($application->thesis_dissertation_title);
        $degree = self::cleanText($application->degree_title.' '.$application->course?->name);
        $subjects = $application->relationLoaded('subjectEnrollments')
            ? self::cleanText($application->subjectEnrollments->pluck('subject_name')->implode(' '))
            : '';
        $haystack = Str::lower(trim("{$title} {$degree} {$subjects}"));

        if ($haystack === '' || self::isBlankLike($title)) {
            return self::subjectTextLooksWithThesis($subjects) ? 'With Thesis/Dissertation' : 'Non-Thesis';
        }

        if (preg_match('/\b(non|none|no)\s*[- ]?\s*thesis\b/u', $haystack)
            || preg_match('/\bnot\s+applicable\b/u', $haystack)
            || preg_match('/\bcapstone\b/u', $haystack)) {
            return 'Non-Thesis';
        }

        if ($title !== '' && ! self::isBlankLike($title)) {
            return 'With Thesis/Dissertation';
        }

        return self::subjectTextLooksWithThesis($subjects) ? 'With Thesis/Dissertation' : 'Non-Thesis';
    }

    private static function subjectTextLooksWithThesis(string $subjects): bool
    {
        $subjects = Str::lower($subjects);

        return ! preg_match('/\b(non|none|no)\s*[- ]?\s*thesis\b/u', $subjects)
            && preg_match('/\b(thesis|dissertation)\b/u', $subjects);
    }

    private static function cleanText(?string $value): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', (string) $value));
    }

    private static function isBlankLike(string $value): bool
    {
        $normalized = Str::lower(trim($value));
        $normalized = preg_replace('/[\s\.\-_\/]+/u', '', $normalized) ?? $normalized;

        return in_array($normalized, ['na', 'n/a', 'none', 'null', 'nil', 'notapplicable'], true);
    }
}
