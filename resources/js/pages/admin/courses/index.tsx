import adminRoutes from '@/routes/admin';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Plus, Edit, Search, MoreVertical, Eye } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [];

interface Course {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    department: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

interface CoursesIndexProps {
    courses: {
        data: Course[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    departments: Array<{ id: number; name: string }>;
    filters: {
        department_id?: string;
    };
}

export default function CoursesIndex({ courses, departments, filters }: CoursesIndexProps) {
    const [departmentId, setDepartmentId] = useState(filters.department_id || 'all');

    const handleFilter = () => {
        router.get(adminRoutes.courses.index().url, {
            department_id: departmentId !== 'all' ? departmentId : undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div />
                </div>

                {/* Filter */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filter by Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Select value={departmentId} onValueChange={setDepartmentId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All departments" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All departments</SelectItem>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id.toString()}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleFilter}>
                                <Search className="mr-2 h-4 w-4" />
                                Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Courses List */}
                <div className="grid gap-4 md:grid-cols-2">
                    {courses.data.map((course) => (
                        <Card key={course.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <BookOpen className="h-5 w-5" />
                                            {course.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            Code: {course.code} • {course.department.name}
                                        </CardDescription>
                                    </div>
                                    {!course.is_active && (
                                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {course.description && (
                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {course.description}
                                    </p>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={adminRoutes.courses.show({ course: course.id }).url}
                                                className="flex items-center"
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={adminRoutes.courses.edit({ course: course.id }).url}
                                                className="flex items-center"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {courses.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Get started by creating your first course.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={adminRoutes.courses.create().url}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Course
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

