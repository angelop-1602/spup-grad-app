<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Department;
use App\Models\Major;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class DepartmentCourseMajorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jsonPath = base_path('public/dept_course_major.json');

        if (! File::exists($jsonPath)) {
            $this->command?->error('Department/Course/Major JSON file not found at public/dept_course_major.json');

            return;
        }

        $content = File::get($jsonPath);
        $decoded = json_decode($content, true);

        if (! is_array($decoded) || ! isset($decoded['departments']) || ! is_array($decoded['departments'])) {
            $this->command?->error('Invalid structure in dept_course_major.json');

            return;
        }

        foreach ($decoded['departments'] as $departmentData) {
            if (! isset($departmentData['code'], $departmentData['department'])) {
                continue;
            }

            $department = Department::updateOrCreate(
                ['code' => $departmentData['code']],
                [
                    'name' => $departmentData['department'],
                    'description' => $departmentData['department'],
                    'is_active' => true,
                ]
            );

            $programs = $departmentData['programs'] ?? [];

            foreach ($programs as $programData) {
                if (! isset($programData['code'], $programData['name'])) {
                    continue;
                }

                // Create course with main code
                $course = Course::updateOrCreate(
                    [
                        'department_id' => $department->id,
                        'code' => $programData['code'],
                    ],
                    [
                        'name' => $programData['name'],
                        'description' => $programData['name'],
                        'is_active' => true,
                    ]
                );

                $majors = $programData['majors'] ?? [];

                foreach ($majors as $majorData) {
                    if (! isset($majorData['code'], $majorData['name'])) {
                        continue;
                    }

                    Major::updateOrCreate(
                        [
                            'course_id' => $course->id,
                            'code' => $majorData['code'],
                        ],
                        [
                            'name' => $majorData['name'],
                            'description' => $majorData['name'],
                            'is_active' => true,
                        ]
                    );
                }

                // Handle altCodes - create separate courses for each altCode
                $altCodes = $programData['altCodes'] ?? [];
                foreach ($altCodes as $altCode) {
                    if (empty($altCode)) {
                        continue;
                    }

                    $altCourse = Course::updateOrCreate(
                        [
                            'department_id' => $department->id,
                            'code' => $altCode,
                        ],
                        [
                            'name' => $programData['name'],
                            'description' => $programData['name'],
                            'is_active' => true,
                        ]
                    );

                    // Also create majors for altCode courses if they exist
                    foreach ($majors as $majorData) {
                        if (! isset($majorData['code'], $majorData['name'])) {
                            continue;
                        }

                        // Check if this major code is specific to the altCode (contains the altCode)
                        $majorCode = $majorData['code'];
                        if (str_contains($majorCode, $altCode)) {
                            Major::updateOrCreate(
                                [
                                    'course_id' => $altCourse->id,
                                    'code' => $majorCode,
                                ],
                                [
                                    'name' => $majorData['name'],
                                    'description' => $majorData['name'],
                                    'is_active' => true,
                                ]
                            );
                        }
                    }
                }
            }
        }
    }
}
