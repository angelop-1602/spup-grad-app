<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreMajorRequest;
use App\Http\Requests\Admin\UpdateMajorRequest;
use App\Models\Course;
use App\Models\Department;
use App\Models\Major;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MajorController extends Controller
{
    /**
     * Display a listing of majors.
     */
    public function index(Request $request): Response
    {
        // Dedicated majors index is no longer used; redirect to Academic Structure.
        return redirect()->route('admin.departments.index');
    }

    /**
     * Show the form for creating a new major.
     */
    public function create(Request $request): Response
    {
        $departments = Department::active()->orderBy('name')->get();
        $courses = Course::active()->with('department')->orderBy('name')->get();

        return Inertia::render('admin/majors/create', [
            'departments' => $departments,
            'courses' => $courses,
            'course_id' => $request->get('course_id'),
        ]);
    }

    /**
     * Store a newly created major.
     */
    public function store(StoreMajorRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $data['is_active'] ?? true;

        Major::create($data);

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Major created successfully.');
    }

    /**
     * Show the form for editing the specified major.
     */
    public function edit(Major $major): Response
    {
        $major->load('course.department');
        $departments = Department::active()->orderBy('name')->get();
        $courses = Course::active()->with('department')->orderBy('name')->get();

        return Inertia::render('admin/majors/edit', [
            'major' => $major,
            'departments' => $departments,
            'courses' => $courses,
        ]);
    }

    /**
     * Update the specified major.
     */
    public function update(UpdateMajorRequest $request, Major $major): RedirectResponse
    {
        $major->update($request->validated());

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Major updated successfully.');
    }

    /**
     * Remove the specified major.
     */
    public function destroy(Major $major): RedirectResponse
    {
        $major->delete();

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Major deleted successfully.');
    }
}
