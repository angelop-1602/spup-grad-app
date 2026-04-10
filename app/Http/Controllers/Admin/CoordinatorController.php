<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AssignCoordinatorRequest;
use App\Http\Requests\Admin\StoreCoordinatorRequest;
use App\Models\Coordinator;
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
            ->with(['departments'])
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
        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('admin/coordinators/create', [
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created coordinator.
     */
    public function store(StoreCoordinatorRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $departmentIds = $data['department_ids'] ?? [];
        unset($data['department_ids']);

        $data['password'] = Hash::make($data['password']);

        $coordinator = Coordinator::create($data);

        if (! empty($departmentIds)) {
            $coordinator->departments()->attach($departmentIds);
        }

        return redirect()
            ->route('admin.coordinators.index')
            ->with('success', 'Coordinator created successfully.');
    }

    /**
     * Display the specified coordinator.
     */
    public function show(Coordinator $coordinator): Response
    {
        $coordinator->load('departments');

        return Inertia::render('admin/coordinators/show', [
            'coordinator' => $coordinator,
        ]);
    }

    /**
     * Show the form for editing the specified coordinator.
     */
    public function edit(Coordinator $coordinator): Response
    {
        $coordinator->load('departments');
        $departments = Department::active()->orderBy('name')->get();

        return Inertia::render('admin/coordinators/edit', [
            'coordinator' => $coordinator,
            'departments' => $departments,
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
        ]);

        $departmentIds = $validated['department_ids'] ?? [];
        unset($validated['department_ids']);

        if (isset($validated['password']) && $validated['password']) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $coordinator->update($validated);

        $coordinator->departments()->sync($departmentIds);

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
        $coordinator->departments()->sync($request->department_ids);

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
}
