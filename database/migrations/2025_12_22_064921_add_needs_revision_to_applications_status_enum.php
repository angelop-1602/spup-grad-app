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

        DB::statement("ALTER TABLE `applications` MODIFY COLUMN `status` ENUM('submitted', 'under_review', 'approved', 'rejected') NOT NULL DEFAULT 'submitted'");
    }
};
