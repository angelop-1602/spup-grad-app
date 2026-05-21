<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\ApplicationController as StudentApplicationController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateApplicationStatusRequest;
use App\Models\Application;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApplicationController extends Controller
{
    /**
     * Display the specified application.
     */
    public function show(Application $application): Response
    {
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

        return Inertia::render('admin/applications/show', [
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
        $data = [
            'notes' => $request->notes,
        ];

        // When manually setting to approved, capture who approved and when (admin approval)
        if ($request->status === 'approved') {
            $data['approved_by_coordinator_id'] = null; // Clear coordinator approval if admin approves
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
            ->route('admin.applications.show', $application)
            ->with('success', $message);
    }

    /**
     * Update application requirements.
     */
    public function updateRequirements(Request $request, Application $application): RedirectResponse
    {
        $validated = $request->validate([
            'requirements' => 'required|array',
            'requirements.*.id' => 'required|exists:application_requirements,id',
            'requirements.*.status' => 'required|in:pending,required,approved',
            'requirements.*.notes' => 'nullable|string|max:1000',
        ]);

        foreach ($validated['requirements'] as $reqData) {
            $requirement = $application->requirements()->findOrFail($reqData['id']);
            $updateData = [
                'status' => $reqData['status'],
                'notes' => $reqData['notes'] ?? null,
            ];

            // For admin, we don't track approval (coordinator approval is tracked)
            // But clear approval tracking if status changes from approved
            if ($reqData['status'] !== 'approved') {
                $updateData['approved_by_coordinator_id'] = null;
                $updateData['approved_at'] = null;
            }

            $requirement->update($updateData);
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
            ->route('admin.applications.show', $application)
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
     * Download an application PDF (admin).
     */
    public function download(Application $application): BinaryFileResponse
    {
        return StudentApplicationController::generatePdf($application);
    }

    public function downloadPhoto(Application $application): BinaryFileResponse
    {
        return StudentApplicationController::generateProfilePhotoDownload($application);
    }

    /**
     * Mark a notification as read.
     */
    public function markNotificationAsRead(string $notificationId): RedirectResponse
    {
        $admin = Auth::guard('admin')->user();

        if (! $admin) {
            abort(403);
        }

        $notification = $admin->notifications()->find($notificationId);

        if ($notification && ! $notification->read_at) {
            $notification->markAsRead();
        }

        return redirect()->back();
    }
}
