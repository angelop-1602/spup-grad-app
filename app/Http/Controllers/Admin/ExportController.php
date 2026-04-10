<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationWindow;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFacade;

class ExportController extends Controller
{
    /**
     * Export applications.
     */
    public function applications(Request $request)
    {
        $query = Application::query()
            ->with(['user.profile', 'window', 'department', 'course']);

        // Filter by window
        if ($request->has('window_id') && $request->window_id) {
            $query->where('window_id', $request->window_id);
        }

        // Filter by department
        if ($request->has('department_id') && $request->department_id) {
            $query->where('department_id', $request->department_id);
        }

        $applications = $query->orderBy('created_at', 'desc')->get();

        $format = $request->get('format', 'csv');

        if ($format === 'csv') {
            return $this->exportCsv($applications);
        }

        // For now, only CSV is supported
        // TODO: Add Excel and PDF export when packages are installed
        return redirect()
            ->back()
            ->with('error', 'Only CSV format is currently supported.');
    }

    /**
     * Export applications as CSV.
     */
    private function exportCsv($applications)
    {
        $filename = 'applications_'.now()->format('Y-m-d_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($applications) {
            $file = fopen('php://output', 'w');

            // Header row
            fputcsv($file, [
                'ID',
                'Student Name',
                'Student ID',
                'Email',
                'Window',
                'Department',
                'Course',
                'Major',
                'Status',
                'Presence',
                'Submitted At',
            ]);

            // Data rows
            foreach ($applications as $application) {
                fputcsv($file, [
                    $application->id,
                    $application->user->name,
                    $application->user->student_id,
                    $application->user->email,
                    $application->window->title,
                    $application->department->name,
                    $application->course->name,
                    $application->major,
                    $application->status,
                    $application->presence,
                    $application->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return ResponseFacade::stream($callback, 200, $headers);
    }
}
