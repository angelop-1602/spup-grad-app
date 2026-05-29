<?php

use App\Models\Developer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('status')->default('open')->index();
            $table->string('category')->default('technical')->index();
            $table->string('priority')->default('normal')->index();
            $table->string('subject');
            $table->text('description');
            $table->string('reporter_guard')->nullable()->index();
            $table->string('reporter_type')->nullable();
            $table->unsignedBigInteger('reporter_id')->nullable();
            $table->string('reporter_name')->nullable();
            $table->string('reporter_email')->nullable();
            $table->string('page_url', 2048)->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('screenshot_disk')->nullable();
            $table->string('screenshot_path')->nullable();
            $table->string('screenshot_original_name')->nullable();
            $table->string('screenshot_mime')->nullable();
            $table->unsignedBigInteger('screenshot_size')->nullable();
            $table->foreignIdFor(Developer::class, 'resolved_by_developer_id')->nullable()->constrained('developers')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable()->index();
            $table->text('resolution_note')->nullable();
            $table->timestamps();

            $table->index(['status', 'priority', 'created_at']);
            $table->index(['reporter_type', 'reporter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
