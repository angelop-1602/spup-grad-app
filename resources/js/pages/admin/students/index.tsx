import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import { profilePhotoUrl } from '@/lib/profile-photo';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { formatName } from '@/utils/format-name';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Eye,
    KeyRound,
    MoreVertical,
    Pencil,
    Search,
    ShieldCheck,
    Trash2,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';

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
        photo_url?: string | null;
    } | null;
}

interface ManualVerificationDraft {
    id: number;
    applicant_name: string;
    email: string;
    student_id: string;
    tracking_code: string;
    tracking_pin: string;
    window_title: string;
    created_at: string | null;
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
    manualVerificationDrafts: ManualVerificationDraft[];
}

export default function StudentsIndex({
    students,
    filters,
    manualVerificationDrafts,
}: StudentsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(
        null,
    );
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [studentToReset, setStudentToReset] = useState<Student | null>(null);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [verifyingDraftId, setVerifyingDraftId] = useState<number | null>(
        null,
    );

    const { addToast } = useToast();
    const { delete: deleteStudent, processing: deleting } = useForm({});
    const resetForm = useForm({
        password: '',
        password_confirmation: '',
    });

    const studentName = (student: Student) =>
        student.profile
            ? formatName(
                  student.profile.first_name,
                  student.profile.last_name,
                  student.profile.middle_name,
              )
            : student.name;

    const updateFilters = (search: string, page = 1) => {
        router.get(
            adminRoutes.students.index().url,
            {
                search: search || undefined,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        updateFilters(value);
    };

    const handleDeleteClick = (student: Student) => {
        setStudentToDelete(student);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (studentToDelete) {
            deleteStudent(
                adminRoutes.students.destroy({ student: studentToDelete.id })
                    .url,
                {
                    onSuccess: () => {
                        setDeleteDialogOpen(false);
                        setStudentToDelete(null);
                    },
                },
            );
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

        const currentYear = new Date().getFullYear();
        const defaultPassword = `GA@${currentYear}!`;

        setIsResetting(true);
        setResetError(null);
        setResetSuccess(false);

        router.post(
            adminRoutes.students.resetPassword({ student: studentToReset.id })
                .url,
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
                        description: `Password updated successfully for ${studentName(studentToReset)} (${studentToReset.student_id}). New password: ${defaultPassword}`,
                        duration: 10000,
                    });

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

    const handleVerifyDraft = (draft: ManualVerificationDraft) => {
        setVerifyingDraftId(draft.id);
        router.post(
            `/admin/students/guest-drafts/${draft.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setVerifyingDraftId(null),
                onSuccess: () =>
                    addToast({
                        variant: 'success',
                        title: 'Draft Verified',
                        description: `${draft.applicant_name} was manually verified.`,
                        duration: 5000,
                    }),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Students" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Students
                        </h1>
                        <p className="text-muted-foreground">
                            Manage student accounts and applications
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/students/create">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create Student
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle>
                                    Guest Drafts Pending Manual Verification
                                </CardTitle>
                                <CardDescription>
                                    Guest applications that have not completed
                                    email verification
                                </CardDescription>
                            </div>
                            <Badge
                                variant={
                                    manualVerificationDrafts.length
                                        ? 'outline'
                                        : 'secondary'
                                }
                            >
                                {manualVerificationDrafts.length} pending
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {manualVerificationDrafts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Applicant
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Tracking
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Window
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {manualVerificationDrafts.map(
                                            (draft) => (
                                                <tr
                                                    key={draft.id}
                                                    className="border-b"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium">
                                                                {
                                                                    draft.applicant_name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    draft.student_id
                                                                }
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {draft.email}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono text-xs">
                                                            <p>
                                                                {
                                                                    draft.tracking_code
                                                                }
                                                            </p>
                                                            <p className="text-muted-foreground">
                                                                {
                                                                    draft.tracking_pin
                                                                }
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {draft.window_title}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                handleVerifyDraft(
                                                                    draft,
                                                                )
                                                            }
                                                            disabled={
                                                                verifyingDraftId ===
                                                                draft.id
                                                            }
                                                        >
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            {verifyingDraftId ===
                                                            draft.id
                                                                ? 'Verifying...'
                                                                : 'Verify'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No guest drafts are waiting for manual
                                verification.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>All Students</CardTitle>
                                <CardDescription>
                                    {students.total} student
                                    {students.total !== 1 ? 's' : ''} shown
                                </CardDescription>
                            </div>
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="w-full md:w-80">
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search by name, email, or student ID..."
                                            value={searchQuery}
                                            onChange={(e) =>
                                                handleSearch(e.target.value)
                                            }
                                            className="pl-9"
                                        />
                                    </div>
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
                                                        {profilePhotoUrl(
                                                            student.profile,
                                                        ) ? (
                                                            <img
                                                                src={
                                                                    profilePhotoUrl(
                                                                        student.profile,
                                                                    ) ?? ''
                                                                }
                                                                alt={studentName(
                                                                    student,
                                                                )}
                                                                className="h-10 w-10 rounded-full border border-border object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted">
                                                                <Users className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium">
                                                            {studentName(
                                                                student,
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-muted-foreground">
                                                            {student.email}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">
                                                            {student.student_id}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Open
                                                                        menu
                                                                    </span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={
                                                                            adminRoutes.students.show(
                                                                                {
                                                                                    student:
                                                                                        student.id,
                                                                                },
                                                                            )
                                                                                .url
                                                                        }
                                                                        className="flex items-center"
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View
                                                                        Profile
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={`/admin/students/${student.id}/edit`}
                                                                        className="flex items-center"
                                                                    >
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleResetClick(
                                                                            student,
                                                                        )
                                                                    }
                                                                    className="focus:text-primary"
                                                                >
                                                                    <KeyRound className="mr-2 h-4 w-4" />
                                                                    Reset
                                                                    Password
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleDeleteClick(
                                                                            student,
                                                                        )
                                                                    }
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
                                            {students.per_page *
                                                (students.current_page - 1) +
                                                1}{' '}
                                            -{' '}
                                            {Math.min(
                                                students.per_page *
                                                    students.current_page,
                                                students.total,
                                            )}{' '}
                                            of {students.total}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    students.current_page === 1
                                                }
                                                onClick={() =>
                                                    updateFilters(
                                                        searchQuery,
                                                        students.current_page -
                                                            1,
                                                    )
                                                }
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    students.current_page ===
                                                    students.last_page
                                                }
                                                onClick={() =>
                                                    updateFilters(
                                                        searchQuery,
                                                        students.current_page +
                                                            1,
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
                                <h3 className="mt-4 text-lg font-semibold">
                                    No students found
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    No students match the current filters.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Dialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Student</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete{' '}
                                {studentToDelete
                                    ? studentName(studentToDelete)
                                    : 'this student'}
                                ? This action cannot be undone and will
                                permanently delete the student account, profile,
                                and all associated applications.
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

                <Dialog
                    open={resetDialogOpen}
                    onOpenChange={setResetDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                                Reset the password for{' '}
                                {studentToReset
                                    ? studentName(studentToReset)
                                    : 'this student'}
                                . The password will be set to the default
                                format.
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
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        The student will use this password on
                                        their next login.
                                    </p>
                                </div>
                            </div>
                            {resetSuccess && (
                                <Alert variant="success">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>
                                        Password has been reset successfully.
                                        The dialog will close shortly.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {resetError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {resetError}
                                    </AlertDescription>
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
                                {isResetting
                                    ? 'Resetting...'
                                    : resetSuccess
                                      ? 'Success!'
                                      : 'Confirm Reset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
