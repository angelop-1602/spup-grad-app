<?php

namespace App\Console\Commands;

use App\Models\Application;
use Illuminate\Console\Command;

class RecalculateApplicationStatuses extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'applications:recalculate-statuses 
                            {--application= : Specific application number to recalculate}
                            {--dry-run : Show what would be changed without actually updating}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate application statuses based on their requirements checklist';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $applicationNumber = $this->option('application');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        // Get applications to process
        if ($applicationNumber) {
            $applications = Application::where('application_number', $applicationNumber)->get();
            if ($applications->isEmpty()) {
                $this->error("Application '{$applicationNumber}' not found.");

                return self::FAILURE;
            }
        } else {
            $applications = Application::with('requirements.children')->get();
        }

        $this->info("Found {$applications->count()} application(s) to process.");
        $this->newLine();

        $bar = $this->output->createProgressBar($applications->count());
        $bar->start();

        $updatedCount = 0;
        $unchangedCount = 0;
        $changes = [];

        foreach ($applications as $application) {
            $oldStatus = $application->status;

            // Load requirements if not already loaded
            if (! $application->relationLoaded('requirements')) {
                $application->load('requirements.children');
            }

            // Recalculate status
            if (! $dryRun) {
                $application->recalculateStatusBasedOnRequirements();
                $newStatus = $application->fresh()->status;
            } else {
                // In dry-run mode, we need to manually check what the status would be
                $topLevelRequirements = $application->requirements->whereNull('parent_id');

                if ($topLevelRequirements->isEmpty()) {
                    $newStatus = $oldStatus;
                } else {
                    $allApproved = $topLevelRequirements->every(function ($req) {
                        if ($req->children && $req->children->isNotEmpty()) {
                            return $req->children->every(fn ($child) => $child->status === 'approved');
                        }

                        return $req->status === 'approved';
                    });

                    $hasRequired = $topLevelRequirements->contains(function ($req) {
                        if ($req->children && $req->children->isNotEmpty()) {
                            return $req->children->contains(fn ($child) => $child->status === 'required');
                        }

                        return $req->status === 'required';
                    });

                    $allPending = $topLevelRequirements->every(function ($req) {
                        if ($req->children && $req->children->isNotEmpty()) {
                            return $req->children->every(fn ($child) => $child->status === 'pending');
                        }

                        return $req->status === 'pending';
                    });

                    // Check if review has started (same logic as hasReviewStarted() method)
                    $reviewStarted = $application->requirements->contains(function ($req) {
                        return ! empty($req->notes)
                            || $req->status !== 'pending'
                            || $req->updated_at->ne($req->created_at);
                    });

                    if ($hasRequired) {
                        $newStatus = 'incomplete';
                    } elseif ($allApproved) {
                        $newStatus = 'approved';
                    } elseif ($allPending) {
                        // If all requirements are pending:
                        // - If review has NOT started and current status is "submitted", keep it as "submitted"
                        // - Otherwise, set to "pending"
                        if (! $reviewStarted && $oldStatus === 'submitted') {
                            $newStatus = 'submitted';
                        } else {
                            $newStatus = 'pending';
                        }
                    } else {
                        $newStatus = 'pending';
                    }
                }
            }

            if ($oldStatus !== $newStatus) {
                $updatedCount++;
                $changes[] = [
                    'application' => $application->application_number,
                    'old' => $oldStatus,
                    'new' => $newStatus,
                ];
            } else {
                $unchangedCount++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Display results
        $this->info("✅ Processing complete!");
        $this->newLine();
        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Applications', $applications->count()],
                ['Status Changed', $updatedCount],
                ['Status Unchanged', $unchangedCount],
            ]
        );

        if ($updatedCount > 0) {
            $this->newLine();
            $this->info('📋 Applications with status changes:');
            $this->table(
                ['Application Number', 'Old Status', 'New Status'],
                array_map(fn ($change) => [$change['application'], $change['old'], $change['new']], $changes)
            );
        }

        if ($dryRun && $updatedCount > 0) {
            $this->newLine();
            $this->warn('💡 Run without --dry-run to apply these changes.');
        }

        return self::SUCCESS;
    }
}

