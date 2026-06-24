import {
    CoordinatorAcademicAssignment,
    type CoordinatorAssignmentDepartment,
} from '@/components/coordinator-academic-assignment';
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
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';

interface CreateCoordinatorProps {
    departments: CoordinatorAssignmentDepartment[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Coordinators',
        href: adminRoutes.coordinators.index().url,
    },
    {
        title: 'Create',
        href: '#',
    },
];

export default function CreateCoordinator({
    departments,
}: CreateCoordinatorProps) {
    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        department_ids: number[];
        course_ids: number[];
    }>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        department_ids: [],
        course_ids: [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(adminRoutes.coordinators.store().url);
    };

    const updateAcademicAssignments = (
        departmentIds: number[],
        courseIds: number[],
    ) => {
        setData('department_ids', departmentIds);
        setData('course_ids', courseIds);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Coordinator" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <HistoryBackButton
                        variant="ghost"
                        size="icon"
                        iconOnly
                        fallbackHref={adminRoutes.coordinators.index().url}
                        label="Back to coordinators"
                    />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Create Coordinator
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Create a coordinator account and assign one or more
                            departments.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Coordinator Details</CardTitle>
                        <CardDescription>
                            Basic information and department assignments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-destructive">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm Password
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) =>
                                            setData(
                                                'password_confirmation',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <CoordinatorAcademicAssignment
                                departments={departments}
                                departmentIds={data.department_ids}
                                courseIds={data.course_ids}
                                errors={errors}
                                onChange={updateAcademicAssignments}
                            />

                            <div className="flex items-center justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    asChild
                                    disabled={processing}
                                >
                                    <Link
                                        href={
                                            adminRoutes.coordinators.index().url
                                        }
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Creating...'
                                        : 'Create Coordinator'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
