<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'last_name',
        'first_name',
        'middle_name',
        'suffix',
        'date_of_birth',
        'place_of_birth',
        'sex',
        'civil_status',
        'religion',
        'nationality',
        'permanent_address',
        'contact_number',
        'photo_path',
        'highest_education_level',
        // Legacy fields (kept for backward compatibility)
        'grade_school_name',
        'grade_school_year_graduated',
        'junior_high_school_name',
        'junior_high_school_year_graduated',
        'senior_high_school_name',
        'senior_high_school_year_graduated',
        'college_degree',
        'college_school_name',
        'college_year_graduated',
        'college_transferee_note',
        'is_transferee',
        'graduate_school_degree',
        'graduate_school_school_name',
        'graduate_school_year_graduated',
        // Grade School (Grade 1-6)
        'grade_1_school', 'grade_1_year',
        'grade_2_school', 'grade_2_year',
        'grade_3_school', 'grade_3_year',
        'grade_4_school', 'grade_4_year',
        'grade_5_school', 'grade_5_year',
        'grade_6_school', 'grade_6_year',
        // Junior High School (1st-4th Year)
        'jhs_1_school', 'jhs_1_year',
        'jhs_2_school', 'jhs_2_year',
        'jhs_3_school', 'jhs_3_year',
        'jhs_4_school', 'jhs_4_year',
        // Senior High School (Grade 11-12)
        'shs_11_school', 'shs_11_year',
        'shs_12_school', 'shs_12_year',
        // Graduate School
        'grad_masteral_school', 'grad_masteral_year',
        'grad_doctoral_school', 'grad_doctoral_year',
    ];

    protected $appends = [
        'photo_url',
    ];

    protected function casts(): array
    {
        $casts = [
            'date_of_birth' => 'date:Y-m-d',
            'grade_school_year_graduated' => 'integer',
            'junior_high_school_year_graduated' => 'integer',
            'senior_high_school_year_graduated' => 'integer',
            'college_year_graduated' => 'integer',
            'graduate_school_year_graduated' => 'integer',
            'is_transferee' => 'boolean',
        ];

        // Grade School years
        for ($i = 1; $i <= 6; $i++) {
            $casts["grade_{$i}_year"] = 'integer';
        }

        // Junior High School years
        for ($i = 1; $i <= 4; $i++) {
            $casts["jhs_{$i}_year"] = 'integer';
        }

        // Senior High School years
        $casts['shs_11_year'] = 'integer';
        $casts['shs_12_year'] = 'integer';

        // Graduate School years
        $casts['grad_masteral_year'] = 'integer';
        $casts['grad_doctoral_year'] = 'integer';

        return $casts;
    }

    /**
     * Get the user that owns the profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return \App\Support\ProfilePhoto::url($this->photo_path);
    }
}
