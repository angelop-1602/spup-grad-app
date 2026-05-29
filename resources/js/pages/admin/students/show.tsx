import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly } from '@/lib/date-only';
import { profilePhotoUrl } from '@/lib/profile-photo';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { formatName } from '@/utils/format-name';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    KeyRound,
    Pencil,
    Trash2,
    Users,
} from 'lucide-react';
import { useState } from 'react';

interface StudentProfile {
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string | null;
    date_of_birth: string | null;
    place_of_birth: string | null;
    sex: string | null;
    civil_status: string | null;
    religion: string | null;
    nationality: string | null;
    permanent_address: string | null;
    contact_number: string | null;
    photo_path: string | null;
    photo_url?: string | null;
    highest_education_level: string | null;
    // Grade School
    grade_school_name: string | null;
    grade_school_year_graduated: number | null;
    grade_1_school?: string | null;
    grade_1_year?: number | null;
    grade_2_school?: string | null;
    grade_2_year?: number | null;
    grade_3_school?: string | null;
    grade_3_year?: number | null;
    grade_4_school?: string | null;
    grade_4_year?: number | null;
    grade_5_school?: string | null;
    grade_5_year?: number | null;
    grade_6_school?: string | null;
    grade_6_year?: number | null;
    // Junior High School
    junior_high_school_name: string | null;
    junior_high_school_year_graduated: number | null;
    jhs_1_school?: string | null;
    jhs_1_year?: number | null;
    jhs_2_school?: string | null;
    jhs_2_year?: number | null;
    jhs_3_school?: string | null;
    jhs_3_year?: number | null;
    jhs_4_school?: string | null;
    jhs_4_year?: number | null;
    // Senior High School
    senior_high_school_name: string | null;
    senior_high_school_year_graduated: number | null;
    shs_11_school?: string | null;
    shs_11_year?: number | null;
    shs_12_school?: string | null;
    shs_12_year?: number | null;
    // College
    college_degree: string | null;
    college_school_name: string | null;
    college_year_graduated: number | null;
    college_transferee_note: string | null;
    is_transferee: boolean | null;
    // Graduate School
    graduate_school_degree: string | null;
    graduate_school_school_name: string | null;
    graduate_school_year_graduated: number | null;
    grad_masteral_school?: string | null;
    grad_masteral_year?: number | null;
    grad_doctoral_school?: string | null;
    grad_doctoral_year?: number | null;
}

interface ApplicationWindow {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
}

interface Department {
    id: number;
    name: string;
}

interface Course {
    id: number;
    name: string;
}

interface Application {
    id: number;
    application_number: string;
    window: ApplicationWindow;
    department: Department;
    course: Course;
    status: 'submitted' | 'pending' | 'approved' | 'incomplete';
    created_at: string;
}

interface Student {
    id: number;
    name: string;
    email: string;
    student_id: string | null;
    profile: StudentProfile | null;
    applications: Application[];
}

interface ShowStudentProps {
    student: Student;
}

const breadcrumbs = (student: Student): BreadcrumbItem[] => [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Students',
        href: adminRoutes.students.index().url,
    },
    {
        title: student.profile
            ? formatName(
                  student.profile.first_name,
                  student.profile.last_name,
                  student.profile.middle_name,
              )
            : student.name,
        href: adminRoutes.students.show({ student: student.id }).url,
    },
];

