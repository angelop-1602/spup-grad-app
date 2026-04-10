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
        Schema::create('guest_application_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('window_id')->constrained('application_windows')->cascadeOnDelete();
            $table->string('email');
            $table->string('student_id');
            $table->json('payload');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('application_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['window_id', 'email']);
            $table->index(['email', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('guest_application_drafts');
    }
};
