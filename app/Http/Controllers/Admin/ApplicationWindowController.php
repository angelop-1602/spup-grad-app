<?php

namespace App\Http\Controllers\Admin;

use App\Exports\WindowApplicationsExport;
use App\Http\Controllers\Concerns\BuildsHistoricalApplicationWindows;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreApplicationWindowRequest;
use App\Http\Requests\Admin\UpdateApplicationWindowRequest;
use App\Models\ApplicationWindow;
use App\Models\SystemHealthCheck;
use App\Notifications\DuplicateApplicationDetected;
use App\Support\DuplicateApplicationRecords;
use App\Support\GraduateExportData;
use App\Support\HistoricalWindowDataBuilder;
use App\Support\NationalityNormalizer;
use App\Support\SystemEventLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
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
        $search = trim($request->string('search')->toString());

        $windows = ApplicationWindow::query()
            ->withCount('applications')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($inner) use ($search): void {
                    $inner->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderedForSelection()
            ->paginate(15)
            ->withQueryString();

        $currentWindow = ApplicationWindow::current();
        $currentWindow?->loadCount('applications');

        return Inertia::render('admin/windows/index', [
            'windows' => $windows,
            'currentWindow' => $currentWindow,
            'historicalWindows' => $this->historicalWindows('admin.windows.historical'),
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Display a historical application window (read-only).
     */
    public function historical(Request $request, string $batch): Response
    {
        $builder = new HistoricalWindowDataBuilder;

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
    public function store(StoreApplicationWindowRequest $request, SystemEventLogger $logger): RedirectResponse
    {
        $window = ApplicationWindow::create($request->validated());

        $logger->log(
            module: 'graduation_application',
            action: 'admin.window.created',
            message: 'Admin created an application window.',
            subject: $window,
            meta: [
                'window_id' => $window->id,
                'title' => $window->title,
                'start_date' => $window->start_date?->toIso8601String(),
                'end_date' => $window->end_date?->toIso8601String(),
            ],
        );

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window created successfully.');
    }

    /**
     * Display the specified application window.
     */
    public function show(Request $request, ApplicationWindow $window, DuplicateApplicationRecords $duplicates): Response
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
                $query->where('status', $statusFilter);
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
                $deptLabel = (string) $deptCode;

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
                    'name' => $deptLabel,
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
                    'submitted' => (int) ($statusCounts['submitted'] ?? 0),
                    'pending' => (int) ($statusCounts['pending'] ?? 0),
                    'approved' => (int) ($statusCounts['approved'] ?? 0),
                    'incomplete' => (int) ($statusCounts['incomplete'] ?? 0),
                ],
            ],
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
            'unverifiedApplications' => $duplicates->unverifiedDraftsForWindow($window),
            'duplicatePairs' => $duplicates->duplicatePairsForWindow($window),
        ]);
    }

    public function sendDuplicateAlert(
        Request $request,
        ApplicationWindow $window,
        DuplicateApplicationRecords $duplicates,
    ): RedirectResponse {
        $validated = $request->validate([
            'left' => ['required', 'string', 'max:40', 'regex:/^(application|draft)-\d+$/'],
            'right' => ['required', 'string', 'max:40', 'regex:/^(application|draft)-\d+$/', Rule::notIn([$request->input('left')])],
        ]);

        [$left, $right] = [
            $duplicates->resolve($validated['left']),
            $duplicates->resolve($validated['right']),
        ];

        if (! $left || ! $right) {
            return back()->withErrors([
                'duplicate' => 'One of the duplicate records no longer exists.',
            ]);
        }

        if ((int) $left['window_id'] !== $window->id || (int) $right['window_id'] !== $window->id) {
            return back()->withErrors([
                'duplicate' => 'Both duplicate records must belong to the selected application window.',
            ]);
        }

        if (! $duplicates->recordsMatch($left, $right)) {
            return back()->withErrors([
                'duplicate' => 'These records no longer match on first name, last name, and student ID.',
            ]);
        }

        $reviewUrl = URL::temporarySignedRoute(
            'duplicate-applications.show',
            now()->addDays(14),
            [
                'left' => $left['key'],
                'right' => $right['key'],
            ],
        );

        $notification = new DuplicateApplicationDetected(
            $duplicates->publicPayload($left),
            $duplicates->publicPayload($right),
            $reviewUrl,
        );

        return $this->sendDuplicateAlertEmail($left, $right, $notification, $duplicates);
    }

    public function deleteDuplicate(
        Request $request,
        ApplicationWindow $window,
        DuplicateApplicationRecords $duplicates,
    ): RedirectResponse {
        $validated = $request->validate([
            'left' => ['required', 'string', 'max:40', 'regex:/^(application|draft)-\d+$/'],
            'right' => ['required', 'string', 'max:40', 'regex:/^(application|draft)-\d+$/', Rule::notIn([$request->input('left')])],
            'selected_record' => ['required', 'string', 'max:40', 'regex:/^(application|draft)-\d+$/', Rule::in([$request->input('left'), $request->input('right')])],
        ]);

        [$left, $right] = [
            $duplicates->resolve($validated['left']),
            $duplicates->resolve($validated['right']),
        ];

        if (! $left || ! $right) {
            return back()->withErrors([
                'duplicate' => 'One of the duplicate records no longer exists.',
            ]);
        }

        if ((int) $left['window_id'] !== $window->id || (int) $right['window_id'] !== $window->id) {
            return back()->withErrors([
                'duplicate' => 'Both duplicate records must belong to the selected application window.',
            ]);
        }

        if (! $duplicates->recordsMatch($left, $right)) {
            return back()->withErrors([
                'duplicate' => 'These records no longer match on the same identity details.',
            ]);
        }

        $selectedRecord = $validated['selected_record'] === $validated['left']
            ? $left
            : $right;
        $remainingRecord = $validated['selected_record'] === $validated['left']
            ? $right
            : $left;
        $subject = ($selectedRecord['model'] ?? null) instanceof \Illuminate\Database\Eloquent\Model
            ? $selectedRecord['model']
            : null;

        $duplicates->deleteRecord($selectedRecord);

        app(SystemEventLogger::class)->log(
            module: 'graduation_application',
            action: 'admin.duplicate_application.record_deleted',
            message: 'Admin deleted a duplicate graduation application record from the application window review.',
            subject: $subject,
            meta: [
                'window_id' => $window->id,
                'left_record' => $left['key'],
                'right_record' => $right['key'],
                'selected_record' => $selectedRecord['key'],
                'remaining_record' => $remainingRecord['key'],
                'selected_type' => $selectedRecord['type'],
                'selected_application_number' => $selectedRecord['application_number'],
                'selected_tracking_code' => $selectedRecord['tracking_code'],
            ],
        );

        return back()->with('success', 'Selected duplicate record deleted.');
    }

    /**
     * Export applications for the specified window to XLSX.
     */
    public function export(Request $request, ApplicationWindow $window, SystemEventLogger $logger)
    {
        $departmentName = $request->string('department')->toString() ?: null;

        $export = new WindowApplicationsExport($window->id, $departmentName);

        $safeTitle = GraduateExportData::safeFileName($window->title);
        $suffix = $departmentName ? '_department_'.str_replace(' ', '_', $departmentName) : '_all_departments';
        $fileName = $safeTitle.'_Graduate_List'.$suffix.'.xlsx';
        $logger->log(
            module: 'graduation_application',
            action: 'admin.window.exported',
            message: 'Admin exported a graduate list.',
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
                $deptLabel = (string) $deptCode;

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
                    'name' => $deptLabel,
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
    public function update(
        UpdateApplicationWindowRequest $request,
        ApplicationWindow $window,
        SystemEventLogger $logger,
    ): RedirectResponse {
        $before = $window->only(['title', 'description', 'start_date', 'end_date']);
        $window->update($request->validated());

        $logger->log(
            module: 'graduation_application',
            action: 'admin.window.updated',
            message: 'Admin updated an application window.',
            subject: $window,
            meta: [
                'window_id' => $window->id,
                'before' => $before,
                'after' => $window->only(['title', 'description', 'start_date', 'end_date']),
            ],
        );

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window updated successfully.');
    }

    /**
     * Remove the specified application window.
     */
    public function destroy(ApplicationWindow $window, SystemEventLogger $logger): RedirectResponse
    {
        $windowPayload = $window->only(['id', 'title', 'start_date', 'end_date']);

        $logger->log(
            module: 'graduation_application',
            action: 'admin.window.deleted',
            message: 'Admin deleted an application window.',
            subject: $window,
            meta: $windowPayload,
        );

        $window->delete();

        return redirect()
            ->route('admin.windows.index')
            ->with('success', 'Application window deleted successfully.');
    }

    /**
     * @param  array<string, mixed>  $left
     * @param  array<string, mixed>  $right
     */
    private function sendDuplicateAlertEmail(
        array $left,
        array $right,
        DuplicateApplicationDetected $notification,
        DuplicateApplicationRecords $duplicates,
    ): RedirectResponse {
        $notifiables = $duplicates->notifiablesForRecords([$left, $right]);
        $mailMeta = [
            'notification' => $notification::class,
            'mailer' => config('mail.default'),
            'delivery_mode' => is_subclass_of($notification::class, \Illuminate\Contracts\Queue\ShouldQueue::class)
                ? 'queued'
                : 'sync',
            'recipient_count' => $notifiables->count(),
            'left_record' => $left['key'],
            'right_record' => $right['key'],
        ];

        if ($notifiables->isEmpty()) {
            return back()->withErrors([
                'duplicate' => 'No email recipient is available for these duplicate records.',
            ]);
        }

        try {
            Notification::send($notifiables, $notification);
            SystemHealthCheck::record('mail', 'ok', 'Admin duplicate application alert email sent.', $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'admin.duplicate_application.alert_sent',
                message: 'Admin sent a duplicate application resolution email.',
                meta: $mailMeta,
            );

            return back()->with('success', 'Duplicate alert email sent.');
        } catch (\Throwable $e) {
            SystemHealthCheck::record('mail', 'critical', $e->getMessage(), $mailMeta);
            app(SystemEventLogger::class)->log(
                module: 'email',
                action: 'admin.duplicate_application.alert_sent',
                message: 'Duplicate application alert email failed.',
                status: 'failed',
                severity: 'error',
                meta: [
                    ...$mailMeta,
                    'error' => $e->getMessage(),
                ],
            );

            return back()->with('warning', 'Duplicate alert could not be sent. Check mail diagnostics for details.');
        }
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
