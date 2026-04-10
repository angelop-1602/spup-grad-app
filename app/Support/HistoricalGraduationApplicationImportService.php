<?php

namespace App\Support;

use App\Models\HistoricalGraduationApplication;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class HistoricalGraduationApplicationImportService
{
    private const BATCH_JANUARY_2025 = 'january_2025';

    private const BATCH_JUNE_2025 = 'june_2025';

    /**
     * Import both historical sources into the isolated table.
     *
     * @return array<string, int>
     */
    public function import(): array
    {
        $januaryRows = $this->mapJanuaryApplications(
            $this->parseInsertRows(
                File::get(database_path('seeders/january-2025_application_graduation.sql')),
                'application_graduation'
            )
        );

        $juneSql = File::get(database_path('seeders/june-2025_application_graduation.sql'));
        $juneRows = $this->mapJuneApplications($juneSql);

        $this->upsert($januaryRows->all());
        $this->upsert($juneRows->all());

        return [
            'january_2025' => $januaryRows->count(),
            'june_2025' => $juneRows->count(),
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<int, array<string, mixed>>
     */
    private function mapJanuaryApplications(Collection $rows): Collection
    {
        return $rows->map(function (array $row) {
            $degreeTitle = $this->cleanText($row['degree'] ?? null);
            $majorName = $this->cleanNullableText($row['major'] ?? null);

            return $this->basePayload(
                sourceBatch: self::BATCH_JANUARY_2025,
                sourceTable: 'application_graduation',
                sourceRowId: (int) $row['id'],
                sourcePeriodLabel: $this->cleanText($row['grad_date'] ?? 'January 2025'),
                fullName: $this->buildFullName(
                    $row['firstname'] ?? null,
                    $row['middlename'] ?? null,
                    $row['lastname'] ?? null
                ),
            ) + [
                'last_name' => $this->cleanNullableText($row['lastname'] ?? null),
                'first_name' => $this->cleanNullableText($row['firstname'] ?? null),
                'middle_name' => $this->cleanNullableText($row['middlename'] ?? null),
                'attendance' => $this->normalizeJanuaryAttendance($row['grad_appearance'] ?? null),
                'attendance_raw' => $this->cleanNullableText($row['grad_appearance'] ?? null),
                'status_bucket' => 'unknown',
                'status_raw' => null,
                'email' => $this->cleanNullableText($row['email'] ?? null),
                'contact_number' => $this->cleanNullableText($row['contact'] ?? null),
                'department_name' => $this->cleanNullableText($row['department'] ?? null),
                'course_name' => $degreeTitle,
                'major_name' => $majorName,
                'degree_title' => $degreeTitle,
                'sex' => $this->cleanNullableText($row['sex'] ?? null),
                'civil_status' => null,
                'religion' => null,
                'nationality' => null,
                'address' => null,
                'date_of_birth' => null,
                'place_of_birth' => null,
                'thesis_title' => null,
                'thesis_adviser' => null,
                'submitted_at' => null,
                'source_created_at' => null,
                'source_updated_at' => null,
                'subjects_json' => [],
                'education_history_json' => [],
                'source_payload_json' => $row,
            ];
        });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function mapJuneApplications(string $sql): Collection
    {
        $applications = $this->parseInsertRows($sql, 'appreg');
        $departments = $this->keyById($this->parseInsertRows($sql, 'department'));
        $courses = $this->keyById($this->parseInsertRows($sql, 'courses'));
        $majors = $this->keyById($this->parseInsertRows($sql, 'major'));
        $nationalities = $this->keyById($this->parseInsertRows($sql, 'nationalities'));

        return $applications->map(function (array $row) use ($departments, $courses, $majors, $nationalities) {
            $course = $courses->get((string) ($row['course_id'] ?? ''), []);
            $major = $majors->get((string) ($row['major_id'] ?? ''), []);
            $department = $departments->get((string) ($row['dept_id'] ?? ''), []);
            $nationality = $nationalities->get((string) ($row['nationality_id'] ?? ''), []);

            $courseName = $this->cleanNullableText($course['course_name'] ?? null);
            $majorName = $this->cleanNullableText($major['major_name'] ?? null);

            return $this->basePayload(
                sourceBatch: self::BATCH_JUNE_2025,
                sourceTable: 'appreg',
                sourceRowId: (int) $row['id'],
                sourcePeriodLabel: 'June 2025',
                fullName: $this->buildFullName(
                    $row['first_name'] ?? null,
                    $row['middle_name'] ?? null,
                    $row['last_name'] ?? null
                ),
            ) + [
                'reference_code' => $this->cleanNullableText($row['reference_code'] ?? null),
                'student_id' => $this->cleanNullableText($row['student_id'] ?? null),
                'last_name' => $this->cleanNullableText($row['last_name'] ?? null),
                'first_name' => $this->cleanNullableText($row['first_name'] ?? null),
                'middle_name' => $this->cleanNullableText($row['middle_name'] ?? null),
                'attendance' => $this->normalizeJuneAttendance($row['attending'] ?? null),
                'attendance_raw' => $this->cleanNullableText($row['attending'] ?? null),
                'status_bucket' => $this->normalizeJuneStatus($row['status'] ?? null),
                'status_raw' => $this->cleanNullableText($row['status'] ?? null),
                'email' => $this->cleanNullableText($row['email'] ?? null),
                'contact_number' => $this->cleanNullableText($row['connum'] ?? null),
                'department_name' => $this->cleanNullableText($department['dep_name'] ?? null),
                'course_name' => $courseName,
                'major_name' => $majorName,
                'degree_title' => $this->buildDegreeTitle($courseName, $majorName),
                'sex' => $this->cleanNullableText($row['sex'] ?? null),
                'civil_status' => $this->cleanNullableText($row['civilstatus'] ?? null),
                'religion' => $this->cleanNullableText($row['religion'] ?? null),
                'nationality' => $this->cleanNullableText($nationality['nationality'] ?? null),
                'address' => $this->cleanNullableText($row['address'] ?? null),
                'date_of_birth' => $this->cleanNullableText($row['dateofbirth'] ?? null),
                'place_of_birth' => $this->cleanNullableText($row['placeofbirth'] ?? null),
                'thesis_title' => $this->cleanNullableText($row['ttitle'] ?? null),
                'thesis_adviser' => $this->cleanNullableText($row['tadviser'] ?? null),
                'submitted_at' => $this->parseSourceDate($row['datesubmit'] ?? null),
                'source_created_at' => $this->parseSourceTimestamp($row['created_at'] ?? null),
                'source_updated_at' => $this->parseSourceTimestamp($row['updated_at'] ?? null),
                'subjects_json' => $this->buildSubjects($row),
                'education_history_json' => $this->buildEducationHistory($row),
                'source_payload_json' => $row,
            ];
        });
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function upsert(array $rows): void
    {
        if ($rows === []) {
            return;
        }

        $rows = array_map(function (array $row) {
            foreach (['subjects_json', 'education_history_json', 'source_payload_json'] as $jsonColumn) {
                $row[$jsonColumn] = json_encode(
                    $row[$jsonColumn] ?? [],
                    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                );
            }

            return $row;
        }, $rows);

        DB::table((new HistoricalGraduationApplication)->getTable())->upsert(
            $rows,
            ['source_batch', 'source_table', 'source_row_id'],
            [
                'source_period_label',
                'reference_code',
                'student_id',
                'full_name',
                'last_name',
                'first_name',
                'middle_name',
                'attendance',
                'attendance_raw',
                'status_bucket',
                'status_raw',
                'email',
                'contact_number',
                'department_name',
                'course_name',
                'major_name',
                'degree_title',
                'sex',
                'civil_status',
                'religion',
                'nationality',
                'address',
                'date_of_birth',
                'place_of_birth',
                'thesis_title',
                'thesis_adviser',
                'submitted_at',
                'source_created_at',
                'source_updated_at',
                'subjects_json',
                'education_history_json',
                'source_payload_json',
                'updated_at',
            ]
        );
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function parseInsertRows(string $sql, string $table): Collection
    {
        $rows = [];

        foreach ($this->extractInsertStatements($sql, $table) as $statement) {
            preg_match(
                sprintf('/INSERT INTO `%s` \((.*?)\) VALUES\s*(.*);/si', preg_quote($table, '/')),
                trim($statement),
                $matches
            );

            if (! isset($matches[1], $matches[2])) {
                continue;
            }

            $columns = $this->parseColumns($matches[1]);

            foreach ($this->splitRows($matches[2]) as $rowString) {
                $values = $this->parseRowValues($rowString);
                $rows[] = array_combine($columns, $values);
            }
        }

        return collect($rows);
    }

    /**
     * @return array<int, string>
     */
    private function extractInsertStatements(string $sql, string $table): array
    {
        $needle = "INSERT INTO `{$table}`";
        $statements = [];
        $offset = 0;

        while (($start = strpos($sql, $needle, $offset)) !== false) {
            $end = $this->findStatementEnd($sql, $start);
            $statements[] = substr($sql, $start, ($end - $start) + 1);
            $offset = $end + 1;
        }

        return $statements;
    }

    private function findStatementEnd(string $sql, int $start): int
    {
        $inString = false;
        $escaped = false;
        $length = strlen($sql);

        for ($index = $start; $index < $length; $index++) {
            $character = $sql[$index];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;

                    continue;
                }

                if ($character === '\\') {
                    $escaped = true;

                    continue;
                }

                if ($character === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($character === "'") {
                $inString = true;

                continue;
            }

            if ($character === ';') {
                return $index;
            }
        }

        return $length - 1;
    }

    /**
     * @return array<int, string>
     */
    private function parseColumns(string $columnString): array
    {
        return array_map(
            static fn (string $column) => trim($column, " \t\n\r\0\x0B`"),
            explode(',', $columnString)
        );
    }

    /**
     * @return array<int, string>
     */
    private function splitRows(string $valueString): array
    {
        $rows = [];
        $depth = 0;
        $inString = false;
        $escaped = false;
        $start = null;
        $length = strlen($valueString);

        for ($index = 0; $index < $length; $index++) {
            $character = $valueString[$index];

            if ($inString) {
                if ($escaped) {
                    $escaped = false;

                    continue;
                }

                if ($character === '\\') {
                    $escaped = true;

                    continue;
                }

                if ($character === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($character === "'") {
                $inString = true;

                continue;
            }

            if ($character === '(') {
                if ($depth === 0) {
                    $start = $index + 1;
                }

                $depth++;

                continue;
            }

            if ($character === ')') {
                $depth--;

                if ($depth === 0 && $start !== null) {
                    $rows[] = substr($valueString, $start, $index - $start);
                    $start = null;
                }
            }
        }

        return $rows;
    }

    /**
     * @return array<int, mixed>
     */
    private function parseRowValues(string $rowString): array
    {
        $values = [];
        $current = '';
        $inString = false;
        $escaped = false;
        $length = strlen($rowString);

        for ($index = 0; $index < $length; $index++) {
            $character = $rowString[$index];

            if ($inString) {
                if ($escaped) {
                    $current .= $character;
                    $escaped = false;

                    continue;
                }

                if ($character === '\\') {
                    $escaped = true;
                    $current .= $character;

                    continue;
                }

                if ($character === "'") {
                    $inString = false;
                    $current .= $character;

                    continue;
                }

                $current .= $character;

                continue;
            }

            if ($character === "'") {
                $inString = true;
                $current .= $character;

                continue;
            }

            if ($character === ',') {
                $values[] = $this->decodeValue($current);
                $current = '';

                continue;
            }

            $current .= $character;
        }

        $values[] = $this->decodeValue($current);

        return $values;
    }

    private function decodeValue(string $value): mixed
    {
        $value = trim($value);

        if (strcasecmp($value, 'NULL') === 0) {
            return null;
        }

        if (str_starts_with($value, "'") && str_ends_with($value, "'")) {
            $value = substr($value, 1, -1);

            return stripcslashes($value);
        }

        if (is_numeric($value)) {
            return str_contains($value, '.') ? (float) $value : (int) $value;
        }

        return $value;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $rows
     * @return Collection<string, array<string, mixed>>
     */
    private function keyById(Collection $rows): Collection
    {
        return $rows->keyBy(static fn (array $row) => (string) ($row['id'] ?? ''));
    }

    /**
     * @return array<string, mixed>
     */
    private function basePayload(
        string $sourceBatch,
        string $sourceTable,
        int $sourceRowId,
        string $sourcePeriodLabel,
        string $fullName,
    ): array {
        $now = now();

        return [
            'source_batch' => $sourceBatch,
            'source_table' => $sourceTable,
            'source_row_id' => $sourceRowId,
            'source_period_label' => $sourcePeriodLabel,
            'reference_code' => null,
            'student_id' => null,
            'full_name' => $fullName,
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }

    private function buildFullName(mixed $firstName, mixed $middleName, mixed $lastName): string
    {
        return collect([
            $this->cleanNullableText($firstName),
            $this->cleanNullableText($middleName),
            $this->cleanNullableText($lastName),
        ])->filter()->implode(' ') ?: 'N/A';
    }

    private function buildDegreeTitle(?string $courseName, ?string $majorName): ?string
    {
        if (! $courseName && ! $majorName) {
            return null;
        }

        if (! $majorName) {
            return $courseName;
        }

        return "{$courseName} - {$majorName}";
    }

    private function normalizeJanuaryAttendance(mixed $value): ?string
    {
        $value = strtolower((string) $value);

        return match ($value) {
            'attending' => 'attending',
            'not attending' => 'not attending',
            default => null,
        };
    }

    private function normalizeJuneAttendance(mixed $value): ?string
    {
        return match ((string) $value) {
            '1' => 'attending',
            '0' => 'not attending',
            default => null,
        };
    }

    private function normalizeJuneStatus(mixed $value): string
    {
        $value = strtolower((string) $value);

        if (str_contains($value, 'verif')) {
            return 'approved';
        }

        if (str_contains($value, 'deficien')) {
            return 'incomplete';
        }

        if ($value !== '') {
            return 'pending';
        }

        return 'unknown';
    }

    private function parseSourceDate(mixed $value): ?Carbon
    {
        $value = $this->cleanNullableText($value);

        if (! $value) {
            return null;
        }

        foreach (['F d, Y', 'F j, Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->startOfDay();
            } catch (\Throwable) {
                continue;
            }
        }

        try {
            return Carbon::parse($value)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseSourceTimestamp(mixed $value): ?Carbon
    {
        $value = $this->cleanNullableText($value);

        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildSubjects(array $row): array
    {
        $subjects = [];

        for ($index = 1; $index <= 6; $index++) {
            $title = $this->cleanNullableText($row["s{$index}"] ?? null);
            $units = $this->cleanNullableText($row["u{$index}"] ?? null);

            if (! $title && ! $units) {
                continue;
            }

            $subjects[] = [
                'order' => $index,
                'title' => $title,
                'units' => $units,
            ];
        }

        return $subjects;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildEducationHistory(array $row): array
    {
        return [
            'elementary' => $this->buildSchoolYears(
                [
                    ['label' => 'Grade 1', 'school' => $row['g1school'] ?? null, 'year' => $row['g1year'] ?? null],
                    ['label' => 'Grade 2', 'school' => $row['g2school'] ?? null, 'year' => $row['g2year'] ?? null],
                    ['label' => 'Grade 3', 'school' => $row['g3school'] ?? null, 'year' => $row['g3year'] ?? null],
                    ['label' => 'Grade 4', 'school' => $row['g4school'] ?? null, 'year' => $row['g4year'] ?? null],
                    ['label' => 'Grade 5', 'school' => $row['g5school'] ?? null, 'year' => $row['g5year'] ?? null],
                    ['label' => 'Grade 6', 'school' => $row['g6school'] ?? null, 'year' => $row['g6year'] ?? null],
                ]
            ),
            'junior_high_school' => $this->buildSchoolYears(
                [
                    ['label' => 'Year 1', 'school' => $row['firstschool'] ?? null, 'year' => $row['firstyear'] ?? null],
                    ['label' => 'Year 2', 'school' => $row['secondschool'] ?? null, 'year' => $row['secondyear'] ?? null],
                    ['label' => 'Year 3', 'school' => $row['thirdschool'] ?? null, 'year' => $row['thirdyear'] ?? null],
                    ['label' => 'Year 4', 'school' => $row['forthschool'] ?? null, 'year' => $row['forthyear'] ?? null],
                ]
            ),
            'senior_high_school' => $this->buildSchoolYears(
                [
                    ['label' => 'Grade 11', 'school' => $row['g11school'] ?? null, 'year' => $row['g11year'] ?? null],
                    ['label' => 'Grade 12', 'school' => $row['g12school'] ?? null, 'year' => $row['g12year'] ?? null],
                ]
            ),
            'college' => [
                'degree' => $this->cleanNullableText($row['coldegree'] ?? null),
                'year' => $this->cleanNullableText($row['colyear'] ?? null),
            ],
            'masters' => [
                'school' => $this->cleanNullableText($row['mschool'] ?? null),
                'year' => $this->cleanNullableText($row['myear'] ?? null),
            ],
            'doctor' => [
                'school' => $this->cleanNullableText($row['dschool'] ?? null),
                'year' => $this->cleanNullableText($row['dyear'] ?? null),
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<int, array<string, string>>
     */
    private function buildSchoolYears(array $entries): array
    {
        return collect($entries)
            ->map(function (array $entry) {
                return [
                    'label' => (string) $entry['label'],
                    'school' => $this->cleanNullableText($entry['school'] ?? null),
                    'year' => $this->cleanNullableText($entry['year'] ?? null),
                ];
            })
            ->filter(fn (array $entry) => $entry['school'] || $entry['year'])
            ->values()
            ->all();
    }

    private function cleanText(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function cleanNullableText(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        if ($value === '') {
            return null;
        }

        $normalized = strtolower($value);

        if (in_array($normalized, ['n/a', 'na', 'none', '-', 'no', 'null'], true)) {
            return null;
        }

        if ($value === '0000') {
            return null;
        }

        return $value;
    }
}
