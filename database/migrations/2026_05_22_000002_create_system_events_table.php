<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_events', function (Blueprint $table) {
            $table->id();
            $table->string('module')->index();
            $table->string('action')->index();
            $table->string('status')->default('success')->index();
            $table->string('severity')->default('info')->index();
            $table->string('actor_guard')->nullable()->index();
            $table->string('actor_type')->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_label')->nullable();
            $table->nullableMorphs('subject');
            $table->text('message')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['module', 'action']);
            $table->index(['created_at', 'severity']);
            $table->index(['actor_type', 'actor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_events');
    }
};
