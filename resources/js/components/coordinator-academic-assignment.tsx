import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface CoordinatorAssignmentCourse {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
}

export interface CoordinatorAssignmentDepartment {
    id: number;
    name: string;
    code: string;
    courses: CoordinatorAssignmentCourse[];
}

interface CoordinatorAcademicAssignmentProps {
    departments: CoordinatorAssignmentDepartment[];
    departmentIds: number[];
    courseIds: number[];
    errors?: {
        department_ids?: string;
        course_ids?: string;
    };
    onChange: (departmentIds: number[], courseIds: number[]) => void;
}

const unique = (values: number[]) => Array.from(new Set(values));

export function CoordinatorAcademicAssignment({
    departments,
    departmentIds,
    courseIds,
    errors,
    onChange,
}: CoordinatorAcademicAssignmentProps) {
    const toggleDepartment = (
        department: CoordinatorAssignmentDepartment,
        checked: boolean | 'indeterminate',
    ) => {
        const nextDepartmentIds = new Set(departmentIds);
        const nextCourseIds = new Set(courseIds);
        const departmentCourseIds = department.courses.map(
            (course) => course.id,
        );

        if (checked === true) {
            nextDepartmentIds.add(department.id);
            departmentCourseIds.forEach((courseId) =>
                nextCourseIds.add(courseId),
            );
        } else {
            nextDepartmentIds.delete(department.id);
            departmentCourseIds.forEach((courseId) =>
                nextCourseIds.delete(courseId),
            );
        }

        onChange(
            unique(Array.from(nextDepartmentIds)),
            unique(Array.from(nextCourseIds)),
        );
    };

    const toggleCourse = (
        department: CoordinatorAssignmentDepartment,
        courseId: number,
        checked: boolean | 'indeterminate',
    ) => {
        const nextDepartmentIds = new Set(departmentIds);
        const nextCourseIds = new Set(courseIds);

        if (checked === true) {
            nextCourseIds.add(courseId);
        } else {
            nextCourseIds.delete(courseId);
        }

        const hasSelectedCourseInDepartment = department.courses.some(
            (course) => nextCourseIds.has(course.id),
        );

        if (hasSelectedCourseInDepartment) {
            nextDepartmentIds.add(department.id);
        } else {
            nextDepartmentIds.delete(department.id);
        }

        onChange(
            unique(Array.from(nextDepartmentIds)),
            unique(Array.from(nextCourseIds)),
        );
    };

    const departmentCheckedState = (
        department: CoordinatorAssignmentDepartment,
    ): boolean | 'indeterminate' => {
        const departmentCourseIds = department.courses.map(
            (course) => course.id,
        );

        if (departmentCourseIds.length === 0) {
            return departmentIds.includes(department.id);
        }

        const selectedCount = departmentCourseIds.filter((courseId) =>
            courseIds.includes(courseId),
        ).length;

        if (selectedCount === 0) {
            return false;
        }

        return selectedCount === departmentCourseIds.length
            ? true
            : 'indeterminate';
    };

    return (
        <div className="space-y-3">
            <div>
                <Label>Assigned Academic Structure</Label>
                <p className="text-sm text-muted-foreground">
                    Select a department to assign all courses/programs under it,
                    or select specific courses/programs.
                </p>
            </div>

            <div className="space-y-3">
                {departments.map((department) => (
                    <div
                        key={department.id}
                        className="rounded-md border bg-muted/30 p-3"
                    >
                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <Checkbox
                                checked={departmentCheckedState(department)}
                                onCheckedChange={(checked) =>
                                    toggleDepartment(department, checked)
                                }
                            />
                            <span>
                                {department.code
                                    ? `${department.code} - ${department.name}`
                                    : department.name}
                            </span>
                        </label>

                        {department.courses.length > 0 ? (
                            <div className="mt-3 grid gap-2 pl-6 md:grid-cols-2">
                                {department.courses.map((course) => (
                                    <label
                                        key={course.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={courseIds.includes(
                                                course.id,
                                            )}
                                            onCheckedChange={(checked) =>
                                                toggleCourse(
                                                    department,
                                                    course.id,
                                                    checked,
                                                )
                                            }
                                        />
                                        <span>
                                            {course.code
                                                ? `${course.code} - ${course.name}`
                                                : course.name}
                                            {!course.is_active && (
                                                <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                    Inactive
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-2 pl-6 text-sm text-muted-foreground">
                                No courses/programs are listed under this
                                department.
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {errors?.department_ids && (
                <p className="text-sm text-destructive">
                    {errors.department_ids}
                </p>
            )}
            {errors?.course_ids && (
                <p className="text-sm text-destructive">{errors.course_ids}</p>
            )}
        </div>
    );
}
