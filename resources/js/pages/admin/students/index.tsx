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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Users, Eye, MoreVertical, Search, Trash2, KeyRound } from 'lucide-react';
import { formatName } from '@/utils/format-name';
import { useState } from 'react';
import { useToast } from '@/contexts/toast-context';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Students',
        href: adminRoutes.students.index().url,
    },
];

interface Student {
    id: number;
    name: string;
    email: string;
    student_id: string;
    profile: {
        first_name: string;
        last_name: string;
        middle_name: string | null;
        photo_path: string | null;
    } | null;
}

interface StudentsIndexProps {
    students: {
        data: Student[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters?: {
        search?: string;
    };
}

export default function StudentsIndex({ students, filters }: StudentsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [studentToReset, setStudentToReset] = useState<Student | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    const { addToast } = useToast();
    const { delete: deleteStudent, processing: deleting } = useForm({});
    const resetForm = useForm({
        password: '',
        password_confirmation: '',
    });


    const handleSearch = (value: string) => {
        setSearchQuery(value);
        router.get(
            adminRoutes.students.index().url,
            { search: value || undefined, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (studentToDelete) {
            deleteStudent(adminRoutes.students.destroy({ student: studentToDelete.id }).url, {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setStudentToDelete(null);
                },
            });
        }
    };

    const handleResetClick = (student: Student) => {
        setStudentToReset(student);
        setResetError(null);
        setResetSuccess(false);
        setIsResetting(false);
        resetForm.reset();
        setResetDialogOpen(true);
    };

    const handleResetConfirm = () => {
        if (!studentToReset) {
            return;
        }

        const studentName = studentToReset.profile
            ? formatName(
                  studentToReset.profile.first_name,
                  studentToReset.profile.last_name,
                  studentToReset.profile.middle_name,
              )
            : studentToReset.name;

        const currentYear = new Date().getFullYear();
        const defaultPassword = `GA@${currentYear}!`;

        setIsResetting(true);
        setResetError(null);
        setResetSuccess(false);

        // Use router.post directly with the data
        router.post(
            adminRoutes.students.resetPassword({ student: studentToReset.id }).url,
            {
                password: defaultPassword,
                password_confirmation: defaultPassword,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResetSuccess(true);
                    setIsResetting(false);
                    addToast({
                        variant: 'success',
                        title: 'Password Reset',
                        description: `Password updated successfully for ${studentName} (${studentToReset.student_id}). New password: ${defaultPassword}`,
                        duration: 10000, // Show longer so admin can copy it
                    });
                    
                    // Close dialog after a short delay to show success message
                    setTimeout(() => {
                        setResetDialogOpen(false);
                        setStudentToReset(null);
                        setResetSuccess(false);
                        resetForm.reset();
                    }, 1500);
                },
                onError: (errors: Record<string, string>) => {
                    setIsResetting(false);
                    const firstError =
                        errors.password ??
                        errors.password_confirmation ??
                        Object.values(errors)[0];
                    const errorMessage =
                        typeof firstError === 'string'
                            ? firstError
                            : 'Failed to reset password. Please try again.';

                    setResetError(errorMessage);
                    addToast({
                        variant: 'error',
                        title: 'Password Reset Failed',
                        description: errorMessage,
                        duration: 7000,
                    });
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Students" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
                        <p className="text-muted-foreground">
                            View student profiles and applications
                        </p>
                    </div>
                </div>

                {/* Students Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>All Students</CardTitle>
                                <CardDescription>
                                    {students.total} student{students.total !== 1 ? 's' : ''} total
                                </CardDescription>
                            </div>
                            <div className="w-full max-w-sm">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Search by name, email, or student ID..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {students.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Photo
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Name
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Student ID
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.data.map((student) => (
                                                <tr
                                                    key={student.id}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        {student.profile?.photo_path ? (
                                                            <img
                                                                src={`/storage/${student.profile.photo_path}`}
                                                                alt={
                                                                    student.profile
                                                                        ? formatName(
                                                                              student.profile.first_name,
                                                                              student.profile.last_name,
                                                                              student.profile.middle_name,
                                                                          )
                                                                        : student.name
                                                                }
                                                                className="h-10 w-10 rounded-full object-cover border border-border"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border border-border">
                                                                <Users className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium">
                                                            {student.profile
                                                                ? formatName(
                                                                      student.profile.first_name,
                                                                      student.profile.last_name,
                                                                      student.profile.middle_name,
                                                                  )
                                                                : student.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-muted-foreground">
                                                            {student.email}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">{student.student_id}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
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
                                                                        href={adminRoutes.students.show({
                                                                            student: student.id,
                                                                        }).url}
                                                                        className="flex items-center"
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Profile
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleResetClick(student)}
                                                                    className="focus:text-primary"
                                                                >
                                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                                    Reset password
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDeleteClick(student)}
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {students.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                        <div>
                                            Showing{' '}
                                            {students.per_page * (students.current_page - 1) + 1}
                                            {' – '}
                                            {Math.min(
                                                students.per_page * students.current_page,
                                                students.total,
                                            )}{' '}
                                            of {students.total}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={students.current_page === 1}
                                                onClick={() =>
                                                    router.get(
                                                        adminRoutes.students.index().url,
                                                        {
                                                            page: students.current_page - 1,
                                                            search: searchQuery || undefined,
                                                        },
                                                        { preserveScroll: true, preserveState: true },
                                                    )
                                                }
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={students.current_page === students.last_page}
                                                onClick={() =>
                                                    router.get(
                                                        adminRoutes.students.index().url,
                                                        {
                                                            page: students.current_page + 1,
                                                            search: searchQuery || undefined,
                                                        },
                                                        { preserveScroll: true, preserveState: true },
                                                    )
                                                }
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No students found</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    No students have registered yet.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Student</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete{' '}
                                {studentToDelete?.profile
                                    ? formatName(
                                          studentToDelete.profile.first_name,
                                          studentToDelete.profile.last_name,
                                          studentToDelete.profile.middle_name,
                                      )
                                    : studentToDelete?.name}
                                ? This action cannot be undone and will permanently delete the student
                                account, profile, and all associated applications.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setStudentToDelete(null);
                                }}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reset Password Dialog */}
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                Reset the password for{' '}
                                {studentToReset?.profile
                                    ? formatName(
                                          studentToReset.profile.first_name,
                                          studentToReset.profile.last_name,
                                          studentToReset.profile.middle_name,
                                      )
                                    : studentToReset?.name}
                                . The password will be set to the default format.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="rounded-md bg-muted p-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        New password will be set to:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-semibold">
                                            GA@{new Date().getFullYear()}!
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        The student will use this password on their next login.
                                    </p>
                                </div>
                            </div>
                            {resetSuccess && (
                                <Alert variant="success">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>
                                        Password has been reset successfully! The dialog will close shortly.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {resetError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{resetError}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setResetDialogOpen(false);
                                    setStudentToReset(null);
                                    setResetError(null);
                                    setResetSuccess(false);
                                    resetForm.reset();
                                }}
                                disabled={isResetting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResetConfirm}
                                disabled={isResetting || resetSuccess}
                            >
                                {isResetting ? 'Resetting...' : resetSuccess ? 'Success!' : 'Confirm Reset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
