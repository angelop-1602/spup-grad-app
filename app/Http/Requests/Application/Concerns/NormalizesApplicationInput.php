<?php

namespace App\Http\Requests\Application\Concerns;

trait NormalizesApplicationInput
{
    protected function normalizeApplicationInput(): void
    {
        if ($this->filled('contact_number')) {
            $contactNumber = preg_replace('/[\s\-\(\)]+/', '', (string) $this->input('contact_number'));

            $this->merge([
                'contact_number' => $contactNumber,
            ]);
        }

        if ($this->filled('student_id')) {
            $this->merge([
                'student_id' => trim((string) $this->input('student_id')),
            ]);
        }

        $profileFields = [
            'shs_11_school',
            'shs_11_year',
            'shs_12_school',
            'shs_12_year',
            'grade_1_school', 'grade_1_year',
            'grade_2_school', 'grade_2_year',
            'grade_3_school', 'grade_3_year',
            'grade_4_school', 'grade_4_year',
            'grade_5_school', 'grade_5_year',
            'grade_6_school', 'grade_6_year',
            'jhs_1_school', 'jhs_1_year',
            'jhs_2_school', 'jhs_2_year',
            'jhs_3_school', 'jhs_3_year',
            'jhs_4_school', 'jhs_4_year',
        ];

        foreach ($profileFields as $field) {
            $value = $this->input($field);

            if ($value === '' || $value === null || $value === false) {
                $this->merge([$field => null]);
            }
        }

        $optionalFields = [
            'major',
            'degree_title',
            'thesis_dissertation_title',
            'thesis_dissertation_adviser',
            'last_name',
            'first_name',
            'middle_name',
            'suffix',
            'date_of_birth',
            'place_of_birth',
            'sex',
            'civil_status',
            'religion',
            'nationality',
            'permanent_address',
            'contact_number',
            'highest_education_level',
            'college_degree',
            'college_school_name',
            'college_year_graduated',
            'college_transferee_note',
            'is_transferee',
            'grad_masteral_school',
            'grad_masteral_year',
            'grad_doctoral_school',
            'grad_doctoral_year',
        ];

        foreach ($optionalFields as $field) {
            $value = $this->input($field);

            if ($value === '' || $value === null) {
                $this->merge([$field => null]);
            }
        }

        $subjectEnrollments = $this->input('subject_enrollments');
        if (is_array($subjectEnrollments)) {
            $filtered = array_filter($subjectEnrollments, function ($enrollment) {
                return ! empty($enrollment['subject_name'] ?? '');
            });

            $normalized = array_map(function ($enrollment) {
                $units = $enrollment['units'] ?? 0;
                if ($units === '' || $units === null) {
                    $units = 0;
                }
                $enrollment['units'] = (int) $units;

                return $enrollment;
            }, $filtered);

            $this->merge([
                'subject_enrollments' => empty($normalized) ? null : array_values($normalized),
            ]);
        }

        $graduateSubjects = $this->input('graduate_subjects');
        if (is_array($graduateSubjects)) {
            $filtered = array_filter($graduateSubjects, function ($subject) {
                $hasCode = ! empty($subject['subject_code'] ?? '');
                $hasTitle = ! empty($subject['subject_title'] ?? '');

                return $hasCode || $hasTitle;
            });

            $normalized = array_map(function ($subject) {
                $units = $subject['units'] ?? 0;
                if ($units === '' || $units === null) {
                    $units = 0;
                } else {
                    $units = (int) $units;
                }
                $subject['units'] = $units;

                return $subject;
            }, $filtered);

            $this->merge([
                'graduate_subjects' => empty($normalized) ? null : array_values($normalized),
            ]);
        }
    }
}
