<?php

namespace App\Http\Requests\Application;

use App\Http\Requests\Application\Concerns\NormalizesApplicationInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreApplicationRequest extends FormRequest
{
    use NormalizesApplicationInput;

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
        $this->normalizeApplicationInput();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return ApplicationFormRules::make($this, true);
    }

    public function messages(): array
    {
        return ApplicationFormRules::messages();
    }
}
