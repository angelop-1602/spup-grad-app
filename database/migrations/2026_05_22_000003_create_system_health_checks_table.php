<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_health_checks', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('status')->default('unknown')->index();
            $table->text('message')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('checked_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_health_checks');
    }
};
