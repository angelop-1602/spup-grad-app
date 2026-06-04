import { HistoryBackButton } from '@/components/history-back-button';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { GraduationCap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface CourseOption {
    id: number;
    name: string;
    department: {
        id: number;
        name: string;
    };
}

interface DepartmentOption {
    id: number;
    name: string;
}

interface Major {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    is_active: boolean;
    course: {
        id: number;
        name: string;
        department: {
            id: number;
            name: string;
        };
    };
}

interface EditMajorProps {
    major: Major;
    departments: DepartmentOption[];
    courses: CourseOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Academic Structure',
        href: adminRoutes.departments.index().url,
    },
    {
        title: 'Edit Major',
        href: '#',
    },
];

export default function EditMajor({
    major,
    departments,
    courses,
}: EditMajorProps) {
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<
        number | ''
    >(major.course.department.id);

    const { data, setData, put, processing, errors } = useForm({
        course_id: major.course.id,
        name: major.name,
        code: major.code ?? '',
        description: major.description ?? '',
        is_active: major.is_active,
    });

    // Filter courses based on selected department
    const filteredCourses = useMemo(() => {
        if (!selectedDepartmentId) {
            return courses;
        }
        return courses.filter(
            (course) => course.department.id === selectedDepartmentId,
        );
    }, [courses, selectedDepartmentId]);

    // Update selectedDepartmentId when course changes
    useEffect(() => {
        const selectedCourse = courses.find((c) => c.id === data.course_id);
        if (selectedCourse) {
            setSelectedDepartmentId(selectedCourse.department.id);
        }
    }, [data.course_id, courses]);

    // Reset course_id when department changes (if current course is not in filtered list)
    const handleDepartmentChange = (departmentId: number | '') => {
        setSelectedDepartmentId(departmentId);
        const currentCourseInFiltered = filteredCourses.some(
            (c) => c.id === data.course_id,
        );
        if (!currentCourseInFiltered && departmentId) {
            setData('course_id', 0);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(adminRoutes.majors.update({ major: major.id }).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Major" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HistoryBackButton
                            variant="ghost"
                            size="icon"
                            iconOnly
                            fallbackHref={adminRoutes.departments.index().url}
                            label="Back to academic structure"
                        />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Edit Major
                            </h1>
                            <p className="text-muted-foreground">
                                Update major details for {major.course.name}.
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Major Details
                        </CardTitle>
                        <CardDescription>
                            Update the major information below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="department_id">
                                    Department
                                </Label>
                                <select
                                    id="department_id"
                                    name="department_id"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    value={selectedDepartmentId}
                                    onChange={(e) =>
                                        handleDepartmentChange(
                                            e.target.value
                                                ? Number(e.target.value)
                                                : '',
                                        )
                                    }
                                >
                                    <option value="">All Departments</option>
                                    {departments && departments.length > 0 ? (
                                        departments.map((dept) => (
                                            <option
                                                key={dept.id}
                                                value={dept.id}
                                            >
                                                {dept.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>
                                            No departments available
                                        </option>
                                    )}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="course_id">Course *</Label>
                                <select
                                    id="course_id"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    value={data.course_id ?? 0}
                                    onChange={(e) =>
                                        setData(
                                            'course_id',
                                            Number(e.target.value) || 0,
                                        )
                                    }
                                    required
                                    disabled={filteredCourses.length === 0}
                                >
                                    <option value={0}>
                                        {filteredCourses.length === 0
                                            ? 'No courses available'
                                            : 'Select a course'}
                                    </option>
                                    {filteredCourses.map((course) => (
                                        <option
                                            key={course.id}
                                            value={course.id}
                                        >
                                            {course.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.course_id && (
                                    <p className="text-sm text-red-600">
                                        {errors.course_id}
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="e.g., Software Engineering"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-red-600">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code</Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) =>
                                            setData('code', e.target.value)
                                        }
                                        placeholder="Optional code (e.g., SE)"
                                    />
                                    {errors.code && (
                                        <p className="text-sm text-red-600">
                                            {errors.code}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Optional description for this major."
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={(e) =>
                                        setData('is_active', e.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label
                                    htmlFor="is_active"
                                    className="text-sm font-normal"
                                >
                                    Active
                                </Label>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Updating...'
                                        : 'Update Major'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link
                                        href={
                                            adminRoutes.departments.index().url
                                        }
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
