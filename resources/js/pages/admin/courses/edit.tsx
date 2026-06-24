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
import { BookOpen } from 'lucide-react';

interface DepartmentOption {
    id: number;
    name: string;
}

interface Course {
    id: number;
    department_id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
}

interface EditCourseProps {
    course: Course;
    departments: DepartmentOption[];
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
        title: 'Edit Course',
        href: '#',
    },
];

export default function EditCourse({ course, departments }: EditCourseProps) {
    const { data, setData, put, processing, errors } = useForm({
        department_id: course.department_id,
        name: course.name,
        code: course.code,
        description: course.description ?? '',
        is_active: course.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(adminRoutes.courses.update({ course: course.id }).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Course" />
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
                                Edit Course
                            </h1>
                            <p className="text-muted-foreground">
                                Update course details and department placement.
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5" />
                            Course Details
                        </CardTitle>
                        <CardDescription>
                            Courses belong to departments and may have
                            associated majors.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="department_id">
                                        Department *
                                    </Label>
                                    <select
                                        id="department_id"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        value={data.department_id}
                                        onChange={(e) =>
                                            setData(
                                                'department_id',
                                                Number(e.target.value) || 0,
                                            )
                                        }
                                        required
                                    >
                                        {departments.map((dept) => (
                                            <option
                                                key={dept.id}
                                                value={dept.id}
                                            >
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.department_id && (
                                        <p className="text-sm text-red-600">
                                            {errors.department_id}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code *</Label>
                                    <Input
                                        id="code"
                                        value={data.code}
                                        onChange={(e) =>
                                            setData('code', e.target.value)
                                        }
                                        placeholder="e.g., BSIT"
                                        required
                                    />
                                    {errors.code && (
                                        <p className="text-sm text-red-600">
                                            {errors.code}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="e.g., Bachelor of Science in Information Technology"
                                    required
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Optional description for this course."
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
                                        : 'Update Course'}
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
