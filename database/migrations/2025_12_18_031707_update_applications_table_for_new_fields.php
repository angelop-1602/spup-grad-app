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
        Schema::table('applications', function (Blueprint $table) {
            // Change presence enum to attending/not attending
            $table->dropColumn('presence');
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->enum('presence', ['attending', 'not attending'])->default('attending')->after('degree_title');
        });

        Schema::table('applications', function (Blueprint $table) {
            // Add fields for master/doctoral programs
            $table->string('subject_code')->nullable()->after('presence');
            $table->string('subject_title')->nullable()->after('subject_code');
            $table->integer('units')->nullable()->after('subject_title');
            $table->string('thesis_dissertation_title')->nullable()->after('units');
            $table->string('thesis_dissertation_adviser')->nullable()->after('thesis_dissertation_title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn([
                'thesis_dissertation_adviser',
                'thesis_dissertation_title',
                'units',
                'subject_title',
                'subject_code',
                'presence',
            ]);
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->enum('presence', ['In Person', 'Online', 'Hybrid'])->default('In Person')->after('degree_title');
        });
    }
};
