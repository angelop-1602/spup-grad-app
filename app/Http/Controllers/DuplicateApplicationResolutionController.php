<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\GuestApplicationDraft;
use App\Support\DuplicateApplicationRecords;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DuplicateApplicationResolutionController extends Controller
{
    public function show(
        Request $request,
        string $left,
        string $right,
        DuplicateApplicationRecords $duplicates,
    ): Response {
        [$leftRecord, $rightRecord] = [
            $duplicates->resolve($left),
            $duplicates->resolve($right),
        ];

        if (! $leftRecord || ! $rightRecord) {
            return Inertia::render('duplicate-applications/resolve', [
                'resolved' => true,
                'message' => 'This duplicate review link has already been resolved or one of the records no longer exists.',
                'left' => $leftRecord ? $duplicates->publicPayload($leftRecord) : null,
                'right' => $rightRecord ? $duplicates->publicPayload($rightRecord) : null,
                'deleteUrl' => null,
            ]);
        }

        abort_unless($duplicates->recordsMatch($leftRecord, $rightRecord), 404);

        return Inertia::render('duplicate-applications/resolve', [
            'resolved' => false,
            'message' => null,
            'left' => $duplicates->publicPayload($leftRecord),
            'right' => $duplicates->publicPayload($rightRecord),
            'deleteUrl' => $this->signedRoute('duplicate-applications.destroy', $left, $right),
        ]);
    }

    public function destroy(
        Request $request,
        string $left,
        string $right,
        DuplicateApplicationRecords $duplicates,
    ): RedirectResponse {
        $validated = $request->validate([
            'selected_record' => ['required', 'string', Rule::in([$left, $right])],
        ]);

        [$leftRecord, $rightRecord] = [
            $duplicates->resolve($left),
            $duplicates->resolve($right),
        ];

        if (! $leftRecord || ! $rightRecord) {
            return redirect()
                ->to($this->signedRoute('duplicate-applications.show', $left, $right))
                ->with('info', 'This duplicate review was already resolved.');
        }

        abort_unless($duplicates->recordsMatch($leftRecord, $rightRecord), 404);

        $selectedRecord = $validated['selected_record'] === $left
            ? $leftRecord
            : $rightRecord;

        $selectedModel = $selectedRecord['model'] ?? null;
        $subject = $selectedModel instanceof Application || $selectedModel instanceof GuestApplicationDraft
            ? $selectedModel
            : null;

        $duplicates->deleteRecord($selectedRecord);

        app(SystemEventLogger::class)->log(
            module: 'graduation_application',
            action: 'duplicate_resolution.record_deleted',
            message: 'A duplicate graduation application record was deleted from a signed resolution link.',
            subject: $subject,
            meta: [
                'selected_record' => $selectedRecord['key'],
                'remaining_record' => $validated['selected_record'] === $left ? $right : $left,
                'match' => [
                    'first_name' => $selectedRecord['first_name'],
                    'last_name' => $selectedRecord['last_name'],
                    'student_id' => $selectedRecord['student_id'],
                ],
            ],
        );

        return redirect()
            ->to($this->signedRoute('duplicate-applications.show', $left, $right))
            ->with('success', 'The selected duplicate record was deleted.');
    }

    private function signedRoute(string $routeName, string $left, string $right): string
    {
        return URL::temporarySignedRoute(
            $routeName,
            now()->addDays(14),
            [
                'left' => $left,
                'right' => $right,
            ],
        );
    }
}
