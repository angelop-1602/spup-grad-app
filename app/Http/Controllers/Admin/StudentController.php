<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ProfilePhoto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    /**
     * Display a listing of students.
     */
    public function index(Request $request): Response
    {
        $query = User::query()->with('profile');

        // Search functionality
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('student_id', 'like', "%{$search}%")
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        $profileQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('middle_name', 'like', "%{$search}%")
                            ->orWhere('suffix', 'like', "%{$search}%");
                    });
            });
        }

        $students = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('admin/students/index', [
            'students' => $students,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Display the specified student.
     */
    public function show(User $student): Response
    {
        $student->load([
            'profile',
            'applications.window',
            'applications.department',
            'applications.course',
        ]);

        return Inertia::render('admin/students/show', [
            'student' => $student,
        ]);
    }

    /**
     * Get applications for a specific student.
     */
    public function applications(User $student): \Illuminate\Http\JsonResponse
    {
        $applications = $student->applications()
            ->with(['window', 'department', 'course'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($applications);
    }

    /**
     * Remove the specified student from storage.
     */
    public function destroy(User $student): RedirectResponse
    {
        // Delete associated profile if exists
        if ($student->profile) {
            // Delete profile photo if exists
            $photoPath = ProfilePhoto::storagePath($student->profile->photo_path);
            if ($photoPath && \Storage::disk('public')->exists($photoPath)) {
                \Storage::disk('public')->delete($photoPath);
            }
            $student->profile->delete();
        }

        // Delete the user (this will cascade delete applications and other related data)
        $student->delete();

        return redirect()->route('admin.students.index')
            ->with('success', 'Student deleted successfully.');
    }

    /**
     * Manually reset the student's password entered by the admin.
     */
    public function resetPassword(Request $request, User $student): RedirectResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $student->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        return redirect()->back()->with('success', 'Password updated successfully for '.$student->student_id.'.');
    }
}
