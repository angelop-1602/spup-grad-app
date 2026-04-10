<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get all applications with entry_requirements
        $entryRequirements = DB::table('application_requirements')
            ->where('requirement_key', 'entry_requirements')
            ->get();

        foreach ($entryRequirements as $entryReq) {
            // Check if parent already exists (from previous migration attempt)
            $existingParent = DB::table('application_requirements')
                ->where('application_id', $entryReq->application_id)
                ->where('requirement_key', 'entry_requirements')
                ->whereNull('parent_id')
                ->first();

            if ($existingParent) {
                // Parent already exists, use it
                $parentId = $existingParent->id;
            } else {
                // Delete the old entry_requirements record first
                DB::table('application_requirements')
                    ->where('id', $entryReq->id)
                    ->delete();

                // Create parent entry_requirements record
                $parentId = DB::table('application_requirements')->insertGetId([
                    'application_id' => $entryReq->application_id,
                    'requirement_key' => 'entry_requirements',
                    'requirement_label' => 'Entry Requirements',
                    'status' => $entryReq->status,
                    'notes' => $entryReq->notes,
                    'file_path' => null, // Parent doesn't have a file
                    'parent_id' => null,
                    'created_at' => $entryReq->created_at,
                    'updated_at' => now(),
                ]);
            }

            // Check if children already exist
            $existingChildren = DB::table('application_requirements')
                ->where('parent_id', $parentId)
                ->count();

            if ($existingChildren > 0) {
                // Children already exist, skip
                continue;
            }

            // Create child requirements
            $children = [
                [
                    'application_id' => $entryReq->application_id,
                    'requirement_key' => 'tor',
                    'requirement_label' => 'Transcript of Records (TOR)',
                    'status' => $entryReq->status, // Inherit parent status initially
                    'notes' => null,
                    'file_path' => null, // We can't split the file, so set to null
                    'parent_id' => $parentId,
                    'created_at' => $entryReq->created_at,
                    'updated_at' => now(),
                ],
                [
                    'application_id' => $entryReq->application_id,
                    'requirement_key' => 'form_137',
                    'requirement_label' => 'Form 137',
                    'status' => $entryReq->status,
                    'notes' => null,
                    'file_path' => null,
                    'parent_id' => $parentId,
                    'created_at' => $entryReq->created_at,
                    'updated_at' => now(),
                ],
                [
                    'application_id' => $entryReq->application_id,
                    'requirement_key' => 'psa_birth_certificate',
                    'requirement_label' => 'PSA Birth Certificate',
                    'status' => $entryReq->status,
                    'notes' => null,
                    'file_path' => null,
                    'parent_id' => $parentId,
                    'created_at' => $entryReq->created_at,
                    'updated_at' => now(),
                ],
                [
                    'application_id' => $entryReq->application_id,
                    'requirement_key' => 'marriage_certificate',
                    'requirement_label' => 'Marriage Certificate (if applicable)',
                    'status' => $entryReq->status,
                    'notes' => null,
                    'file_path' => null,
                    'parent_id' => $parentId,
                    'created_at' => $entryReq->created_at,
                    'updated_at' => now(),
                ],
            ];

            DB::table('application_requirements')->insert($children);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Get all parent entry_requirements
        $parentRequirements = DB::table('application_requirements')
            ->where('requirement_key', 'entry_requirements')
            ->whereNull('parent_id')
            ->get();

        foreach ($parentRequirements as $parent) {
            // Get children
            $children = DB::table('application_requirements')
                ->where('parent_id', $parent->id)
                ->get();

            if ($children->isNotEmpty()) {
                // Determine overall status (worst status wins)
                $statuses = $children->pluck('status')->toArray();
                $overallStatus = 'pending';
                if (in_array('required', $statuses)) {
                    $overallStatus = 'required';
                } elseif (in_array('approved', $statuses) && !in_array('required', $statuses)) {
                    // If all are approved, set to approved
                    if (count(array_unique($statuses)) === 1 && $statuses[0] === 'approved') {
                        $overallStatus = 'approved';
                    }
                }

                // Combine notes
                $notes = $children->pluck('notes')
                    ->filter()
                    ->implode('; ');

                // Create combined entry_requirements record
                DB::table('application_requirements')->insert([
                    'application_id' => $parent->application_id,
                    'requirement_key' => 'entry_requirements',
                    'requirement_label' => 'Entry Requirements',
                    'status' => $overallStatus,
                    'notes' => $notes ?: null,
                    'file_path' => null,
                    'parent_id' => null,
                    'created_at' => $parent->created_at,
                    'updated_at' => now(),
                ]);

                // Delete parent and children
                DB::table('application_requirements')
                    ->where('id', $parent->id)
                    ->delete();
                DB::table('application_requirements')
                    ->where('parent_id', $parent->id)
                    ->delete();
            }
        }
    }
};
