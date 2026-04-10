<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            // Drop the unique constraint on code
            $table->dropUnique(['code']);
            // Add unique constraint on department_id and code combination
            $table->unique(['department_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            // Drop the composite unique constraint
            $table->dropUnique(['department_id', 'code']);
            // Restore the unique constraint on code
            $table->unique('code');
        });
    }
};
