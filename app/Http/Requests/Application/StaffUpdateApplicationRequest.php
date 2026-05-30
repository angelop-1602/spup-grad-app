<?php

namespace App\Http\Requests\Application;

use App\Http\Requests\Application\Concerns\NormalizesApplicationInput;
use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class StaffUpdateApplicationRequest extends FormRequest
{
    use NormalizesApplicationInput;

    public function authorize(): bool
    {
        return $this->route('application') instanceof Application;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeApplicationInput();
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Application|null $application */
        $application = $this->route('application');

        return [
            'student_id' => ApplicationFormRules::studentIdRules($this, $application?->user_id),
            ...ApplicationFormRules::make($this, false),
        ];
    }

    public function messages(): array
    {
        return ApplicationFormRules::messages();
    }
}
