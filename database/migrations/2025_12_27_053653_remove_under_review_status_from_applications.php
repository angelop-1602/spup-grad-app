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
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // First, add 'pending' to the enum (keeping 'under_review' temporarily)
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'pending', 'approved', 'incomplete') NOT NULL DEFAULT 'submitted'");
        
        // Then, update any existing 'under_review' status to 'pending'
        DB::statement("UPDATE applications SET status = 'pending' WHERE status = 'under_review'");
        
        // Finally, remove 'under_review' from the enum
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'pending', 'approved', 'incomplete') NOT NULL DEFAULT 'submitted'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Add 'under_review' back to the enum
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'pending', 'approved', 'incomplete') NOT NULL DEFAULT 'submitted'");
        
        // Note: We can't automatically revert 'pending' back to 'under_review' as we don't know which ones were originally 'under_review'
    }
};
