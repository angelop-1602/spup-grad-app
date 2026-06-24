import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    BookOpen,
    ChevronDown,
    ChevronRight,
    Edit,
    GraduationCap,
    Plus,
    School,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Academic Structure',
        href: adminRoutes.departments.index().url,
    },
];

interface Major {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    is_active: boolean;
}

interface Course {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    majors: Major[];
}

interface Department {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    courses_count: number;
    courses: Course[];
}

interface DepartmentsIndexProps {
    departments: Department[];
}

interface DeleteTarget {
    name: string;
    type: 'department' | 'course' | 'major';
    url: string;
    message: string;
}

export default function DepartmentsIndex({
    departments,
}: DepartmentsIndexProps) {
    const [openDepartments, setOpenDepartments] = useState<
        Record<number, boolean>
    >({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const { delete: destroyAcademicItem, processing: deleting } = useForm({});

    const toggleDepartment = (departmentId: number) => {
        setOpenDepartments((prev) => ({
            ...prev,
            [departmentId]: !prev[departmentId],
        }));
    };

    const handleDeleteClick = (
        event: React.MouseEvent<HTMLButtonElement>,
        target: DeleteTarget,
    ) => {
        event.stopPropagation();
        setDeleteTarget(target);
        setDeleteDialogOpen(true);
    };

    const closeDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleDeleteConfirm = () => {
        if (!deleteTarget) {
            return;
        }

        destroyAcademicItem(deleteTarget.url, {
            preserveScroll: true,
            onSuccess: closeDeleteDialog,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Academic Structure" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Academic Structure
                        </h1>
                        <p className="text-muted-foreground">
                            Manage departments, courses, and majors
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={adminRoutes.courses.create().url}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Course
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href={adminRoutes.majors.create().url}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Major
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={adminRoutes.departments.create().url}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Department
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {departments.map((department) => (
                        <Card key={department.id}>
                            <Collapsible
                                open={openDepartments[department.id] || false}
                                onOpenChange={() =>
                                    toggleDepartment(department.id)
                                }
                            >
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {openDepartments[
                                                    department.id
                                                ] ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <School className="h-5 w-5" />
                                                <div>
                                                    <CardTitle className="flex items-center gap-2">
                                                        {department.name}
                                                        {!department.is_active && (
                                                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        Code: {department.code}{' '}
                                                        •{' '}
                                                        {
                                                            department.courses_count
                                                        }{' '}
                                                        {department.courses_count ===
                                                        1
                                                            ? 'course'
                                                            : 'courses'}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Link
                                                        href={
                                                            adminRoutes.courses.create()
                                                                .url +
                                                            `?department_id=${department.id}`
                                                        }
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Add course to{' '}
                                                            {department.name}
                                                        </span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Link
                                                        href={
                                                            adminRoutes.departments.edit(
                                                                {
                                                                    department:
                                                                        department.id,
                                                                },
                                                            ).url
                                                        }
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Edit{' '}
                                                            {department.name}
                                                        </span>
                                                    </Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(event) =>
                                                        handleDeleteClick(
                                                            event,
                                                            {
                                                                name: department.name,
                                                                type: 'department',
                                                                url: adminRoutes.departments.destroy(
                                                                    {
                                                                        department:
                                                                            department.id,
                                                                    },
                                                                ).url,
                                                                message:
                                                                    'Deleting a department will also delete its courses and majors.',
                                                            },
                                                        )
                                                    }
                                                    aria-label={`Delete ${department.name}`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <CardContent className="pt-0">
                                        <div className="space-y-3 pl-8">
                                            {department.courses.length === 0 ? (
                                                <div className="py-4 text-center">
                                                    <p className="mb-2 text-sm text-muted-foreground">
                                                        No courses in this
                                                        department
                                                    </p>
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <Link
                                                            href={
                                                                adminRoutes.courses.create()
                                                                    .url +
                                                                `?department_id=${department.id}`
                                                            }
                                                        >
                                                            <Plus className="mr-2 h-3.5 w-3.5" />
                                                            Add Course
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : (
                                                department.courses.map(
                                                    (course) => (
                                                        <div
                                                            key={course.id}
                                                            className="space-y-2"
                                                        >
                                                            <div className="flex items-center justify-between rounded-lg border p-3">
                                                                <div className="flex items-center gap-3">
                                                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                                    <div>
                                                                        <p className="font-medium">
                                                                            {
                                                                                course.name
                                                                            }
                                                                            {!course.is_active && (
                                                                                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                                                    Inactive
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Code:{' '}
                                                                            {
                                                                                course.code
                                                                            }{' '}
                                                                            •{' '}
                                                                            {
                                                                                course
                                                                                    .majors
                                                                                    .length
                                                                            }{' '}
                                                                            {course
                                                                                .majors
                                                                                .length ===
                                                                            1
                                                                                ? 'major'
                                                                                : 'majors'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Button
                                                                        asChild
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        <Link
                                                                            href={
                                                                                adminRoutes.majors.create()
                                                                                    .url +
                                                                                `?course_id=${course.id}`
                                                                            }
                                                                        >
                                                                            <Plus className="h-4 w-4" />
                                                                            <span className="sr-only">
                                                                                Add
                                                                                major
                                                                                to{' '}
                                                                                {
                                                                                    course.name
                                                                                }
                                                                            </span>
                                                                        </Link>
                                                                    </Button>
                                                                    <Button
                                                                        asChild
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        <Link
                                                                            href={
                                                                                adminRoutes.courses.edit(
                                                                                    {
                                                                                        course: course.id,
                                                                                    },
                                                                                )
                                                                                    .url
                                                                            }
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                            <span className="sr-only">
                                                                                Edit{' '}
                                                                                {
                                                                                    course.name
                                                                                }
                                                                            </span>
                                                                        </Link>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(
                                                                            event,
                                                                        ) =>
                                                                            handleDeleteClick(
                                                                                event,
                                                                                {
                                                                                    name: course.name,
                                                                                    type: 'course',
                                                                                    url: adminRoutes.courses.destroy(
                                                                                        {
                                                                                            course: course.id,
                                                                                        },
                                                                                    )
                                                                                        .url,
                                                                                    message:
                                                                                        'Deleting a course will also delete its majors.',
                                                                                },
                                                                            )
                                                                        }
                                                                        aria-label={`Delete ${course.name}`}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1 pl-8">
                                                                {course.majors
                                                                    .length >
                                                                0 ? (
                                                                    course.majors.map(
                                                                        (
                                                                            major,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    major.id
                                                                                }
                                                                                className="flex items-center justify-between rounded-md border bg-muted/30 p-2"
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                                                                    <span className="text-sm">
                                                                                        {
                                                                                            major.name
                                                                                        }
                                                                                        {!major.is_active && (
                                                                                            <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                                                                                Inactive
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <Button
                                                                                        asChild
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={(
                                                                                            e,
                                                                                        ) =>
                                                                                            e.stopPropagation()
                                                                                        }
                                                                                    >
                                                                                        <Link
                                                                                            href={
                                                                                                adminRoutes.majors.edit(
                                                                                                    {
                                                                                                        major: major.id,
                                                                                                    },
                                                                                                )
                                                                                                    .url
                                                                                            }
                                                                                        >
                                                                                            <Edit className="h-3.5 w-3.5" />
                                                                                            <span className="sr-only">
                                                                                                Edit{' '}
                                                                                                {
                                                                                                    major.name
                                                                                                }
                                                                                            </span>
                                                                                        </Link>
                                                                                    </Button>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={(
                                                                                            event,
                                                                                        ) =>
                                                                                            handleDeleteClick(
                                                                                                event,
                                                                                                {
                                                                                                    name: major.name,
                                                                                                    type: 'major',
                                                                                                    url: adminRoutes.majors.destroy(
                                                                                                        {
                                                                                                            major: major.id,
                                                                                                        },
                                                                                                    )
                                                                                                        .url,
                                                                                                    message:
                                                                                                        'Deleting a major removes it from this course.',
                                                                                                },
                                                                                            )
                                                                                        }
                                                                                        aria-label={`Delete ${major.name}`}
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )
                                                                ) : (
                                                                    <div className="py-2">
                                                                        <Button
                                                                            asChild
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={(
                                                                                e,
                                                                            ) =>
                                                                                e.stopPropagation()
                                                                            }
                                                                        >
                                                                            <Link
                                                                                href={
                                                                                    adminRoutes.majors.create()
                                                                                        .url +
                                                                                    `?course_id=${course.id}`
                                                                                }
                                                                            >
                                                                                <Plus className="mr-2 h-3.5 w-3.5" />
                                                                                Add
                                                                                Major
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ),
                                                )
                                            )}
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Collapsible>
                        </Card>
                    ))}
                </div>

                {departments.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <School className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">
                                No departments found
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Get started by creating your first department.
                            </p>
                            <Button asChild className="mt-4">
                                <Link
                                    href={adminRoutes.departments.create().url}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Department
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete{' '}
                                {deleteTarget
                                    ? deleteTarget.type
                                    : 'academic item'}
                            </DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete{' '}
                                {deleteTarget?.name ?? 'this item'}?{' '}
                                {deleteTarget?.message} This action cannot be
                                undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDeleteDialog}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
