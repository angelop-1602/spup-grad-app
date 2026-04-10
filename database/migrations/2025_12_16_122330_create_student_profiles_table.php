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
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();

            // Personal Info
            $table->string('last_name');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->date('date_of_birth');
            $table->string('place_of_birth');
            $table->enum('sex', ['Male', 'Female', 'Prefer not to say']);
            $table->string('civil_status');
            $table->string('religion')->nullable();
            $table->string('nationality');
            $table->text('permanent_address');
            $table->string('contact_number');
            // Email is in users table, not duplicated here

            // Educational Background
            // Grade School
            $table->string('grade_school_name')->nullable();
            $table->year('grade_school_year_graduated')->nullable();

            // Junior High School
            $table->string('junior_high_school_name')->nullable();
            $table->year('junior_high_school_year_graduated')->nullable();

            // Senior High School
            $table->string('senior_high_school_name')->nullable();
            $table->year('senior_high_school_year_graduated')->nullable();

            // College
            $table->string('college_degree')->nullable();
            $table->string('college_school_name')->nullable();
            $table->year('college_year_graduated')->nullable();
            $table->text('college_transferee_note')->nullable();

            // Graduate School
            $table->string('graduate_school_degree')->nullable();
            $table->string('graduate_school_school_name')->nullable();
            $table->year('graduate_school_year_graduated')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
