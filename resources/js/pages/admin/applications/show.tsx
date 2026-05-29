import { ApplicationStatusBadge } from '@/components/application-status-badge';
import { DownloadFormButton } from '@/components/download-form-button';
import { RequirementsList } from '@/components/requirements-list';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import { formatDateOnly } from '@/lib/date-only';
import { profilePhotoUrl } from '@/lib/profile-photo';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Application Windows',
        href: adminRoutes.windows.index().url,
    },
    {
        title: 'Application Details',
        href: '#',
    },
];

const HIGHEST_EDUCATION_LEVEL_LABELS: Record<string, string> = {
    elementary: 'Elementary (Grade School)',
    junior_high_school: 'Junior High School',
    senior_high_school: 'Senior High School',
    college: 'College',
    masters: "Master's Degree",
    doctor: 'Doctoral Degree',
};

interface SubjectEnrollment {
    id: number;
    subject_name: string;
    units: number;
    order: number;
}

interface ApplicationRequirement {
    id: number;
    requirement_key: string;
    requirement_label: string;
    status: 'pending' | 'required' | 'approved';
    notes: string | null;
    file_path: string | null;
    parent_id: number | null;
    children?: ApplicationRequirement[];
}

interface Application {
    id: number;
    application_number: string;
    user: {
        id: number;
        email: string;
        student_id: string;
        profile: {
            first_name: string;
            last_name: string;
            middle_name: string | null;
            suffix?: string | null;
            date_of_birth: string;
            place_of_birth: string;
            sex: string;
            civil_status: string;
            religion: string | null;
            nationality: string;
            permanent_address: string;
            contact_number: string;
            photo_path?: string | null;
            photo_url?: string | null;
            highest_education_level: string | null;
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
            jhs_1_school?: string | null;
            jhs_1_year?: number | null;
            jhs_2_school?: string | null;
            jhs_2_year?: number | null;
            jhs_3_school?: string | null;
            jhs_3_year?: number | null;
            jhs_4_school?: string | null;
            jhs_4_year?: number | null;
            shs_11_school?: string | null;
            shs_11_year?: number | null;
            shs_12_school?: string | null;
            shs_12_year?: number | null;
            college_degree?: string | null;
            college_school_name?: string | null;
            college_year_graduated?: number | null;
            college_transferee_note?: string | null;
            is_transferee?: boolean | null;
            grad_masteral_school?: string | null;
            grad_masteral_year?: number | null;
            grad_doctoral_school?: string | null;
            grad_doctoral_year?: number | null;
        } | null;
    };
    window: {
        id: number;
        title: string;
        start_date: string;
        end_date: string;
    };
    department: {
        id: number;
        name: string;
    };
    course: {
        id: number;
        name: string;
    };
    major: string;
    degree_title: string;
    presence: string;
    status: 'submitted' | 'pending' | 'approved' | 'incomplete';
    subject_code: string | null;
    subject_title: string | null;
    units: number | null;
    thesis_dissertation_title: string | null;
    thesis_dissertation_adviser: string | null;
    subject_enrollments: SubjectEnrollment[];
    requirements: ApplicationRequirement[];
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface ShowApplicationProps {
    application: Application;
}

const requirementStatusConfig = {
    pending: { label: 'Pending', icon: Clock, color: 'text-blue-500' },
    required: { label: 'Required', icon: Clock, color: 'text-gray-500' },
    approved: {
        label: 'Approved',
        icon: CheckCircle2,
        color: 'text-green-600',
    },
};

export default function AdminShowApplication({
    application,
}: ShowApplicationProps) {
    const { addToast } = useToast();
    const [requirementsData, setRequirementsData] = useState(
        application.requirements
            .filter((req) => !req.parent_id) // Only process parent requirements
            .flatMap((req) => {
                const children = req.children || [];
                // Include parent and all children
                return [req, ...children];
            })
            .map((req) => ({
                id: req.id,
                status: req.status,
                notes: req.notes || '',
            })),
    );
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Store initial requirements for comparison
    const initialRequirements = useMemo(
        () =>
            application.requirements
                .filter((req) => !req.parent_id) // Only process parent requirements
                .flatMap((req) => {
                    const children = req.children || [];
                    // Include parent and all children
                    return [req, ...children];
                })
                .map((req) => ({
                    id: req.id,
                    status: req.status,
                    notes: req.notes || '',
                })),
        [application.id], // Only reset when application changes
    );

    // Check if there are unsaved changes
    useEffect(() => {
        const hasUnsavedChanges = initialRequirements.some((initialReq) => {
            const reqData = requirementsData.find(
                (r) => r.id === initialReq.id,
            );
            if (!reqData) return false;
            const statusChanged = reqData.status !== initialReq.status;
            const notesChanged =
                (reqData.notes || '') !== (initialReq.notes || '');
            return statusChanged || notesChanged;
        });
        setHasChanges(hasUnsavedChanges);
    }, [requirementsData, initialRequirements]);

    const handleRequirementStatusChange = (
        requirementId: number,
        status: ApplicationRequirement['status'],
    ) => {
        setRequirementsData((prev) => {
            const updated = prev.map((req) =>
                req.id === requirementId ? { ...req, status } : req,
            );
            return updated;
        });
    };

    const handleRequirementNotesChange = (
        requirementId: number,
        notes: string,
    ) => {
        setRequirementsData((prev) => {
            const updated = prev.map((req) =>
                req.id === requirementId ? { ...req, notes } : req,
            );
            return updated;
        });
    };

    const handleSaveRequirements = () => {
        setIsSaving(true);
        router.put(
            adminRoutes.applications.updateRequirements({
                application: application.application_number,
            }).url,
            { requirements: requirementsData },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addToast({
                        variant: 'success',
                        title: 'Changes saved',
                        description:
                            'Requirement updates have been saved successfully',
                    });
                    setHasChanges(false);
                    // Reload the page to get fresh data
                    router.reload({ only: ['application'] });
                },
                onError: (errors) => {
                    const errorMessage =
                        errors?.message || 'Failed to save requirement changes';
                    addToast({
                        variant: 'error',
                        title: 'Save failed',
                        description: errorMessage,
                    });
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    // Check if this is a graduate program
    const isGraduateProgram =
        application.department.name.toLowerCase().includes('graduate') ||
        application.subject_code ||
        application.thesis_dissertation_title ||
        (application.subject_enrollments.length > 0 &&
            application.subject_enrollments.some((se) =>
                se.subject_name.includes(' - '),
            ));

    // Parse graduate subjects from subject enrollments
    const graduateSubjects =
        isGraduateProgram && application.subject_enrollments.length > 0
            ? application.subject_enrollments.map((se) => {
                  const parts = se.subject_name.split(' - ');
                  return {
                      subject_code: parts[0] || '',
                      subject_title: parts[1] || se.subject_name,
                      units: se.units,
                  };
              })
            : [];

    const profile = application.user.profile;
    const highestEducationLevelLabel = profile?.highest_education_level
        ? (HIGHEST_EDUCATION_LEVEL_LABELS[profile.highest_education_level] ??
          profile.highest_education_level)
        : 'N/A';
    const collegeSchoolDisplay = profile?.is_transferee
        ? 'St. Paul University Philippines'
        : profile?.college_school_name;
    const profileDisplayName = profile
        ? [
              profile.first_name,
              profile.middle_name,
              profile.last_name,
              profile.suffix,
          ]
              .filter((part): part is string => Boolean(part))
              .join(' ')
        : 'N/A';
    const photoDownloadHref = `/admin/applications/${application.application_number}/photo/download`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Details" />
            <div className="flex h-full flex-1 flex-col gap-8 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-6">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link
                                href={
                                    adminRoutes.windows.show({
                                        window: application.window.id,
                                    }).url
                                }
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Application Details
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ApplicationStatusBadge
                            status={application.status}
                            size="md"
                        />
                        {application.status === 'approved' && (
                            <DownloadFormButton
                                href={
                                    adminRoutes.applications.download({
                                        application:
                                            application.application_number,
                                    }).url
                                }
                                variant="outline"
                                size="sm"
                            />
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left Column - Details */}
                    <div className="space-y-8 lg:col-span-2">
                        {/* Personal Data */}
                        {profile && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold">
                                    Personal Data
                                </h2>
                                <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Photo
                                        </p>
                                        {profilePhotoUrl(profile) ? (
                                            <div className="space-y-3">
                                                <img
                                                    src={profilePhotoUrl(profile) ?? ''}
                                                    alt={`${profileDisplayName} profile`}
                                                    className="h-44 w-full max-w-[180px] rounded-lg border object-cover"
                                                />
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full max-w-[180px]"
                                                >
                                                    <a href={photoDownloadHref}>
                                                        Download Photo
                                                    </a>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex h-44 w-full max-w-[180px] items-center justify-center rounded-lg border border-dashed bg-muted/40 px-4 text-center text-xs text-muted-foreground">
                                                No photo uploaded
                                            </div>
                                        )}
                                    </div>
                                    <dl className="grid min-w-0 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Full Name
                                            </dt>
                                            <dd className="text-sm">
                                                {profileDisplayName}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Email Address
                                            </dt>
                                            <dd className="text-sm break-all">
                                                {application.user.email}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Student ID
                                            </dt>
                                            <dd className="text-sm">
                                                {application.user.student_id}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Date of Birth
                                            </dt>
                                            <dd className="text-sm">
                                                {formatDateOnly(
                                                    profile.date_of_birth,
                                                )}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Place of Birth
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.place_of_birth}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Sex
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.sex}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Civil Status
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.civil_status}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Religion
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.religion || 'N/A'}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Nationality
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.nationality}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Contact Number
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.contact_number}
                                            </dd>
                                        </div>
                                        <div className="space-y-1 sm:col-span-2 xl:col-span-3">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Permanent Address
                                            </dt>
                                            <dd className="text-sm">
                                                {profile.permanent_address}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}

                        {/* Educational Background */}
                        {profile && (
                            <div className="space-y-4 border-t pt-6">
                                <h2 className="text-lg font-semibold">
                                    Educational Background
                                </h2>
                                <dl className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Highest Education Level Completed
                                        </dt>
                                        <dd className="text-sm">
                                            {highestEducationLevelLabel}
                                        </dd>
                                    </div>
                                </dl>

                                {/* Grade School (Grades 1–6) */}
                                {(profile.grade_1_school ||
                                    profile.grade_2_school ||
                                    profile.grade_3_school ||
                                    profile.grade_4_school ||
                                    profile.grade_5_school ||
                                    profile.grade_6_school) && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">
                                            Grade School
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {profile.grade_1_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 1
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_1_school}
                                                        {profile.grade_1_year
                                                            ? ` (${profile.grade_1_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.grade_2_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 2
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_2_school}
                                                        {profile.grade_2_year
                                                            ? ` (${profile.grade_2_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.grade_3_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 3
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_3_school}
                                                        {profile.grade_3_year
                                                            ? ` (${profile.grade_3_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.grade_4_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 4
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_4_school}
                                                        {profile.grade_4_year
                                                            ? ` (${profile.grade_4_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.grade_5_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 5
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_5_school}
                                                        {profile.grade_5_year
                                                            ? ` (${profile.grade_5_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.grade_6_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 6
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.grade_6_school}
                                                        {profile.grade_6_year
                                                            ? ` (${profile.grade_6_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {/* Junior High School (Grades 7–10) */}
                                {(profile.jhs_1_school ||
                                    profile.jhs_2_school ||
                                    profile.jhs_3_school ||
                                    profile.jhs_4_school) && (
                                    <div className="space-y-2 border-t pt-6">
                                        <h3 className="text-sm font-semibold">
                                            Junior High School
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {profile.jhs_1_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 7
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.jhs_1_school}
                                                        {profile.jhs_1_year
                                                            ? ` (${profile.jhs_1_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.jhs_2_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 8
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.jhs_2_school}
                                                        {profile.jhs_2_year
                                                            ? ` (${profile.jhs_2_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.jhs_3_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 9
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.jhs_3_school}
                                                        {profile.jhs_3_year
                                                            ? ` (${profile.jhs_3_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.jhs_4_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 10
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.jhs_4_school}
                                                        {profile.jhs_4_year
                                                            ? ` (${profile.jhs_4_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {/* Senior High School (Grades 11–12) */}
                                {(profile.shs_11_school ||
                                    profile.shs_12_school) && (
                                    <div className="space-y-2 border-t pt-6">
                                        <h3 className="text-sm font-semibold">
                                            Senior High School
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {profile.shs_11_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 11
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.shs_11_school}
                                                        {profile.shs_11_year
                                                            ? ` (${profile.shs_11_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                            {profile.shs_12_school && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Grade 12
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.shs_12_school}
                                                        {profile.shs_12_year
                                                            ? ` (${profile.shs_12_year})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {/* College – only if highest education is at least college */}
                                {(profile.college_degree ||
                                    collegeSchoolDisplay ||
                                    profile.college_year_graduated) &&
                                    (profile.highest_education_level ===
                                        'college' ||
                                        profile.highest_education_level ===
                                            'masters' ||
                                        profile.highest_education_level ===
                                            'doctor') && (
                                        <div className="space-y-2 border-t pt-6">
                                            <h3 className="text-sm font-semibold">
                                                College
                                            </h3>
                                            <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Degree / Course
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {profile.college_degree &&
                                                            `${profile.college_degree} – `}
                                                        {collegeSchoolDisplay}
                                                        {profile.college_year_graduated
                                                            ? ` (${profile.college_year_graduated})`
                                                            : ''}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>
                                    )}

                                {/* Graduate Studies – only if highest education level is masters or doctor */}
                                {(profile.grad_masteral_school ||
                                    profile.grad_doctoral_school) &&
                                    (profile.highest_education_level ===
                                        'masters' ||
                                        profile.highest_education_level ===
                                            'doctor') && (
                                        <div className="space-y-2 border-t pt-6">
                                            <h3 className="text-sm font-semibold">
                                                Graduate Studies
                                            </h3>
                                            <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                                {profile.highest_education_level !==
                                                    'doctor' &&
                                                    profile.grad_masteral_school && (
                                                        <div className="space-y-1">
                                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                                Masters
                                                            </dt>
                                                            <dd className="text-sm">
                                                                {
                                                                    profile.grad_masteral_school
                                                                }
                                                                {profile.grad_masteral_year
                                                                    ? ` (${profile.grad_masteral_year})`
                                                                    : ''}
                                                            </dd>
                                                        </div>
                                                    )}

                                                {profile.grad_doctoral_school && (
                                                    <div className="space-y-1">
                                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                            Doctoral
                                                        </dt>
                                                        <dd className="text-sm">
                                                            {
                                                                profile.grad_doctoral_school
                                                            }
                                                            {profile.grad_doctoral_year
                                                                ? ` (${profile.grad_doctoral_year})`
                                                                : ''}
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    )}
                            </div>
                        )}

                        {/* Graduate Program Details */}
                        <div className="space-y-6 border-t pt-6">
                            {/* Header */}
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold tracking-tight">
                                    Graduate Program Details
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Program information and (if applicable)
                                    current enrollment.
                                </p>
                            </div>

                            {/* Content container */}
                            <div className="space-y-6 border-y py-6">
                                {/* Program Information */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Program Information
                                    </h3>

                                    <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Course
                                            </dt>
                                            <dd className="text-sm font-medium">
                                                {application.course.name}
                                            </dd>
                                        </div>
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Degree Title
                                            </dt>
                                            <dd className="text-sm font-medium">
                                                {application.degree_title}
                                            </dd>
                                        </div>

                                        {application.major && (
                                            <div className="space-y-1">
                                                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Major
                                                </dt>
                                                <dd className="text-sm font-medium">
                                                    {application.major}
                                                </dd>
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Department
                                            </dt>
                                            <dd className="text-sm">
                                                {application.department.name}
                                            </dd>
                                        </div>

                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Graduation Appearance
                                            </dt>
                                            <dd className="text-sm">
                                                {application.presence ===
                                                'attending'
                                                    ? 'Attending'
                                                    : 'Not Attending'}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Divider */}
                                {(application.thesis_dissertation_title ||
                                    application.thesis_dissertation_adviser) && (
                                    <div className="space-y-3 border-t pt-6">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Thesis / Dissertation
                                        </h3>

                                        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                                            {application.thesis_dissertation_title && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Title
                                                    </dt>
                                                    <dd className="text-sm leading-relaxed">
                                                        {
                                                            application.thesis_dissertation_title
                                                        }
                                                    </dd>
                                                </div>
                                            )}

                                            {application.thesis_dissertation_adviser && (
                                                <div className="space-y-1">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Adviser
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {
                                                            application.thesis_dissertation_adviser
                                                        }
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {/* Graduate Enrollment */}
                                {isGraduateProgram && (
                                    <div className="space-y-3 border-t pt-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Subjects Presently Enrolled
                                            </h3>
                                            <span className="text-xs text-muted-foreground">
                                                {graduateSubjects.length}{' '}
                                                subject
                                                {graduateSubjects.length === 1
                                                    ? ''
                                                    : 's'}
                                            </span>
                                        </div>

                                        {graduateSubjects.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse text-sm">
                                                    <thead>
                                                        <tr className="border-b">
                                                            <th className="px-0 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Code
                                                            </th>
                                                            <th className="px-0 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Title
                                                            </th>
                                                            <th className="px-0 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Units
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="[&_tr:last-child]:border-b-0">
                                                        {graduateSubjects.map(
                                                            (
                                                                subject,
                                                                index,
                                                            ) => (
                                                                <tr
                                                                    key={index}
                                                                    className="border-b"
                                                                >
                                                                    <td className="py-3 pr-4 align-top">
                                                                        {subject.subject_code ||
                                                                            '-'}
                                                                    </td>
                                                                    <td className="py-3 pr-4 align-top">
                                                                        {subject.subject_title ||
                                                                            '-'}
                                                                    </td>
                                                                    <td className="py-3 align-top">
                                                                        {subject.units ||
                                                                            '-'}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No subjects listed.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Requirements & Status */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <div className="space-y-3 rounded-lg border bg-muted/30 p-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">
                                        Requirements Checklist
                                    </h2>
                                    {hasChanges && (
                                        <span className="text-xs text-muted-foreground">
                                            Unsaved changes
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-3 border-t pt-6">
                                    <RequirementsList
                                        requirements={application.requirements}
                                        requirementsData={requirementsData}
                                        mode="admin"
                                        applicationNumber={
                                            application.application_number
                                        }
                                        showDownloadButton={true}
                                        onStatusChange={
                                            handleRequirementStatusChange
                                        }
                                        onNotesChange={
                                            handleRequirementNotesChange
                                        }
                                        showNotesInput={true}
                                        className="space-y-3"
                                    />
                                </div>
                                {hasChanges && (
                                    <div className="flex justify-end border-t pt-4">
                                        <Button
                                            onClick={handleSaveRequirements}
                                            disabled={isSaving}
                                            size="sm"
                                        >
                                            {isSaving
                                                ? 'Saving...'
                                                : 'Save Changes'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
