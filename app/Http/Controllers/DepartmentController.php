<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * Get all active departments with their courses.
     */
    public function index(Request $request): JsonResponse
    {
        $departments = Department::active()
            ->with(['courses' => function ($query) {
                $query->active()->orderBy('name');
            }])
            ->orderBy('name')
            ->get();

        return response()->json([
            'departments' => $departments,
        ]);
    }
}
