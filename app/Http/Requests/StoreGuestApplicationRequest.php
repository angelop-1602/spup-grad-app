<?php

namespace App\Http\Requests;

use App\Http\Requests\Application\ApplicationFormRules;
use App\Http\Requests\Application\Concerns\NormalizesApplicationInput;
use App\Models\Application;
use App\Models\GuestApplicationDraft;
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
                    $windowId = (int) $this->input('window_id');

                    $user = User::query()
                        ->whereRaw('lower(email) = ?', [$email])
                        ->first();

                    if ($user && $user->student_id && strcasecmp($user->student_id, $studentId) !== 0) {
                        $fail('This email is already associated with a different student ID.');
                    }

                    if (! $windowId || $studentId === '') {
                        return;
                    }

                    $draft = GuestApplicationDraft::query()
                        ->where('window_id', $windowId)
                        ->whereRaw('lower(email) = ?', [$email])
                        ->first();

                    if ($draft && strcasecmp($draft->student_id, $studentId) !== 0) {
                        $fail('This email already has an application draft for the current graduation window.');
                    }

                    $application = Application::query()
                        ->where('window_id', $windowId)
                        ->whereHas('user', fn ($query) => $query->whereRaw('lower(email) = ?', [$email]))
                        ->with('user:id,student_id,email')
                        ->first();

                    if ($application?->user?->student_id && strcasecmp($application->user->student_id, $studentId) !== 0) {
                        $fail('This email already has an application for the current graduation window.');
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
                    $windowId = (int) $this->input('window_id');

                    if (! $windowId || $email === '') {
                        return;
                    }

                    $draft = GuestApplicationDraft::query()
                        ->where('window_id', $windowId)
                        ->where('student_id', $studentId)
                        ->first();

                    if ($draft && strcasecmp($draft->email, $email) !== 0) {
                        $fail('This student ID already has an application draft for the current graduation window.');
                    }

                    $application = Application::query()
                        ->where('window_id', $windowId)
                        ->whereHas('user', fn ($query) => $query->where('student_id', $studentId))
                        ->with('user:id,student_id,email')
                        ->first();

                    if ($application?->user?->email && strcasecmp($application->user->email, $email) !== 0) {
                        $fail('This student ID already has an application for the current graduation window.');
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
