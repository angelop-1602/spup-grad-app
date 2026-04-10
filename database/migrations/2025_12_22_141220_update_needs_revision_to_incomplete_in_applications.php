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

        // First, add 'incomplete' to the enum (keeping 'needs_revision' temporarily)
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'approved', 'rejected', 'needs_revision', 'incomplete') NOT NULL DEFAULT 'submitted'");
        
        // Then, update existing records with 'needs_revision' to 'incomplete'
        DB::statement("UPDATE applications SET status = 'incomplete' WHERE status = 'needs_revision'");
        
        // Finally, remove 'needs_revision' from the enum
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'approved', 'rejected', 'incomplete') NOT NULL DEFAULT 'submitted'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Update existing records with 'incomplete' back to 'needs_revision'
        DB::statement("UPDATE applications SET status = 'needs_revision' WHERE status = 'incomplete'");
        
        // Revert the enum back to 'needs_revision'
        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'approved', 'rejected', 'needs_revision') NOT NULL DEFAULT 'submitted'");
    }
};
