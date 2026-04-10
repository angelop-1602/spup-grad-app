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
        Schema::table('application_requirements', function (Blueprint $table) {
            $table->foreignId('approved_by_coordinator_id')
                ->nullable()
                ->after('notes')
                ->constrained('coordinators')
                ->nullOnDelete();
            $table->timestamp('approved_at')
                ->nullable()
                ->after('approved_by_coordinator_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('application_requirements', function (Blueprint $table) {
            $table->dropForeign(['approved_by_coordinator_id']);
            $table->dropColumn(['approved_by_coordinator_id', 'approved_at']);
        });
    }
};
