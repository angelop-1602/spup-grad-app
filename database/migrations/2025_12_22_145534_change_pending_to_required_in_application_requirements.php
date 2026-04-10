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

        // First, add 'required' to the enum (keeping 'pending' temporarily)
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending'");
        
        // Update existing 'pending' records to 'required'
        DB::statement("UPDATE application_requirements SET status = 'required' WHERE status = 'pending'");
        
        // Remove 'pending' from the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'required'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Add 'pending' back to the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending'");
        
        // Update 'required' back to 'pending'
        DB::statement("UPDATE application_requirements SET status = 'pending' WHERE status = 'required'");
        
        // Remove 'required' from the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending'");
    }
};
