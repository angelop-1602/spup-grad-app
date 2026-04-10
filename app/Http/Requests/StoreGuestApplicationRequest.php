<?php

namespace App\Http\Requests;

use App\Http\Requests\Application\ApplicationFormRules;
use App\Http\Requests\Application\Concerns\NormalizesApplicationInput;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreGuestApplicationRequest extends FormRequest
{
    use NormalizesApplicationInput;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeApplicationInput();

        if ($this->filled('email')) {
            $this->merge([
                'email' => strtolower((string) $this->input('email')),
            ]);
        }

        if ($this->filled('student_id')) {
            $this->merge([
                'student_id' => trim((string) $this->input('student_id')),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $email = strtolower((string) $value);
                    $studentId = (string) $this->input('student_id');

                    $user = User::query()
                        ->whereRaw('lower(email) = ?', [$email])
                        ->first();

                    if ($user && $user->student_id && strcasecmp($user->student_id, $studentId) !== 0) {
                        $fail('This email is already associated with a different student ID.');
                    }
                },
            ],
            'student_id' => [
                'required',
                'string',
                'max:255',
                'regex:/^[A-Za-z0-9-]+$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $studentId = (string) $value;
                    $email = strtolower((string) $this->input('email'));

                    $user = User::query()
                        ->where('student_id', $studentId)
                        ->first();

                    if ($user && strcasecmp($user->email, $email) !== 0) {
                        $fail('This student ID is already associated with another email address.');
                    }
                },
            ],
            ...ApplicationFormRules::make($this, true),
        ];
    }

    public function messages(): array
    {
        return ApplicationFormRules::messages();
    }

    /**
     * @return array<string, mixed>
     */
    public function draftPayload(): array
    {
        return array_diff_key(
            $this->validated(),
            array_flip(['email', 'student_id', 'photo'])
        );
    }
}
