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
        Schema::table('application_windows', function (Blueprint $table) {
            $table->renameColumn('name', 'title');
            $table->renameColumn('opens_at', 'start_date');
            $table->renameColumn('closes_at', 'end_date');
            $table->dropColumn('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('application_windows', function (Blueprint $table) {
            $table->renameColumn('title', 'name');
            $table->renameColumn('start_date', 'opens_at');
            $table->renameColumn('end_date', 'closes_at');
            $table->boolean('is_active')->default(false)->after('end_date');
        });
    }
};
