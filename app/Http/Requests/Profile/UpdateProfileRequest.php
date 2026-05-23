<?php

namespace App\Http\Requests\Profile;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert empty strings to null for year fields to allow nullable validation
        $yearFields = [
            'grad_masteral_year',
            'grad_doctoral_year',
            'shs_11_year',
            'shs_12_year',
        ];

        foreach ($yearFields as $field) {
            $value = $this->input($field);
            // Convert empty string, null, or falsy values to null
            if ($value === '' || $value === null || $value === false) {
                $this->merge([$field => null]);
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Personal Info
            'last_name' => ['required', 'string', 'max:255'],
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:255'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'place_of_birth' => ['required', 'string', 'max:255'],
            'sex' => ['required', 'string', Rule::in(['Male', 'Female', 'Prefer not to say'])],
            'civil_status' => ['required', 'string', 'max:255'],
            'religion' => ['nullable', 'string', 'max:255'],
            'nationality' => ['required', 'string', 'max:255'],
            'permanent_address' => ['required', 'string'],
            'contact_number' => [
                'required',
                'string',
                'regex:/^(\+[1-9]\d{1,14}|\d{7,15})$/',
            ],
            'photo' => ['nullable', 'image', 'mimes:jpeg,jpg,png', 'max:2048', 'dimensions:min_width=200,min_height=200'],
            'highest_education_level' => [
                'required',
                'string',
                Rule::in(['elementary', 'junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor']),
            ],

            // Educational Background - Legacy fields (kept for backward compatibility)
            'grade_school_name' => ['nullable', 'string', 'max:255'],
            'grade_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'junior_high_school_name' => ['nullable', 'string', 'max:255'],
            'junior_high_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'senior_high_school_name' => ['nullable', 'string', 'max:255'],
            'senior_high_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            // College fields - required only when highest education is college or higher
            'college_degree' => [
                Rule::requiredIf(fn () => in_array($this->highest_education_level, ['college', 'masters', 'doctor'], true)),
                'nullable',
                'string',
                'max:85',
            ],
            // Require college/university name only when NOT graduated in SPUP (is_transferee = false)
            'college_school_name' => [
                'nullable',
                'string',
                'max:85',
                Rule::requiredIf(fn () => in_array($this->highest_education_level, ['college', 'masters', 'doctor'], true)
                    && ! $this->boolean('is_transferee')),
            ],
            'college_year_graduated' => [
                Rule::requiredIf(fn () => in_array($this->highest_education_level, ['college', 'masters', 'doctor'], true)),
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'college_transferee_note' => ['nullable', 'string'],
            'is_transferee' => ['nullable', 'boolean'],
            'graduate_school_degree' => ['nullable', 'string', 'max:255'],
            'graduate_school_school_name' => ['nullable', 'string', 'max:255'],
            'graduate_school_year_graduated' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],

            // Grade School (Grade 1-6) - required for all profiles
            ...array_merge(...array_map(fn ($i) => [
                "grade_{$i}_school" => ['required', 'string', 'max:255'],
                "grade_{$i}_year" => ['required', 'integer', 'min:1900', 'max:'.date('Y')],
            ], range(1, 6))),

            // Junior High School (1st-4th Year) - required when highest education includes JHS or higher
            ...array_merge(...array_map(function ($i) {
                return [
                    "jhs_{$i}_school" => [
                        Rule::requiredIf(fn () => in_array($this->highest_education_level, ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                        'nullable',
                        'string',
                        'max:255',
                    ],
                    "jhs_{$i}_year" => [
                        Rule::requiredIf(fn () => in_array($this->highest_education_level, ['junior_high_school', 'senior_high_school', 'college', 'masters', 'doctor'], true)),
                        'nullable',
                        'integer',
                        'min:1900',
                        'max:'.date('Y'),
                    ],
                ];
            }, range(1, 4))),

            // Senior High School (Grade 11-12)
            'shs_11_school' => ['nullable', 'string', 'max:255'],
            'shs_11_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],
            'shs_12_school' => ['nullable', 'string', 'max:255'],
            'shs_12_year' => ['nullable', 'integer', 'min:1900', 'max:'.date('Y')],

            // Graduate School
            'grad_masteral_school' => ['nullable', 'string', 'max:255'],
            'grad_masteral_year' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    // Allow null (empty/not filled)
                    if ($value === null) {
                        return;
                    }
                    // Convert to integer if it's a string
                    $intValue = is_numeric($value) ? (int) $value : null;
                    if ($intValue === null) {
                        $fail('The '.str_replace('_', ' ', $attribute).' must be a number.');

                        return;
                    }
                    // Allow 0 (for not applicable) or valid year (1900-current)
                    if ($intValue !== 0 && ($intValue < 1900 || $intValue > date('Y'))) {
                        $fail('The '.str_replace('_', ' ', $attribute).' must be 0 (for not applicable) or a valid year between 1900 and '.date('Y').'.');
                    }
                },
            ],
            'grad_doctoral_school' => ['nullable', 'string', 'max:255'],
            'grad_doctoral_year' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    // Allow null (empty/not filled)
                    if ($value === null) {
                        return;
                    }
                    // Convert to integer if it's a string
                    $intValue = is_numeric($value) ? (int) $value : null;
                    if ($intValue === null) {
                        $fail('The '.str_replace('_', ' ', $attribute).' must be a number.');

                        return;
                    }
                    // Allow 0 (for not applicable) or valid year (1900-current)
                    if ($intValue !== 0 && ($intValue < 1900 || $intValue > date('Y'))) {
                        $fail('The '.str_replace('_', ' ', $attribute).' must be 0 (for not applicable) or a valid year between 1900 and '.date('Y').'.');
                    }
                },
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'contact_number.regex' => 'Contact number must be in international format (+[country code][number]) or local format (7-15 digits)',
            'date_of_birth.before' => 'Date of birth must be before today',
        ];
    }
}
