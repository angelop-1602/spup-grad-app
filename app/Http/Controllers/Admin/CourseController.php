<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseRequest;
use App\Http\Requests\Admin\UpdateCourseRequest;
use App\Models\Course;
use App\Models\Department;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    /**
     * Display a listing of courses.
     */
    public function index(Request $request): Response
    {
        // Dedicated courses index is no longer used; redirect to Academic Structure.
        return redirect()->route('admin.departments.index');
    }

    /**
     * Show the form for creating a new course.
     */
    public function create(Request $request): Response
    {
        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('admin/courses/create', [
            'departments' => $departments,
            'department_id' => $request->get('department_id'),
        ]);
    }

    /**
     * Store a newly created course.
     */
    public function store(StoreCourseRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['is_active'] = $data['is_active'] ?? true;

        Course::create($data);

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Course created successfully.');
    }

    /**
     * Display the specified course.
     */
    public function show(Course $course): Response
    {
        $course->load(['department', 'majors']);

        return Inertia::render('admin/courses/show', [
            'course' => $course,
        ]);
    }

    /**
     * Show the form for editing the specified course.
     */
    public function edit(Course $course): Response
    {
        $course->load('department');
        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('admin/courses/edit', [
            'course' => $course,
            'departments' => $departments,
        ]);
    }

    /**
     * Update the specified course.
     */
    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $course->update($request->validated());

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Course updated successfully.');
    }

    /**
     * Remove the specified course.
     */
    public function destroy(Course $course): RedirectResponse
    {
        $course->delete();

        return redirect()
            ->route('admin.departments.index')
            ->with('success', 'Course deleted successfully.');
    }
}
