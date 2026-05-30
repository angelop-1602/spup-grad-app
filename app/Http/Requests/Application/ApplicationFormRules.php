<?php

namespace App\Http\Requests\Application;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApplicationFormRules
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public static function make(FormRequest $request, bool $includeWindowId = true): array
    {
        $rules = [
            'department_id' => ['required', 'exists:departments,id'],
            'course_id' => [
                'required',
                'exists:courses,id',
                Rule::exists('courses', 'id')->where('department_id', $request->input('department_id')),
            ],
            'major' => ['nullable', 'string', 'max:255'],
            'degree_title' => ['required', 'string', 'max:255'],
            'presence' => ['required', 'string', Rule::in(['attending', 'not attending'])],
            'subject_enrollments' => ['nullable', 'array', 'max:6'],
            'subject_enrollments.*.subject_name' => ['required_with:subject_enrollments', 'string', 'max:255'],
            'subject_enrollments.*.units' => ['required_with:subject_enrollments', 'integer', 'min:0', 'max:10'],
            'graduate_subjects' => ['nullable', 'array'],
            'graduate_subjects.*.subject_code' => ['required_with:graduate_subjects', 'string', 'max:255'],
            'graduate_subjects.*.subject_title' => ['required_with:graduate_subjects', 'string', 'max:255'],
            'graduate_subjects.*.units' => ['required_with:graduate_subjects', 'nullable', 'integer', 'min:0'],
            'thesis_dissertation_title' => ['nullable', 'string', 'max:500'],
            'thesis_dissertation_adviser' => ['nullable', 'string', 'max:255'],
            'shs_11_school' => ['nullable', 'string', 'max:255'],
            'shs_11_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'shs_12_school' => ['nullable', 'string', 'max:255'],
            'shs_12_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'last_name' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date_format:Y-m-d', 'before:today'],
            'place_of_birth' => ['required', 'string', 'max:255'],
            'sex' => ['required', 'string', Rule::in(['Male', 'Female', 'Prefer not to say'])],
            'civil_status' => ['required', 'string', 'max:255'],
            'religion' => ['nullable', 'string', 'max:255'],
            'nationality' => ['required', 'string', 'max:255'],
            'permanent_address' => ['required', 'string'],
            'contact_number' => ['required', 'string', 'regex:/^(\\+[1-9]\\d{1,14}|\\d{7,15})$/'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png', 'max:2048', 'dimensions:min_width=200,min_height=200'],
            'highest_education_level' => ['required', 'string', Rule::in(['elementary', 'junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'])],
            'college_degree' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:85',
            ],
            'college_school_name' => [
                'nullable',
                'string',
                'max:85',
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['college', 'masters', 'doctor'], true)
                    && ! $request->boolean('is_transferee')),
            ],
            'college_year_graduated' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'college_transferee_note' => ['nullable', 'string'],
            'is_transferee' => ['nullable', 'boolean'],
            'grad_masteral_school' => ['nullable', 'string', 'max:255'],
            'grad_masteral_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'grad_doctoral_school' => ['nullable', 'string', 'max:255'],
            'grad_doctoral_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_1_school' => ['required', 'string', 'max:255'],
            'grade_1_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_2_school' => ['required', 'string', 'max:255'],
            'grade_2_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_3_school' => ['required', 'string', 'max:255'],
            'grade_3_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_4_school' => ['required', 'string', 'max:255'],
            'grade_4_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_5_school' => ['required', 'string', 'max:255'],
            'grade_5_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'grade_6_school' => ['required', 'string', 'max:255'],
            'grade_6_year' => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            'jhs_1_school' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'jhs_1_year' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'jhs_2_school' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'jhs_2_year' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'jhs_3_school' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'jhs_3_year' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'jhs_4_school' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'jhs_4_year' => [
                Rule::requiredIf(fn () => in_array($request->input('highest_education_level'), ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
        ];

        if ($includeWindowId) {
            $rules = ['window_id' => ['required', 'exists:application_windows,id'], ...$rules];
        }

        return $rules;
    }

    /**
     * @return array<int, mixed>
     */
    public static function studentIdRules(FormRequest $request, ?int $ignoreUserId = null): array
    {
        return [
            'required',
            'string',
            'max:255',
            'regex:/^[A-Za-z0-9-]+$/',
            Rule::unique(User::class, 'student_id')->ignore($ignoreUserId),
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'contact_number.regex' => 'Contact number must use digits only, like 09171234567 or +639171234567.',
            'date_of_birth.date_format' => 'Date of birth must use YYYY-MM-DD format.',
            'date_of_birth.before' => 'Date of birth must be before today.',
            'photo.image' => 'Photo must be a valid JPG or PNG image.',
            'photo.mimes' => 'Photo must be a JPG or PNG image.',
            'photo.max' => 'Photo must not be larger than 2MB.',
            'photo.dimensions' => 'Photo must be at least 200 by 200 pixels.',
            'student_id.regex' => 'The student ID may only contain letters, numbers, and hyphens (-), and must not be an email address.',
            'student_id.unique' => 'An account with this Student ID already exists.',
        ];
    }
}
