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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { GraduationCap, Plus, Edit, Search } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [];

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
    created_at: string;
    updated_at: string;
}

interface MajorsIndexProps {
    majors: {
        data: Major[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    courses: Array<{
        id: number;
        name: string;
        department: {
            id: number;
            name: string;
        };
    }>;
    filters: {
        course_id?: string;
    };
}

export default function MajorsIndex({ majors, courses, filters }: MajorsIndexProps) {
    const [courseId, setCourseId] = useState(filters.course_id || 'all');

    const handleFilter = () => {
        router.get(adminRoutes.majors.index().url, {
            course_id: courseId !== 'all' ? courseId : undefined,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Majors" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div />
                </div>

                {/* Filter */}
                <Card>
                    <CardHeader>
                        <CardTitle>Filter by Course</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Select value={courseId} onValueChange={setCourseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All courses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All courses</SelectItem>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id.toString()}>
                                                {course.name} ({course.department.name})
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

                {/* Majors List */}
                <div className="grid gap-4 md:grid-cols-2">
                    {majors.data.map((major) => (
                        <Card key={major.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <GraduationCap className="h-5 w-5" />
                                            {major.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {major.course.name} • {major.course.department.name}
                                        </CardDescription>
                                    </div>
                                    {!major.is_active && (
                                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {major.description && (
                                    <p className="mb-4 text-sm text-muted-foreground">
                                        {major.description}
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={adminRoutes.majors.edit({ major: major.id }).url}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {majors.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No majors found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Get started by creating your first major.
                            </p>
                            <Button asChild className="mt-4">
                                <Link href={adminRoutes.majors.create().url}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Major
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

