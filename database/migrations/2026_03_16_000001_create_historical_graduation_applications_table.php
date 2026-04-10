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
        Schema::create('historical_graduation_applications', function (Blueprint $table) {
            $table->id();
            $table->string('source_batch');
            $table->string('source_table');
            $table->unsignedBigInteger('source_row_id');
            $table->string('source_period_label');
            $table->string('reference_code')->nullable();
            $table->string('student_id')->nullable();
            $table->string('full_name');
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('attendance')->nullable();
            $table->string('attendance_raw')->nullable();
            $table->string('status_bucket')->default('unknown');
            $table->string('status_raw')->nullable();
            $table->string('email')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('department_name')->nullable();
            $table->string('course_name')->nullable();
            $table->string('major_name')->nullable();
            $table->string('degree_title')->nullable();
            $table->string('sex')->nullable();
            $table->string('civil_status')->nullable();
            $table->string('religion')->nullable();
            $table->string('nationality')->nullable();
            $table->text('address')->nullable();
            $table->string('date_of_birth')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->text('thesis_title')->nullable();
            $table->string('thesis_adviser')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('source_created_at')->nullable();
            $table->timestamp('source_updated_at')->nullable();
            $table->json('subjects_json')->nullable();
            $table->json('education_history_json')->nullable();
            $table->json('source_payload_json')->nullable();
            $table->timestamps();

            $table->unique(['source_batch', 'source_table', 'source_row_id'], 'historical_grad_source_unique');
            $table->index(['source_batch', 'status_bucket'], 'historical_grad_batch_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historical_graduation_applications');
    }
};
