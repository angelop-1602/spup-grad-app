<?php

namespace App\Http\Controllers\Admin;

use App\Exports\WindowApplicationsExport;
use App\Http\Controllers\Concerns\BuildsHistoricalApplicationWindows;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreApplicationWindowRequest;
use App\Http\Requests\Admin\UpdateApplicationWindowRequest;
use App\Models\ApplicationWindow;
use App\Support\HistoricalWindowDataBuilder;
use App\Support\NationalityNormalizer;
use App\Support\SystemEventLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ApplicationWindowController extends Controller
{
    use BuildsHistoricalApplicationWindows;

    /**
     * Display a listing of application windows.
     */
    public function index(Request $request): Response
    {
        $now = now()->toDateTimeString();

        $windows = ApplicationWindow::query()
            ->withCount('applications')
            ->orderByRaw(
                'CASE WHEN start_date <= ? AND end_date >= ? THEN 0 WHEN start_date > ? THEN 1 ELSE 2 END',
                [$now, $now, $now]
            )
            ->orderBy('start_date', 'desc')
            ->paginate(15);

        return Inertia::render('admin/windows/index', [
            'windows' => $windows,
            'historicalWindows' => $this->historicalWindows('admin.windows.historical'),
        ]);
    }

    /**
     * Display a historical application window (read-only).
     */
    public function historical(Request $request, string $batch): Response
    {
        $builder = new HistoricalWindowDataBuilder();

        return Inertia::render('admin/windows/show', $builder->build($request, $batch, 'admin'));
    }

    /**
     * Show the form for creating a new application window.
     */
    public function create(): Response
    {
        return Inertia::render('admin/windows/create');
    }

    /**
     * Store a newly created application window.
     */
    public function store(StoreApplicationWindowRequest $request): RedirectResponse
    {
        ApplicationWindow::create($request->validated());

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window created successfully.');
    }

    /**
     * Display the specified application window.
     */
    public function show(Request $request, ApplicationWindow $window): Response
    {
        // Get search query
        $search = $request->get('search', '');
        $statusFilter = $request->get('status', 'all');

        // Build applications query with search
        // Make sure to load all relationships properly
        $applicationsQuery = $window->applications()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,first_name,last_name,middle_name,suffix,photo_path',
                'department:id,name,code',
                'course:id,name,code,department_id',
            ])
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('application_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($userQuery) use ($search) {
                            $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('student_id', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhereHas('profile', function ($profileQuery) use ($search) {
                                    $profileQuery->where('first_name', 'like', "%{$search}%")
                                        ->orWhere('last_name', 'like', "%{$search}%")
                                        ->orWhere('middle_name', 'like', "%{$search}%")
                                        ->orWhere('suffix', 'like', "%{$search}%");
                                });
                        })
                        ->orWhereHas('department', function ($deptQuery) use ($search) {
                            $deptQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        })
                        ->orWhereHas('course', function ($courseQuery) use ($search) {
                            $courseQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('code', 'like', "%{$search}%");
                        });
                });
            })
            ->when($statusFilter !== 'all', function ($query) use ($statusFilter) {
                if ($statusFilter === 'pending') {
                    // Pending includes both 'pending' and 'submitted' statuses
                    $query->whereIn('status', ['pending', 'submitted']);
                } else {
                    $query->where('status', $statusFilter);
                }
            });

        // Paginate applications
        $applications = $applicationsQuery
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Load all applications for statistics (without pagination)
        // Make sure to load all relationships properly
        $allApplications = $window->applications()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,nationality',
                'department:id,name,code',
                'course:id,name,code,department_id',
            ])
            ->get();

        // Calculate attendance statistics
        $attendanceStats = $allApplications
            ->groupBy('presence')
            ->map(function ($group) {
                return $group->count();
            })
            ->toArray();

        $attendance = [
            'attending' => (int) ($attendanceStats['attending'] ?? 0),
            'not_attending' => (int) ($attendanceStats['not attending'] ?? 0),
        ];

        // Helper function to calculate attendance
        $calculateAttendance = function ($group) {
            return [
                'attending' => (int) $group->where('presence', 'attending')->count(),
                'not_attending' => (int) $group->where('presence', 'not attending')->count(),
            ];
        };

        // Helper function to calculate and normalize nationalities
        $calculateNationalities = function ($group) {
            $nationalities = $group
                ->filter(function ($app) {
                    return $app->user
                        && $app->user->profile
                        && ! empty($app->user->profile->nationality)
                        && $app->user->profile->nationality !== null;
                })
                ->map(function ($app) {
                    return NationalityNormalizer::normalize($app->user->profile->nationality);
                })
                ->filter()
                ->groupBy(function ($nationality) {
                    return $nationality;
                })
                ->map(function ($nationalityGroup, $nationality) {
                    return [
                        'nationality' => $nationality,
                        'count' => $nationalityGroup->count(),
                    ];
                })
                ->values()
                ->sortByDesc('count')
                ->values()
                ->toArray();

            return $nationalities;
        };

        // Create hierarchical structure: Department -> Program -> Major
        // Group by department first
        $byDepartment = $allApplications
            ->groupBy(function ($app) {
                if (! $app->department) {
                    return 'N/A';
                }
                $code = $app->department->code ?? null;
                if (! $code) {
                    return $app->department->name ?? 'N/A';
                }

                return $code;
            })
            ->map(function ($deptGroup, $deptCode) use ($calculateAttendance, $calculateNationalities) {
                $firstDept = $deptGroup->first();
                $deptName = $firstDept->department ? ($firstDept->department->name ?? 'Unknown') : 'Unknown';

                // Group programs within this department
                $programs = $deptGroup->groupBy(function ($app) {
                    if (! $app->course) {
                        return 'N/A';
                    }
                    $code = $app->course->code ?? null;
                    if (! $code) {
                        return $app->course->name ?? 'N/A';
                    }

                    return $code;
                })->map(function ($programGroup, $programCode) use ($calculateAttendance, $calculateNationalities) {
                    $firstProgram = $programGroup->first();
                    $programName = $firstProgram->course ? ($firstProgram->course->name ?? 'Unknown') : 'Unknown';

                    // Group majors within this program
                    $majors = $programGroup->groupBy('major')->map(function ($majorGroup, $major) use ($calculateAttendance, $calculateNationalities) {
                        return [
                            'name' => $major ?: 'N/A',
                            'total' => $majorGroup->count(),
                            'attendance' => $calculateAttendance($majorGroup),
                            'nationalities' => $calculateNationalities($majorGroup),
                        ];
                    })->values()->toArray();

                    return [
                        'name' => $programName,
                        'total' => $programGroup->count(),
                        'attendance' => $calculateAttendance($programGroup),
                        'nationalities' => $calculateNationalities($programGroup),
                        'majors' => $majors,
                    ];
                })->values()->toArray();

                return [
                    'name' => $deptName,
                    'total' => $deptGroup->count(),
                    'attendance' => $calculateAttendance($deptGroup),
                    'nationalities' => $calculateNationalities($deptGroup),
                    'programs' => $programs,
                ];
            })
            ->values()
            ->sortBy('name')
            ->values()
            ->toArray();

        // Flatten for chart display (separate arrays for chart)
        $departmentChartData = [];
        $programChartData = [];
        $majorChartData = [];

        foreach ($byDepartment as $dept) {
            if ($dept['name'] && $dept['name'] !== 'Unknown') {
                $departmentChartData[] = [
                    'code' => $dept['name'], // Use name as code for chart compatibility
                    'name' => $dept['name'],
                    'total' => $dept['total'],
                ];
            }

            foreach ($dept['programs'] as $program) {
                if ($program['name'] && $program['name'] !== 'Unknown') {
                    $programChartData[] = [
                        'code' => $program['name'], // Use name as code for chart compatibility
                        'name' => $program['name'],
                        'total' => $program['total'],
                    ];
                }

                foreach ($program['majors'] as $major) {
                    if ($major['name'] && $major['name'] !== 'N/A') {
                        $majorChartData[] = [
                            'code' => $major['name'], // Use name as code for chart compatibility
                            'name' => $major['name'],
                            'total' => $major['total'],
                        ];
                    }
                }
            }
        }

        $byProgram = $programChartData;
        $byMajor = $majorChartData;

        // Calculate statistics by nationality (all nationalities) - normalized
        $byNationality = $allApplications
            ->filter(function ($app) {
                return $app->user
                    && $app->user->profile
                    && ! empty($app->user->profile->nationality)
                    && $app->user->profile->nationality !== null;
            })
            ->map(function ($app) {
                return NationalityNormalizer::normalize($app->user->profile->nationality);
            })
            ->filter()
            ->groupBy(function ($nationality) {
                return $nationality;
            })
            ->map(function ($group, $nationality) {
                return [
                    'nationality' => $nationality,
                    'total' => $group->count(),
                ];
            })
            ->values()
            ->sortByDesc('total')
            ->values()
            ->toArray();

        // Calculate status counts for tabs
        $statusCounts = $allApplications
            ->groupBy('status')
            ->map(function ($group) {
                return $group->count();
            })
            ->toArray();

        // Debug: Log counts to verify data
        \Log::info('ApplicationWindow Show', [
            'window_id' => $window->id,
            'applications_count' => $applications->total(),
            'all_applications_count' => $allApplications->count(),
            'attendance' => $attendance,
            'departments_count' => count($departmentChartData),
            'programs_count' => count($byProgram),
            'majors_count' => count($byMajor),
            'nationalities_count' => count($byNationality),
            'hierarchical_count' => count($byDepartment),
        ]);

        // Ensure applications is properly formatted for Inertia
        $applicationsData = $applications->toArray();

        return Inertia::render('admin/windows/show', [
            'window' => [
                'id' => $window->id,
                'title' => $window->title,
                'description' => $window->description,
                'start_date' => $window->start_date,
                'end_date' => $window->end_date,
            ],
            'applications' => $applicationsData,
            'stats' => [
                'attendance' => $attendance,
                'departments' => $departmentChartData ?: [],
                'programs' => $byProgram ?: [],
                'majors' => $byMajor ?: [],
                'nationalities' => $byNationality ?: [],
                'hierarchical' => $byDepartment ?: [], // For hierarchical display
                'status_counts' => [
                    'all' => $allApplications->count(),
                    'pending' => (int) (($statusCounts['pending'] ?? 0) + ($statusCounts['submitted'] ?? 0)),
                    'approved' => (int) ($statusCounts['approved'] ?? 0),
                    'incomplete' => (int) ($statusCounts['incomplete'] ?? 0),
                ],
            ],
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
        ]);
    }

    /**
     * Export applications for the specified window to XLSX.
     */
    public function export(Request $request, ApplicationWindow $window, SystemEventLogger $logger)
    {
        $departmentName = $request->string('department')->toString() ?: null;

        $export = new WindowApplicationsExport($window->id, $departmentName);

        $safeTitle = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $window->title);
        $suffix = $departmentName ? '_department_'.str_replace(' ', '_', $departmentName) : '_all_departments';
        $fileName = $safeTitle.$suffix.'.xlsx';
        $logger->log(
            module: 'graduation_application',
            action: 'admin.window.exported',
            message: 'Admin exported an application window.',
            subject: $window,
            meta: [
                'window_id' => $window->id,
                'department' => $departmentName,
                'file_name' => $fileName,
            ],
        );

        return Excel::download($export, $fileName);
    }

    /**
     * Export statistics PDF for the specified window.
     */
    public function exportStatisticsPdf(ApplicationWindow $window)
    {
        // Load all applications for statistics
        $allApplications = $window->applications()
            ->with([
                'user:id,name,email,student_id',
                'user.profile:id,user_id,nationality',
                'department:id,name,code',
                'course:id,name,code,department_id',
            ])
            ->get();

        // Helper function to calculate attendance
        $calculateAttendance = function ($group) {
            return [
                'attending' => (int) $group->where('presence', 'attending')->count(),
                'not_attending' => (int) $group->where('presence', 'not attending')->count(),
            ];
        };

        // Helper function to calculate and normalize nationalities
        $calculateNationalities = function ($group) {
            $nationalities = $group
                ->filter(function ($app) {
                    return $app->user
                        && $app->user->profile
                        && ! empty($app->user->profile->nationality)
                        && $app->user->profile->nationality !== null;
                })
                ->map(function ($app) {
                    return NationalityNormalizer::normalize($app->user->profile->nationality);
                })
                ->filter()
                ->groupBy(function ($nationality) {
                    return $nationality;
                })
                ->map(function ($nationalityGroup, $nationality) {
                    return [
                        'nationality' => $nationality,
                        'count' => $nationalityGroup->count(),
                    ];
                })
                ->values()
                ->sortByDesc('count')
                ->values()
                ->toArray();

            return $nationalities;
        };

        // Create hierarchical structure: Department -> Program -> Major
        $byDepartment = $allApplications
            ->groupBy(function ($app) {
                if (! $app->department) {
                    return 'N/A';
                }
                $code = $app->department->code ?? null;
                if (! $code) {
                    return $app->department->name ?? 'N/A';
                }

                return $code;
            })
            ->map(function ($deptGroup, $deptCode) use ($calculateAttendance, $calculateNationalities) {
                $firstDept = $deptGroup->first();
                $deptName = $firstDept->department ? ($firstDept->department->name ?? 'Unknown') : 'Unknown';

                // Group programs within this department
                $programs = $deptGroup->groupBy(function ($app) {
                    if (! $app->course) {
                        return 'N/A';
                    }
                    $code = $app->course->code ?? null;
                    if (! $code) {
                        return $app->course->name ?? 'N/A';
                    }

                    return $code;
                })->map(function ($programGroup, $programCode) use ($calculateAttendance, $calculateNationalities) {
                    $firstProgram = $programGroup->first();
                    $programName = $firstProgram->course ? ($firstProgram->course->name ?? 'Unknown') : 'Unknown';

                    // Group majors within this program
                    $majors = $programGroup->groupBy('major')->map(function ($majorGroup, $major) use ($calculateAttendance, $calculateNationalities) {
                        return [
                            'name' => $major ?: 'N/A',
                            'total' => $majorGroup->count(),
                            'attendance' => $calculateAttendance($majorGroup),
                            'nationalities' => $calculateNationalities($majorGroup),
                        ];
                    })->values()->toArray();

                    return [
                        'name' => $programName,
                        'total' => $programGroup->count(),
                        'attendance' => $calculateAttendance($programGroup),
                        'nationalities' => $calculateNationalities($programGroup),
                        'majors' => $majors,
                    ];
                })->values()->toArray();

                return [
                    'name' => $deptName,
                    'total' => $deptGroup->count(),
                    'attendance' => $calculateAttendance($deptGroup),
                    'nationalities' => $calculateNationalities($deptGroup),
                    'programs' => $programs,
                ];
            })
            ->values()
            ->sortBy('name')
            ->values()
            ->toArray();

        // Calculate overall attendance
        $attendanceStats = $allApplications
            ->groupBy('presence')
            ->map(function ($group) {
                return $group->count();
            })
            ->toArray();

        $attendance = [
            'attending' => (int) ($attendanceStats['attending'] ?? 0),
            'not_attending' => (int) ($attendanceStats['not attending'] ?? 0),
        ];

        // Generate PDF
        $pdf = Pdf::loadView('admin.windows.statistics-pdf', [
            'window' => $window,
            'hierarchical' => $byDepartment,
            'attendance' => $attendance,
            'totalApplications' => $allApplications->count(),
        ]);

        $safeTitle = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $window->title);
        $fileName = $safeTitle.'_Statistics_'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($fileName);
    }

    /**
     * Show the form for editing the specified application window.
     */
    public function edit(ApplicationWindow $window): Response
    {
        return Inertia::render('admin/windows/edit', [
            'window' => $window,
        ]);
    }

    /**
     * Update the specified application window.
     */
    public function update(UpdateApplicationWindowRequest $request, ApplicationWindow $window): RedirectResponse
    {
        $window->update($request->validated());

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window updated successfully.');
    }

    /**
     * Remove the specified application window.
     */
    public function destroy(ApplicationWindow $window): RedirectResponse
    {
        $window->delete();

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window deleted successfully.');
    }

    /**
     * Get all windows (for API/select options).
     */
    public function all(): \Illuminate\Http\JsonResponse
    {
        $windows = ApplicationWindow::query()
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json($windows);
    }
}
