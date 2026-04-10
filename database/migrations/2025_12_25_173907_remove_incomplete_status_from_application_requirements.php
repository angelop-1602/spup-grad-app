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

        // Update existing 'incomplete' records to 'required' before removing from enum
        DB::statement("UPDATE application_requirements SET status = 'required' WHERE status = 'incomplete'");
        
        // Remove 'incomplete' from the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'required', 'approved', 'rejected') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Add 'incomplete' back to the enum
        DB::statement("ALTER TABLE `application_requirements` MODIFY COLUMN `status` ENUM('pending', 'required', 'approved', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending'");
    }
};
