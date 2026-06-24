<?php

use App\Models\Admin;
use App\Models\Course;
use App\Models\Department;
use App\Models\Major;
use Inertia\Testing\AssertableInertia as Assert;

function academicStructureAdmin(): Admin
{
    static $count = 0;

    $count++;

    return Admin::create([
        'name' => 'Academic Structure Admin',
        'email' => "academic.structure.admin.{$count}@example.com",
        'password' => 'password',
    ]);
}

test('admin can view academic structure and edit screens', function () {
    $this->withoutVite();

    $admin = academicStructureAdmin();

    $department = Department::create([
        'name' => 'College of Academic CRUD',
        'code' => 'CAC',
        'description' => 'Academic structure test department',
        'is_active' => true,
    ]);

    $course = Course::create([
        'department_id' => $department->id,
        'name' => 'Bachelor of CRUD Studies',
        'code' => 'BCS',
        'description' => 'Academic structure test course',
        'is_active' => true,
    ]);

    $major = Major::create([
        'course_id' => $course->id,
        'name' => 'CRUD Operations',
        'code' => 'CRUD',
        'description' => 'Academic structure test major',
        'is_active' => true,
    ]);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.departments.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/departments/index')
            ->where('departments.0.id', $department->id)
            ->where('departments.0.courses.0.id', $course->id)
            ->where('departments.0.courses.0.majors.0.id', $major->id)
        );

    $this->actingAs($admin, 'admin')
        ->get(route('admin.departments.edit', $department))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/departments/edit')
            ->where('department.id', $department->id)
        );

    $this->actingAs($admin, 'admin')
        ->get(route('admin.courses.edit', $course))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/courses/edit')
            ->where('course.id', $course->id)
            ->has('departments', 1)
        );

    $this->actingAs($admin, 'admin')
        ->get(route('admin.majors.edit', $major))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/majors/edit')
            ->where('major.id', $major->id)
        );
});

test('admin can create update and delete academic structure records', function () {
    $this->withoutVite();

    $admin = academicStructureAdmin();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.departments.store'), [
            'name' => 'College of Lifecycle Tests',
            'code' => 'CLT',
            'description' => 'Created through feature test',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $department = Department::where('code', 'CLT')->firstOrFail();

    $this->actingAs($admin, 'admin')
        ->put(route('admin.departments.update', $department), [
            'name' => 'College of Lifecycle Testing',
            'code' => 'CLT',
            'description' => 'Updated through feature test',
            'is_active' => false,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $department->refresh();

    expect($department->name)->toBe('College of Lifecycle Testing')
        ->and($department->is_active)->toBeFalse();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.courses.store'), [
            'department_id' => $department->id,
            'name' => 'Bachelor of Lifecycle Testing',
            'code' => 'BLT',
            'description' => 'Created through feature test',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $course = Course::where('department_id', $department->id)
        ->where('code', 'BLT')
        ->firstOrFail();

    $this->actingAs($admin, 'admin')
        ->put(route('admin.courses.update', $course), [
            'department_id' => $department->id,
            'name' => 'Bachelor of Updated Lifecycle Testing',
            'code' => 'BLT',
            'description' => 'Updated through feature test',
            'is_active' => false,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $course->refresh();

    expect($course->name)->toBe('Bachelor of Updated Lifecycle Testing')
        ->and($course->is_active)->toBeFalse();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.majors.store'), [
            'course_id' => $course->id,
            'name' => 'Lifecycle Automation',
            'code' => 'LA',
            'description' => 'Created through feature test',
            'is_active' => true,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $major = Major::where('course_id', $course->id)
        ->where('code', 'LA')
        ->firstOrFail();

    $this->actingAs($admin, 'admin')
        ->put(route('admin.majors.update', $major), [
            'course_id' => $course->id,
            'name' => 'Updated Lifecycle Automation',
            'code' => 'LA',
            'description' => 'Updated through feature test',
            'is_active' => false,
        ])
        ->assertRedirect(route('admin.departments.index'));

    $major->refresh();

    expect($major->name)->toBe('Updated Lifecycle Automation')
        ->and($major->is_active)->toBeFalse();

    $this->actingAs($admin, 'admin')
        ->delete(route('admin.majors.destroy', $major))
        ->assertRedirect(route('admin.departments.index'));

    $this->assertDatabaseMissing('majors', [
        'id' => $major->id,
    ]);

    $this->actingAs($admin, 'admin')
        ->delete(route('admin.courses.destroy', $course))
        ->assertRedirect(route('admin.departments.index'));

    $this->assertDatabaseMissing('courses', [
        'id' => $course->id,
    ]);

    $this->actingAs($admin, 'admin')
        ->delete(route('admin.departments.destroy', $department))
        ->assertRedirect(route('admin.departments.index'));

    $this->assertDatabaseMissing('departments', [
        'id' => $department->id,
    ]);
});
