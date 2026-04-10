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
            // Grade School (Grade 1-6)
            for ($i = 1; $i <= 6; $i++) {
                $table->string("grade_{$i}_school")->nullable()->after('grade_school_year_graduated');
                $table->year("grade_{$i}_year")->nullable()->after("grade_{$i}_school");
            }

            // Junior High School (1st-4th Year)
            for ($i = 1; $i <= 4; $i++) {
                $table->string("jhs_{$i}_school")->nullable()->after('junior_high_school_year_graduated');
                $table->year("jhs_{$i}_year")->nullable()->after("jhs_{$i}_school");
            }

            // Senior High School (Grade 11-12)
            $table->string('shs_11_school')->nullable()->after('senior_high_school_year_graduated');
            $table->year('shs_11_year')->nullable()->after('shs_11_school');
            $table->string('shs_12_school')->nullable()->after('shs_11_year');
            $table->year('shs_12_year')->nullable()->after('shs_12_school');

            // Graduate School (Masteral, Doctoral)
            $table->string('grad_masteral_school')->nullable()->after('graduate_school_year_graduated');
            $table->year('grad_masteral_year')->nullable()->after('grad_masteral_school');
            $table->string('grad_doctoral_school')->nullable()->after('grad_masteral_year');
            $table->year('grad_doctoral_year')->nullable()->after('grad_doctoral_school');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            // Grade School
            for ($i = 1; $i <= 6; $i++) {
                $table->dropColumn(["grade_{$i}_school", "grade_{$i}_year"]);
            }

            // Junior High School
            for ($i = 1; $i <= 4; $i++) {
                $table->dropColumn(["jhs_{$i}_school", "jhs_{$i}_year"]);
            }

            // Senior High School
            $table->dropColumn(['shs_11_school', 'shs_11_year', 'shs_12_school', 'shs_12_year']);

            // Graduate School
            $table->dropColumn(['grad_masteral_school', 'grad_masteral_year', 'grad_doctoral_school', 'grad_doctoral_year']);
        });
    }
};
