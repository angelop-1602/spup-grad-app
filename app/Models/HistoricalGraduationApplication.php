<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoricalGraduationApplication extends Model
{
    protected $fillable = [
        'source_batch',
        'source_table',
        'source_row_id',
        'source_period_label',
        'reference_code',
        'student_id',
        'full_name',
        'last_name',
        'first_name',
        'middle_name',
        'attendance',
        'attendance_raw',
        'status_bucket',
        'status_raw',
        'email',
        'contact_number',
        'department_name',
        'course_name',
        'major_name',
        'degree_title',
        'sex',
        'civil_status',
        'religion',
        'nationality',
        'address',
        'date_of_birth',
        'place_of_birth',
        'thesis_title',
        'thesis_adviser',
        'submitted_at',
        'source_created_at',
        'source_updated_at',
        'subjects_json',
        'education_history_json',
        'source_payload_json',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'source_created_at' => 'datetime',
            'source_updated_at' => 'datetime',
            'subjects_json' => 'array',
            'education_history_json' => 'array',
            'source_payload_json' => 'array',
        ];
    }
}
