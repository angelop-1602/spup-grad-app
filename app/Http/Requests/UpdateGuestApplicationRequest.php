<?php

namespace App\Http\Requests;

use App\Http\Requests\Application\ApplicationFormRules;
use App\Http\Requests\Application\Concerns\NormalizesApplicationInput;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGuestApplicationRequest extends FormRequest
{
    use NormalizesApplicationInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeApplicationInput();
    }

    public function rules(): array
    {
        return ApplicationFormRules::make($this, false);
    }

    public function messages(): array
    {
        return ApplicationFormRules::messages();
    }
}
