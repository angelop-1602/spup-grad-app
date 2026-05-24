<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\StudentProfile;
use App\Support\ProfilePhoto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StudentProfileController extends Controller
{
    /**
     * Display the student profile.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $profile = $request->user()->profile;

        // If no profile exists, redirect to edit page to create one
        if (! $profile) {
            return redirect()->route('profile.edit')
                ->with('info', 'Please complete your profile to continue.');
        }

        return Inertia::render('profile/show', [
            'profile' => $profile,
        ]);
    }

    /**
     * Show the form for editing the student profile.
     */
    public function edit(Request $request): Response
    {
        $profile = $request->user()->profile;

        return Inertia::render('profile/edit', [
            'profile' => $profile,
        ]);
    }

    /**
     * Update the student profile.
     */
    public function update(UpdateProfileRequest $request): RedirectResponse
    {
        $user = $request->user();

        $profile = $user->profile ?? new StudentProfile(['user_id' => $user->id]);

        $validated = $request->validated();

        // Handle photo upload
        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            $oldPhotoPath = ProfilePhoto::storagePath($profile->photo_path);
            if ($oldPhotoPath && \Storage::disk('public')->exists($oldPhotoPath)) {
                \Storage::disk('public')->delete($oldPhotoPath);
            }

            $file = $request->file('photo');
            $extension = $file->getClientOriginalExtension();
            
            // Build filename from student name and student_id
            $studentId = $user->student_id ?? 'unknown';
            $nameParts = [];
            
            // Try to get name from validated data first (in case profile is new)
            $firstName = $validated['first_name'] ?? $profile->first_name ?? null;
            $middleName = $validated['middle_name'] ?? $profile->middle_name ?? null;
            $lastName = $validated['last_name'] ?? $profile->last_name ?? null;
            $suffix = $validated['suffix'] ?? $profile->suffix ?? null;
            
            if ($firstName) {
                $nameParts[] = $firstName;
            }
            if ($middleName) {
                $nameParts[] = $middleName;
            }
            if ($lastName) {
                $nameParts[] = $lastName;
            }
            if ($suffix) {
                $nameParts[] = $suffix;
            }
            
            // If profile doesn't have name yet, use user's name
            if (empty($nameParts)) {
                $nameParts[] = $user->name;
            }
            
            // Combine name parts and sanitize
            $name = implode(' ', $nameParts);
            $sanitizedName = Str::slug($name);
            
            // Create filename: sanitized-name_student-id.extension
            $filename = $sanitizedName . '_' . $studentId . '.' . $extension;
            
            // Store with custom filename
            $photoPath = $file->storeAs('profile-photos', $filename, 'public');
            $validated['photo_path'] = $photoPath;
        }

        // Remove photo from validated array if not uploaded (to avoid overwriting with null)
        unset($validated['photo']);

        $profile->fill($validated);
        $profile->save();

        return redirect()
            ->route('dashboard')
            ->with('success', 'Profile updated successfully.');
    }
}
