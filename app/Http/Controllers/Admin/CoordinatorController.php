<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignCoordinatorRequest;
use App\Http\Requests\Admin\StoreCoordinatorRequest;
use App\Models\Coordinator;
use App\Models\Course;
use App\Models\Department;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class CoordinatorController extends Controller
{
    /**
     * Display a listing of coordinators.
     */
    public function index(Request $request): Response
    {
        $coordinators = Coordinator::query()
            ->with(['departments', 'courses'])
            ->orderBy('name')
            ->paginate(20);

        return Inertia::render('admin/coordinators/index', [
            'coordinators' => $coordinators,
        ]);
    }

    /**
     * Show the form for creating a new coordinator.
     */
    public function create(): Response
    {
        return Inertia::render('admin/coordinators/create', [
            'departments' => $this->academicStructure(),
        ]);
    }

    /**
     * Store a newly created coordinator.
     */
    public function store(StoreCoordinatorRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $departmentIds = $data['department_ids'] ?? [];
        $courseIds = $data['course_ids'] ?? [];
        $courseIdsProvided = array_key_exists('course_ids', $data);
        unset($data['department_ids']);
        unset($data['course_ids']);

        $data['password'] = Hash::make($data['password']);

        $coordinator = Coordinator::create($data);

        $this->syncAcademicAssignments($coordinator, $departmentIds, $courseIds, $courseIdsProvided);

        return redirect()
            ->route('admin.coordinators.index')
            ->with('success', 'Coordinator created successfully.');
    }

    /**
     * Display the specified coordinator.
     */
    public function show(Coordinator $coordinator): Response
    {
        $coordinator->load(['departments', 'courses']);

        return Inertia::render('admin/coordinators/show', [
            'coordinator' => $coordinator,
        ]);
    }

    /**
     * Show the form for editing the specified coordinator.
     */
    public function edit(Coordinator $coordinator): Response
    {
        $coordinator->load(['departments', 'courses']);

        return Inertia::render('admin/coordinators/edit', [
            'coordinator' => $coordinator,
            'departments' => $this->academicStructure(),
            'assignedCourseIds' => $coordinator->assignedCourseIds(),
        ]);
    }

    /**
     * Update the specified coordinator.
     */
    public function update(Request $request, Coordinator $coordinator): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:coordinators,email,'.$coordinator->id],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'department_ids' => ['sometimes', 'array'],
            'department_ids.*' => ['exists:departments,id'],
            'course_ids' => ['sometimes', 'array'],
            'course_ids.*' => ['exists:courses,id'],
        ]);

        $departmentIds = $validated['department_ids'] ?? [];
        $courseIds = $validated['course_ids'] ?? [];
        $courseIdsProvided = array_key_exists('course_ids', $validated);
        unset($validated['department_ids']);
        unset($validated['course_ids']);

        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $coordinator->update($validated);

        $this->syncAcademicAssignments($coordinator, $departmentIds, $courseIds, $courseIdsProvided);

        return redirect()
            ->route('admin.coordinators.index')
            ->with('success', 'Coordinator updated successfully.');
    }

    /**
     * Assign coordinator to departments.
     */
    public function assign(AssignCoordinatorRequest $request): RedirectResponse
    {
        $coordinator = Coordinator::findOrFail($request->coordinator_id);
        $this->syncAcademicAssignments(
            $coordinator,
            $request->department_ids ?? [],
            $request->course_ids ?? [],
            $request->has('course_ids'),
        );

        return redirect()
            ->route('admin.coordinators.index')
            ->with('success', 'Coordinator assigned successfully.');
    }

    /**
     * Remove the specified coordinator.
     */
    public function destroy(Coordinator $coordinator): RedirectResponse
    {
        $coordinator->delete();

        return redirect()
            ->route('admin.coordinators.index')
            ->with('success', 'Coordinator deleted successfully.');
    }

    private function academicStructure()
    {
        return Department::active()
            ->with(['courses' => function ($query) {
                $query->orderBy('name');
            }])
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  array<int, int|string>  $departmentIds
     * @param  array<int, int|string>  $courseIds
     */
    private function syncAcademicAssignments(
        Coordinator $coordinator,
        array $departmentIds,
        array $courseIds,
        bool $courseIdsProvided,
    ): void {
        $departmentIds = collect($departmentIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $courseIds = collect($courseIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if (! $courseIdsProvided && $departmentIds->isNotEmpty()) {
            $courseIds = Course::query()
                ->whereIn('department_id', $departmentIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();
        }

        $courses = Course::query()
            ->whereIn('id', $courseIds)
            ->get(['id', 'department_id']);

        $departmentIds = $departmentIds
            ->merge($courses->pluck('department_id')->map(fn ($id) => (int) $id))
            ->unique()
            ->values();

        $coordinator->departments()->sync($departmentIds->all());
        $coordinator->courses()->sync($courses->pluck('id')->map(fn ($id) => (int) $id)->all());
    }
}
