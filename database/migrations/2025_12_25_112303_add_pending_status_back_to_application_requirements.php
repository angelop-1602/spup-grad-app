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

        // Add 'pending' back to the enum and set it as default
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending'");
        
        // Update existing 'required' records that haven't been reviewed yet to 'pending'
        // Only update if they have no notes (indicating they haven't been reviewed)
        DB::statement("UPDATE application_requirements SET status = 'pending' WHERE status = 'required' AND notes IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Update 'pending' back to 'required'
        DB::statement("UPDATE application_requirements SET status = 'required' WHERE status = 'pending'");
        
        // Remove 'pending' from the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'required'");
    }
};
