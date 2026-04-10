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
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->enum('highest_education_level', [
                'elementary',
                'junior_high_school',
                'senior_high_school',
                'college',
                'masters',
                'doctor',
            ])->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->enum('highest_education_level', [
                'elementary',
                'junior_high_school',
                'senior_high_school',
                'college',
            ])->nullable()->change();
        });
    }
};
