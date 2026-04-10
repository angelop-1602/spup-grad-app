<?php

namespace App\Http\Controllers\Coordinator;

use App\Exports\CoordinatorWindowApplicationsExport;
use App\Http\Controllers\Concerns\BuildsHistoricalApplicationWindows;
use App\Http\Controllers\Controller;
use App\Http\Requests\Coordinator\UpdateApplicationStatusRequest;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Support\HistoricalWindowDataBuilder;
use App\Support\NationalityNormalizer;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApplicationController extends Controller
{
    use BuildsHistoricalApplicationWindows;

    /**
     * Display a listing of application windows for the coordinator.
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

        return Inertia::render('coordinator/applications/index', [
            'windows' => $windows,
            'historicalWindows' => $this->historicalWindows('coordinator.windows.historical'),
        ]);
    }

    /**
     * Display a historical application window (read-only).
     */
    public function historical(Request $request, string $batch): Response
    {
        $builder = new HistoricalWindowDataBuilder();

        return Inertia::render('coordinator/applications/window', $builder->build($request, $batch, 'coordinator'));
    }

    /**
     * Export applications for a window to XLSX for the coordinator's assigned departments.
     */
    public function export(Request $request)
    {
        $coordinator = Auth::guard('coordinator')->user();

        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        $windowId = (int) $request->get('window_id');
        $window = ApplicationWindow::findOrFail($windowId);

        $search = $request->get('search');

        $export = new CoordinatorWindowApplicationsExport($window->id, $departmentIds, $search);

        $safeTitle = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], '-', $window->title);
        $fileName = $safeTitle.'_coordinator.xlsx';

        return Excel::download($export, $fileName);
    }

    /**
     * Export statistics PDF for the specified window (coordinator's departments only).
     */
    public function exportStatisticsPdf(Request $request, ApplicationWindow $window)
    {
        $coordinator = Auth::guard('coordinator')->user();
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        // Load all applications for statistics (filtered by coordinator departments)
        $allApplications = $window->applications()
            ->whereIn('department_id', $departmentIds)
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
     * Show a specific application window with applications limited to coordinator departments.
     */
    public function window(Request $request, ApplicationWindow $window): Response
    {
        $coordinator = Auth::guard('coordinator')->user();
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        // Get search query and status filter
        $search = $request->get('search', '');
        $statusFilter = $request->get('status', 'all');

        // Build applications query with search and status filter
        $applicationsQuery = $window->applications()
            ->whereIn('department_id', $departmentIds)
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

        // Load all applications for statistics (without pagination, filtered by coordinator departments)
        $allApplications = $window->applications()
            ->whereIn('department_id', $departmentIds)
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
                    return \App\Support\NationalityNormalizer::normalize($app->user->profile->nationality);
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

        // Flatten for chart display
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
                return \App\Support\NationalityNormalizer::normalize($app->user->profile->nationality);
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

        // Ensure applications is properly formatted for Inertia
        $applicationsData = $applications->toArray();

        return Inertia::render('coordinator/applications/window', [
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
                'hierarchical' => $byDepartment ?: [],
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
     * Display the specified application (read-only).
     */
    public function show(Application $application): Response
    {
        $coordinator = Auth::guard('coordinator')->user();

        // Ensure application belongs to coordinator's department
        $departmentIds = $coordinator->departments()->pluck('departments.id');

        if (! in_array($application->department_id, $departmentIds->toArray())) {
            abort(403, 'Unauthorized access to this application.');
        }

        $application->load([
            'user.profile',
            'window',
            'department',
            'course',
            'subjectEnrollments',
            'requirements.children',
        ]);

        // Ensure default requirements exist for this application
        if ($application->requirements->isEmpty()) {
            // Create entry_requirements as parent with children
            $entryParent = $application->requirements()->create([
                'requirement_key' => 'entry_requirements',
                'requirement_label' => 'Entry Requirements',
                'status' => 'pending',
                'parent_id' => null,
            ]);

            // Create children for entry requirements
            $entryChildren = [
                [
                    'requirement_key' => 'tor',
                    'requirement_label' => 'Transcript of Records (TOR)',
                    'status' => 'pending',
                    'parent_id' => $entryParent->id,
                ],
                [
                    'requirement_key' => 'form_137',
                    'requirement_label' => 'Form 137',
                    'status' => 'pending',
                    'parent_id' => $entryParent->id,
                ],
                [
                    'requirement_key' => 'psa_birth_certificate',
                    'requirement_label' => 'PSA Birth Certificate',
                    'status' => 'pending',
                    'parent_id' => $entryParent->id,
                ],
                [
                    'requirement_key' => 'marriage_certificate',
                    'requirement_label' => 'Marriage Certificate (if applicable)',
                    'status' => 'pending',
                    'parent_id' => $entryParent->id,
                ],
            ];

            foreach ($entryChildren as $child) {
                $application->requirements()->create($child);
            }

            // Create other requirements
            $otherRequirements = [
                [
                    'requirement_key' => 'complete_grades',
                    'requirement_label' => 'Complete Grades',
                    'status' => 'pending',
                    'parent_id' => null,
                ],
                [
                    'requirement_key' => 'hardbound_copies',
                    'requirement_label' => 'Hardbound Copies of Theses/Dissertation Books with CDs',
                    'status' => 'pending',
                    'parent_id' => null,
                ],
                [
                    'requirement_key' => 'id_picture',
                    'requirement_label' => '2x2 ID Picture with white background and nametag',
                    'status' => 'pending',
                    'parent_id' => null,
                ],
                [
                    'requirement_key' => 'reviewer_certification',
                    'requirement_label' => 'Dissertation/Thesis Reviewer\'s Certification signed by the In-Charge of Language Editing of Thesis/Dissertation Papers',
                    'status' => 'pending',
                    'parent_id' => null,
                ],
                [
                    'requirement_key' => 'journal_publication',
                    'requirement_label' => 'Certificate of Journal Publication signed by the CPRINT Director',
                    'status' => 'pending',
                    'parent_id' => null,
                ],
            ];

            foreach ($otherRequirements as $req) {
                $application->requirements()->create($req);
            }

            // Reload requirements relation so the fresh data is sent to the frontend
            $application->load('requirements.children');
        }

        return Inertia::render('coordinator/applications/show', [
            'application' => $application,
        ]);
    }

    /**
     * Update the application status.
     * Note: Status will be automatically recalculated based on requirements checklist
     * to ensure consistency. Manual status changes may be overridden.
     */
    public function updateStatus(UpdateApplicationStatusRequest $request, Application $application): RedirectResponse
    {
        $coordinator = Auth::guard('coordinator')->user();

        // Ensure application belongs to coordinator's department
        $departmentIds = $coordinator->departments()->pluck('departments.id');

        if (! in_array($application->department_id, $departmentIds->toArray())) {
            abort(403, 'Unauthorized access to this application.');
        }

        // Coordinators can update application status regardless of window status
        $data = [
            'notes' => $request->notes,
        ];

        // When manually setting to approved, capture who approved and when.
        if ($request->status === 'approved') {
            $data['approved_by_coordinator_id'] = $coordinator->id;
            $data['approved_at'] = now();
        } else {
            // Reset approval metadata for non-approved statuses.
            $data['approved_by_coordinator_id'] = null;
            $data['approved_at'] = null;
        }

        $application->update($data);

        // Always recalculate status based on requirements to ensure consistency
        // This ensures status always reflects the current state of requirements
        $oldStatus = $application->status;
        $application->recalculateStatusBasedOnRequirements();
        $newStatus = $application->fresh()->status;

        // Prepare message
        $message = 'Application notes updated successfully.';
        if ($oldStatus !== $newStatus) {
            $message .= " Application status automatically updated from '{$oldStatus}' to '{$newStatus}' based on requirements checklist.";
        } else {
            $message .= " Application status remains '{$newStatus}' based on requirements checklist.";
        }

        return redirect()
            ->route('coordinator.applications.show', $application)
            ->with('success', $message);
    }

    /**
     * Update application requirements.
     */
    public function updateRequirements(Request $request, Application $application): RedirectResponse
    {
        $coordinator = Auth::guard('coordinator')->user();

        // Ensure application belongs to coordinator's department
        $departmentIds = $coordinator->departments()->pluck('departments.id');

        if (! in_array($application->department_id, $departmentIds->toArray())) {
            abort(403, 'Unauthorized access to this application.');
        }

        // Coordinators can update requirements regardless of window status
        $validated = $request->validate([
            'requirements' => 'required|array',
            'requirements.*.id' => 'required|exists:application_requirements,id',
            'requirements.*.status' => 'required|in:pending,required,approved',
            'requirements.*.notes' => 'nullable|string|max:1000',
        ]);

        $updatedCount = 0;
        foreach ($validated['requirements'] as $reqData) {
            try {
                $requirement = $application->requirements()->findOrFail($reqData['id']);
                
                // Ensure the requirement belongs to this application
                if ($requirement->application_id !== $application->id) {
                    continue; // Skip if requirement doesn't belong to this application
                }
                
                $updateData = [
                    'status' => $reqData['status'],
                    'notes' => !empty($reqData['notes']) && trim($reqData['notes']) !== '' ? trim($reqData['notes']) : null,
                ];

                // Track who approved and when
                if ($reqData['status'] === 'approved') {
                    $updateData['approved_by_coordinator_id'] = $coordinator->id;
                    $updateData['approved_at'] = now();
                } else {
                    // Clear approval tracking if status changes from approved
                    $updateData['approved_by_coordinator_id'] = null;
                    $updateData['approved_at'] = null;
                }

                $requirement->fill($updateData);
                $requirement->save();
                $updatedCount++;
            } catch (\Exception $e) {
                \Log::error('Failed to update requirement', [
                    'requirement_id' => $reqData['id'] ?? null,
                    'application_id' => $application->id,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }
        }

        // Reload requirements to check status
        $application->load('requirements.children');

        // Update parent requirement status based on children
        $this->updateParentRequirementStatus($application);

        // Always recalculate application status based on requirements checklist
        // This ensures status always reflects the current state of requirements
        $oldStatus = $application->status;
        $application->recalculateStatusBasedOnRequirements();
        $newStatus = $application->fresh()->status;

        // Prepare success message with status change info if applicable
        $message = 'Requirements updated successfully.';
        if ($oldStatus !== $newStatus) {
            $message .= " Application status updated from '{$oldStatus}' to '{$newStatus}' based on requirements checklist.";
        }

        return redirect()
            ->route('coordinator.applications.show', $application)
            ->with('success', $message);
    }

    /**
     * Update parent requirement status based on children statuses.
     */
    private function updateParentRequirementStatus(Application $application): void
    {
        $entryRequirement = $application->requirements()->where('requirement_key', 'entry_requirements')->whereNull('parent_id')->first();

        if ($entryRequirement) {
            $children = $entryRequirement->children;

            if ($children->isNotEmpty()) {
                $allApproved = $children->every(fn ($child) => $child->status === 'approved');
                $hasRequired = $children->contains(fn ($child) => $child->status === 'required');
                $allPending = $children->every(fn ($child) => $child->status === 'pending');

                if ($allApproved) {
                    $entryRequirement->update(['status' => 'approved']);
                } elseif ($hasRequired) {
                    $entryRequirement->update(['status' => 'required']);
                } elseif ($allPending) {
                    $entryRequirement->update(['status' => 'pending']);
                }
            }
        }
    }

    /**
     * Download an application DOCX (coordinator).
     */
    public function download(Application $application): BinaryFileResponse
    {
        $coordinator = Auth::guard('coordinator')->user();
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        if (! in_array($application->department_id, $departmentIds, true)) {
            abort(403, 'Unauthorized access to this application.');
        }

        return \App\Http\Controllers\ApplicationController::generateDocx($application);
    }

    public function downloadPhoto(Application $application): BinaryFileResponse
    {
        $coordinator = Auth::guard('coordinator')->user();
        $departmentIds = $coordinator->departments()->pluck('departments.id')->toArray();

        if (! in_array($application->department_id, $departmentIds, true)) {
            abort(403, 'Unauthorized access to this application.');
        }

        return \App\Http\Controllers\ApplicationController::generateProfilePhotoDownload($application);
    }

    /**
     * Mark a notification as read.
     */
    public function markNotificationAsRead(string $notificationId): RedirectResponse
    {
        $coordinator = Auth::guard('coordinator')->user();

        if (! $coordinator) {
            abort(403);
        }

        $notification = $coordinator->notifications()->find($notificationId);

        if ($notification && ! $notification->read_at) {
            $notification->markAsRead();
        }

        return redirect()->back();
    }
}