export default function AdminStudentShow({ student }: ShowStudentProps) {
    const displayName = student.profile
        ? formatName(
              student.profile.first_name,
              student.profile.last_name,
              student.profile.middle_name,
          )
        : student.name;

    const statusLabel: Record<Application['status'], string> = {
        submitted: 'Submitted',
        pending: 'Pending',
        approved: 'Approved',
        incomplete: 'Incomplete',
    };

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [resetSuccess, setResetSuccess] = useState(false);

    const { addToast } = useToast();
    const { delete: deleteStudent, processing: deleting } = useForm({});
    const resetForm = useForm({
        password: '',
        password_confirmation: '',
    });

    const handleDeleteConfirm = (): void => {
        deleteStudent(`/admin/students/${student.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeleteDialogOpen(false);
            },
        });
    };

    const handleResetConfirm = (): void => {
        const currentYear = new Date().getFullYear();
        const defaultPassword = `GA@${currentYear}!`;

        setIsResetting(true);
        setResetError(null);
        setResetSuccess(false);

        router.post(
            adminRoutes.students.resetPassword({ student: student.id }).url,
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
                        description: `Password updated successfully for ${displayName} (${student.student_id}). New password: ${defaultPassword}`,
                        duration: 10000,
                    });

                    setTimeout(() => {
                        setResetDialogOpen(false);
                        setResetSuccess(false);
                        resetForm.reset();
                    }, 1500);
                },
                onError: (errors: Record<string, string>): void => {
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
        <AppLayout breadcrumbs={breadcrumbs(student)}>
            <Head title={`Student: ${displayName}`} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 md:gap-6 md:p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                        >
                            <Link
                                href={adminRoutes.students.index().url}
                                aria-label="Back to students"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
                                {displayName}
                            </h1>
                            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                                Student account overview
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/students/${student.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialogOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.2fr,1.8fr] lg:grid-cols-[1.1fr,1.9fr]">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center gap-3">
                                {profilePhotoUrl(student.profile) ? (
                                    <img
                                        src={
                                            profilePhotoUrl(student.profile) ??
                                            ''
                                        }
                                        alt={displayName}
                                        className="h-14 w-14 rounded-full border border-border object-cover"
                                    />
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
                                        <Users className="h-7 w-7 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle className="text-base md:text-lg">
                                        Account Information
                                    </CardTitle>
                                    <CardDescription className="text-xs md:text-sm">
                                        Basic login and identification details
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Student ID
                                    </span>
                                    <span className="font-mono">
                                        {student.student_id || 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Email
                                    </span>
                                    <span className="truncate">
                                        {student.email}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">
                                        Password
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setResetDialogOpen(true)}
                                    >
                                        <KeyRound className="mr-1 h-3 w-3" />
                                        Reset Password
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base md:text-lg">
                                    Profile Information
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm">
                                    Read-only profile details. Only the student
                                    can update their profile.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                {student.profile ? (
                                    <>
                                        {profilePhotoUrl(student.profile) && (
                                            <div className="flex justify-center pb-4">
                                                <img
                                                    src={
                                                        profilePhotoUrl(
                                                            student.profile,
                                                        ) ?? ''
                                                    }
                                                    alt={displayName}
                                                    className="h-32 w-32 rounded-lg border-2 border-border object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <span className="mb-1 block text-xs text-muted-foreground">
                                                    Full name
                                                </span>
                                                <span className="font-medium">
                                                    {displayName}
                                                </span>
                                            </div>
                                            {student.profile.date_of_birth && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Date of Birth
                                                    </span>
                                                    <span>
                                                        {formatDateOnly(
                                                            student.profile
                                                                .date_of_birth,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.place_of_birth && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Place of Birth
                                                    </span>
                                                    <span>
                                                        {
                                                            student.profile
                                                                .place_of_birth
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.sex && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Sex
                                                    </span>
                                                    <span>
                                                        {student.profile.sex}
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.civil_status && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Civil Status
                                                    </span>
                                                    <span>
                                                        {
                                                            student.profile
                                                                .civil_status
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.religion && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Religion
                                                    </span>
                                                    <span>
                                                        {
                                                            student.profile
                                                                .religion
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.nationality && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Nationality
                                                    </span>
                                                    <span>
                                                        {
                                                            student.profile
                                                                .nationality
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            {student.profile.contact_number && (
                                                <div>
                                                    <span className="mb-1 block text-xs text-muted-foreground">
                                                        Contact number
                                                    </span>
                                                    <span>
                                                        {
                                                            student.profile
                                                                .contact_number
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {student.profile.permanent_address && (
                                            <div>
                                                <span className="mb-1 block text-xs text-muted-foreground">
                                                    Permanent address
                                                </span>
                                                <span className="block">
                                                    {
                                                        student.profile
                                                            .permanent_address
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground md:text-sm">
                                        This student has not completed their
                                        profile yet. Only the student can create
                                        and update their profile information.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {student.profile && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base md:text-lg">
                                        Educational Background
                                    </CardTitle>
                                    <CardDescription className="text-xs md:text-sm">
                                        Academic history and qualifications
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    {/* Grade School */}
                                    {(student.profile.grade_school_name ||
                                        student.profile.grade_1_school) && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                Grade School
                                            </p>
                                            {student.profile
                                                .grade_school_name ? (
                                                <p className="text-sm">
                                                    {
                                                        student.profile
                                                            .grade_school_name
                                                    }
                                                    {student.profile
                                                        .grade_school_year_graduated &&
                                                        ` (${student.profile.grade_school_year_graduated})`}
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {[1, 2, 3, 4, 5, 6].map(
                                                        (grade) => {
                                                            const school =
                                                                student
                                                                    .profile?.[
                                                                    `grade_${grade}_school` as keyof StudentProfile
                                                                ] as
                                                                    | string
                                                                    | null;
                                                            const year = student
                                                                .profile?.[
                                                                `grade_${grade}_year` as keyof StudentProfile
                                                            ] as number | null;
                                                            if (!school)
                                                                return null;
                                                            return (
                                                                <p
                                                                    key={grade}
                                                                    className="text-xs"
                                                                >
                                                                    Grade{' '}
                                                                    {grade}:{' '}
                                                                    {school}
                                                                    {year &&
                                                                        ` (${year})`}
                                                                </p>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Junior High School */}
                                    {(student.profile.junior_high_school_name ||
                                        student.profile.jhs_1_school) && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                Junior High School
                                            </p>
                                            {student.profile
                                                .junior_high_school_name ? (
                                                <p className="text-sm">
                                                    {
                                                        student.profile
                                                            .junior_high_school_name
                                                    }
                                                    {student.profile
                                                        .junior_high_school_year_graduated &&
                                                        ` (${student.profile.junior_high_school_year_graduated})`}
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {[1, 2, 3, 4].map(
                                                        (year) => {
                                                            const school =
                                                                student
                                                                    .profile?.[
                                                                    `jhs_${year}_school` as keyof StudentProfile
                                                                ] as
                                                                    | string
                                                                    | null;
                                                            const gradYear =
                                                                student
                                                                    .profile?.[
                                                                    `jhs_${year}_year` as keyof StudentProfile
                                                                ] as
                                                                    | number
                                                                    | null;
                                                            if (!school)
                                                                return null;
                                                            return (
                                                                <p
                                                                    key={year}
                                                                    className="text-xs"
                                                                >
                                                                    {year}
                                                                    {year === 1
                                                                        ? 'st'
                                                                        : year ===
                                                                            2
                                                                          ? 'nd'
                                                                          : year ===
                                                                              3
                                                                            ? 'rd'
                                                                            : 'th'}{' '}
                                                                    Year:{' '}
                                                                    {school}
                                                                    {gradYear &&
                                                                        ` (${gradYear})`}
                                                                </p>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Senior High School */}
                                    {(student.profile.senior_high_school_name ||
                                        student.profile.shs_11_school) && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                Senior High School
                                            </p>
                                            {student.profile
                                                .senior_high_school_name ? (
                                                <p className="text-sm">
                                                    {
                                                        student.profile
                                                            .senior_high_school_name
                                                    }
                                                    {student.profile
                                                        .senior_high_school_year_graduated &&
                                                        ` (${student.profile.senior_high_school_year_graduated})`}
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {student.profile
                                                        .shs_11_school && (
                                                        <p className="text-xs">
                                                            Grade 11:{' '}
                                                            {
                                                                student.profile
                                                                    .shs_11_school
                                                            }
                                                            {student.profile
                                                                .shs_11_year &&
                                                                ` (${student.profile.shs_11_year})`}
                                                        </p>
                                                    )}
                                                    {student.profile
                                                        .shs_12_school && (
                                                        <p className="text-xs">
                                                            Grade 12:{' '}
                                                            {
                                                                student.profile
                                                                    .shs_12_school
                                                            }
                                                            {student.profile
                                                                .shs_12_year &&
                                                                ` (${student.profile.shs_12_year})`}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* College */}
                                    {student.profile.college_school_name && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                College
                                            </p>
                                            <p className="text-sm">
                                                {student.profile
                                                    .college_degree && (
                                                    <span className="font-medium">
                                                        {
                                                            student.profile
                                                                .college_degree
                                                        }
                                                    </span>
                                                )}
                                                {student.profile
                                                    .college_degree &&
                                                    student.profile
                                                        .college_school_name &&
                                                    ' - '}
                                                {
                                                    student.profile
                                                        .college_school_name
                                                }
                                                {student.profile
                                                    .college_year_graduated &&
                                                    ` (${student.profile.college_year_graduated})`}
                                            </p>
                                            {student.profile
                                                .college_transferee_note && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {
                                                        student.profile
                                                            .college_transferee_note
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Graduate School */}
                                    {(student.profile
                                        .graduate_school_school_name ||
                                        student.profile.grad_masteral_school ||
                                        student.profile
                                            .grad_doctoral_school) && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                Graduate School
                                            </p>
                                            {student.profile
                                                .graduate_school_school_name ? (
                                                <p className="text-sm">
                                                    {student.profile
                                                        .graduate_school_degree && (
                                                        <span className="font-medium">
                                                            {
                                                                student.profile
                                                                    .graduate_school_degree
                                                            }
                                                        </span>
                                                    )}
                                                    {student.profile
                                                        .graduate_school_degree &&
                                                        student.profile
                                                            .graduate_school_school_name &&
                                                        ' - '}
                                                    {
                                                        student.profile
                                                            .graduate_school_school_name
                                                    }
                                                    {student.profile
                                                        .graduate_school_year_graduated &&
                                                        ` (${student.profile.graduate_school_year_graduated})`}
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {student.profile
                                                        .grad_masteral_school && (
                                                        <p className="text-xs">
                                                            Masteral:{' '}
                                                            {
                                                                student.profile
                                                                    .grad_masteral_school
                                                            }
                                                            {student.profile
                                                                .grad_masteral_year &&
                                                                ` (${student.profile.grad_masteral_year})`}
                                                        </p>
                                                    )}
                                                    {student.profile
                                                        .grad_doctoral_school && (
                                                        <p className="text-xs">
                                                            Doctoral:{' '}
                                                            {
                                                                student.profile
                                                                    .grad_doctoral_school
                                                            }
                                                            {student.profile
                                                                .grad_doctoral_year &&
                                                                ` (${student.profile.grad_doctoral_year})`}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!student.profile.grade_school_name &&
                                        !student.profile
                                            .junior_high_school_name &&
                                        !student.profile
                                            .senior_high_school_name &&
                                        !student.profile.college_school_name &&
                                        !student.profile
                                            .graduate_school_school_name &&
                                        !student.profile.grade_1_school &&
                                        !student.profile.jhs_1_school &&
                                        !student.profile.shs_11_school &&
                                        !student.profile.grad_masteral_school &&
                                        !student.profile
                                            .grad_doctoral_school && (
                                            <p className="text-xs text-muted-foreground">
                                                No educational background
                                                information available.
                                            </p>
                                        )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <div>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="text-base md:text-lg">
                                    Applications
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm">
                                    All graduation applications submitted by
                                    this student.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {student.applications.length > 0 ? (
                                    <div className="space-y-3">
                                        {student.applications.map(
                                            (application) => (
                                                <div
                                                    key={application.id}
                                                    className="flex flex-col gap-1 rounded-md border px-3 py-2 text-xs md:text-sm"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-medium">
                                                                {
                                                                    application
                                                                        .course
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground md:text-xs">
                                                                {
                                                                    application
                                                                        .department
                                                                        .name
                                                                }{' '}
                                                                ·{' '}
                                                                {
                                                                    application
                                                                        .window
                                                                        .title
                                                                }
                                                            </p>
                                                        </div>
                                                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] md:text-xs">
                                                            {
                                                                statusLabel[
                                                                    application
                                                                        .status
                                                                ]
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground md:text-xs">
                                                        <span>
                                                            Application #:{' '}
                                                            {
                                                                application.application_number
                                                            }
                                                        </span>
                                                        <span>
                                                            Submitted:{' '}
                                                            {new Date(
                                                                application.created_at,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground md:text-sm">
                                        This student has not submitted any
                                        applications yet.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Student</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{' '}
                            {student.profile
                                ? formatName(
                                      student.profile.first_name,
                                      student.profile.last_name,
                                      student.profile.middle_name,
                                  )
                                : student.name}
                            ? This action cannot be undone and will permanently
                            delete the student account, profile, and all
                            associated applications.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
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

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Reset the password for{' '}
                            {student.profile
                                ? formatName(
                                      student.profile.first_name,
                                      student.profile.last_name,
                                      student.profile.middle_name,
                                  )
                                : student.name}
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
                                <p className="mt-2 text-xs text-muted-foreground">
                                    The student will use this password on their
                                    next login.
                                </p>
                            </div>
                        </div>
                        {resetSuccess && (
                            <Alert variant="success">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Password has been reset successfully! The
                                    dialog will close shortly.
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
        </AppLayout>
    );
}
