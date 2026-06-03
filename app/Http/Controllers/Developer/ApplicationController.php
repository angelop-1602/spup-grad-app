<?php

namespace App\Http\Controllers\Developer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Application\StaffUpdateApplicationRequest;
use App\Models\Application;
use App\Models\Department;
use App\Support\ApplicationWorkflowService;
use App\Support\GuestApplicationDraftDetails;
use App\Support\PossibleDuplicateApplications;
use App\Support\SystemEventLogger;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    public function edit(
        Application $application,
        PossibleDuplicateApplications $duplicates,
        GuestApplicationDraftDetails $draftDetails,
    ): Response {
        $this->loadApplicationForEditing($application);

        return Inertia::render('developer/applications/edit', [
            'application' => $application,
            'profile' => $application->user?->profile,
            'departments' => $this->departmentsForEditing(),
            'isApproved' => $application->status === 'approved',
            'updateUrl' => route('developer.applications.update', $application->application_number, false),
            'cancelHref' => route('developer.manual-verification', ['search' => $application->application_number], false),
            'tracking' => $draftDetails->trackingForApplication($application),
            'possibleDuplicates' => $duplicates->forApplication(
                $application,
                'developer.applications.edit',
                'developer.applications.edit',
                'developer.applications.destroy',
            ),
        ]);
    }

    public function update(
        StaffUpdateApplicationRequest $request,
        Application $application,
        ApplicationWorkflowService $workflow,
        SystemEventLogger $logger,
    ): RedirectResponse {
        $workflow->updateApplicationForUser($application, $request->validated(), $request->file('photo'));

        $application->load('requirements.children');
        $oldStatus = $application->status;
        $application->recalculateStatusBasedOnRequirements();
        $newStatus = $application->fresh()->status;

        $logger->log(
            module: 'graduation_application',
            action: 'developer.application.data_updated',
            message: 'Developer updated application data.',
            subject: $application,
            meta: [
                'application_number' => $application->application_number,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
            ],
        );

        return redirect()
            ->route('developer.applications.edit', $application)
            ->with('success', 'Application data updated successfully.');
    }

    public function destroy(Application $application, SystemEventLogger $logger): RedirectResponse
    {
        $applicationNumber = $application->application_number;

        $logger->log(
            module: 'graduation_application',
            action: 'developer.application.deleted',
            message: 'Developer deleted an application.',
            subject: $application,
            meta: ['application_number' => $applicationNumber],
        );

        $application->delete();

        return redirect()
            ->route('developer.manual-verification')
            ->with('success', "Application {$applicationNumber} deleted successfully.");
    }

    private function loadApplicationForEditing(Application $application): void
    {
        $application->load([
            'user.profile',
            'window',
            'department',
            'course',
            'subjectEnrollments',
        ]);
    }

    private function departmentsForEditing()
    {
        return Department::with([
            'courses' => function ($query) {
                $query->active()->orderBy('name');
            },
            'courses.majors' => function ($query) {
                $query->active()->orderBy('name');
            },
        ])->active()->orderBy('name')->get();
    }
}
