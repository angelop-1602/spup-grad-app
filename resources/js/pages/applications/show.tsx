import { ApplicationStatusBadge } from '@/components/application-status-badge';
import {
    ApplicationTrackingCard,
    type ApplicationTracking,
} from '@/components/application-tracking-card';
import { DownloadFormButton } from '@/components/download-form-button';
import { RequirementsList } from '@/components/requirements-list';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import ApplyLayout from '@/layouts/apply-layout';
import { formatDateOnly } from '@/lib/date-only';
import { profilePhotoUrl } from '@/lib/profile-photo';
import applicationRoutes from '@/routes/applications/index';
import applyRoutes from '@/routes/apply';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Edit, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Applications',
        href: applicationRoutes.index().url,
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
    created_at: string;
    updated_at: string;
}

interface ShowApplicationProps {
    application: Application;
    profile: {
        first_name: string;
        middle_name: string | null;
        last_name: string;
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
    portalMode?: 'student' | 'guest';
    tracking?: ApplicationTracking | null;
}

export default function ShowApplication({
    application,
    profile,
    portalMode = 'student',
    tracking,
}: ShowApplicationProps) {
    const [uploadingRequirement, setUploadingRequirement] = useState<
        number | null
    >(null);
    const uploadingToastIdRef = useRef<string | null>(null);
    const { addToast, removeToast } = useToast();
    const isGuestPortal = portalMode === 'guest';
    const editHref = isGuestPortal
        ? applyRoutes.portal.edit(application.application_number).url
        : applicationRoutes.edit(application.application_number).url;
    const downloadHref = isGuestPortal
        ? applyRoutes.portal.download(application.application_number).url
        : applicationRoutes.download(application.application_number).url;
    const photoDownloadHref = isGuestPortal
        ? `/apply/application/${application.application_number}/photo/download`
        : `/applications/${application.application_number}/photo/download`;
    const uploadHref = (requirementId: number) =>
        isGuestPortal
            ? applyRoutes.portal.upload([
                  application.application_number,
                  requirementId,
              ]).url
            : `/applications/${application.application_number}/requirements/${requirementId}/upload`;
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
    const highestEducationLevelLabel = profile?.highest_education_level
        ? (HIGHEST_EDUCATION_LEVEL_LABELS[profile.highest_education_level] ??
          profile.highest_education_level)
        : 'N/A';
    const collegeSchoolDisplay = profile?.is_transferee
        ? 'St. Paul University Philippines'
        : profile?.college_school_name;
    const applicationDateRange = `${new Date(application.window.start_date).toLocaleDateString()} - ${new Date(application.window.end_date).toLocaleDateString()}`;
    const hasGradeSchool = Boolean(
        profile &&
        [1, 2, 3, 4, 5, 6].some(
            (grade) => profile[`grade_${grade}_school` as keyof typeof profile],
        ),
    );
    const hasJuniorHighSchool = Boolean(
        profile &&
        [1, 2, 3, 4].some(
            (year) => profile[`jhs_${year}_school` as keyof typeof profile],
        ),
    );
    const hasSeniorHighSchool = Boolean(
        profile?.shs_11_school || profile?.shs_12_school,
    );
    const shouldShowCollege = Boolean(
        profile &&
        (profile.college_degree ||
            collegeSchoolDisplay ||
            profile.college_year_graduated) &&
        ['college', 'masters', 'doctor'].includes(
            profile.highest_education_level || '',
        ),
    );
    const shouldShowGraduateStudies = Boolean(
        profile &&
        ['masters', 'doctor'].includes(profile.highest_education_level || '') &&
        (profile.grad_masteral_school || profile.grad_doctoral_school),
    );

    // Check if this is a graduate program (has subject_code or thesis fields, or subject enrollments with " - " separator)
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
                  const subjectName = se.subject_name || '';
                  const parts = subjectName.split(' - ');
                  return {
                      subject_code: parts[0] || '',
                      subject_title: parts[1] || subjectName,
                      units: se.units,
                  };
              })
            : [];

    const content = (
        <>
            <Head title="Application Details" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 md:gap-8 md:p-6">
                <div className="space-y-6 pb-6">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-bold tracking-tight md:text-3xl">
                                    Application Details
                                </h1>
                                <p className="hidden text-xs text-muted-foreground sm:block md:text-base">
                                    View your graduation application information
                                    and remaining requirements.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {application.status === 'approved' && (
                                <DownloadFormButton
                                    href={downloadHref}
                                    size="sm"
                                    variant="outline"
                                    className="shrink-0"
                                />
                            )}
                            {(application.status === 'submitted' ||
                                application.status === 'incomplete' ||
                                application.status === 'approved' ||
                                application.status === 'pending') && (
                                <Button asChild size="sm" className="shrink-0">
                                    <Link href={editHref}>
                                        <Edit className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">
                                            Edit Application
                                        </span>
                                    </Link>
                                </Button>
                            )}
                            {!isGuestPortal &&
                                application.status === 'submitted' && (
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="destructive"
                                        className="shrink-0"
                                    >
                                        <Link
                                            href={
                                                applicationRoutes.destroy({
                                                    application:
                                                        application.application_number,
                                                }).url
                                            }
                                            method="delete"
                                            as="button"
                                            preserveScroll
                                            data-confirm="Are you sure you want to delete this application? This action cannot be undone."
                                        >
                                            <Trash2 className="h-4 w-4 md:mr-2" />
                                            <span className="hidden md:inline">
                                                Delete Application
                                            </span>
                                        </Link>
                                    </Button>
                                )}
                        </div>
                    </div>

                    {/* Application Details */}
                    <div className="rounded-lg border bg-muted/30 p-3 md:p-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Application Number
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.application_number}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Status
                                </Label>
                                <div className="mt-1 space-y-2">
                                    <ApplicationStatusBadge
                                        status={application.status}
                                        size="md"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Submitted{' '}
                                        {new Date(
                                            application.created_at,
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Degree Title
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.degree_title}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Department
                                </Label>
                                <p className="text-sm">
                                    {application.department.name}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Graduation Appearance
                                </Label>
                                <p className="text-sm">
                                    {application.presence === 'attending'
                                        ? 'Attending'
                                        : 'Not Attending'}
                                </p>
                            </div>
                        </div>
                        <div className="grid hidden gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Application Number
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.application_number}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Application Window
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.window.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {applicationDateRange}
                                </p>
                                {/*
                                    {new Date(application.window.start_date).toLocaleDateString()} –{' '}
                            */}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Status
                                </Label>
                                <div className="mt-1">
                                    <ApplicationStatusBadge
                                        status={application.status}
                                        size="md"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Course
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.course.name}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Degree Title
                                </Label>
                                <p className="text-sm font-medium">
                                    {application.degree_title}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Department
                                </Label>
                                <p className="text-sm">
                                    {application.department.name}
                                </p>
                            </div>
                            {application.major ? (
                                <div className="space-y-1">
                                    <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Major
                                    </Label>
                                    <p className="text-sm font-medium">
                                        {application.major}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                        <div className="grid hidden gap-4 border-t pt-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Graduation Appearance
                                </Label>
                                <p className="text-sm">
                                    {application.presence === 'attending'
                                        ? 'Attending'
                                        : 'Not Attending'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Submitted On
                                </Label>
                                <p className="text-sm">
                                    {new Date(
                                        application.created_at,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <ApplicationTrackingCard tracking={tracking} />
                </div>

                <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    {/* Left column: details */}
                    <div className="space-y-4 md:space-y-8 lg:col-span-2">
                        {/* Personal Data */}
                        {profile && (
                            <div className="space-y-3 md:space-y-4">
                                <h2 className="text-base font-semibold md:text-lg">
                                    Personal Data
                                </h2>
                                <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
                                    <div className="space-y-2">
                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Photo
                                        </dt>
                                        {profilePhotoUrl(profile) ? (
                                            <div className="space-y-3">
                                                <img
                                                    src={
                                                        profilePhotoUrl(
                                                            profile,
                                                        ) ?? ''
                                                    }
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
                                                        <Download className="mr-2 h-4 w-4" />
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
                                            <dd className="text-sm leading-relaxed">
                                                {profile.permanent_address}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}

                        {profile && (
                            <div className="space-y-3 border-t pt-6 md:space-y-4">
                                <div className="space-y-2">
                                    <h2 className="text-base font-semibold md:text-lg">
                                        Educational Background
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Review the school history and education
                                        details submitted with this application.
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-background p-4 md:p-5">
                                    <dl className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Highest Education Level
                                                Completed
                                            </dt>
                                            <dd className="text-sm">
                                                {highestEducationLevelLabel}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                {hasGradeSchool && (
                                    <div className="space-y-2 border-t pt-4">
                                        <h3 className="text-sm font-semibold">
                                            Grade School
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {[1, 2, 3, 4, 5, 6].map((grade) => {
                                                const school = profile[
                                                    `grade_${grade}_school` as keyof typeof profile
                                                ] as string | null | undefined;
                                                const year = profile[
                                                    `grade_${grade}_year` as keyof typeof profile
                                                ] as number | null | undefined;

                                                if (!school) {
                                                    return null;
                                                }

                                                return (
                                                    <div
                                                        key={`grade-${grade}`}
                                                        className="space-y-1"
                                                    >
                                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                            Grade {grade}
                                                        </dt>
                                                        <dd className="text-sm">
                                                            {school}
                                                            {year
                                                                ? ` (${year})`
                                                                : ''}
                                                        </dd>
                                                    </div>
                                                );
                                            })}
                                        </dl>
                                    </div>
                                )}

                                {hasJuniorHighSchool && (
                                    <div className="space-y-2 border-t pt-4">
                                        <h3 className="text-sm font-semibold">
                                            Junior High School
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {[1, 2, 3, 4].map((yearLevel) => {
                                                const school = profile[
                                                    `jhs_${yearLevel}_school` as keyof typeof profile
                                                ] as string | null | undefined;
                                                const year = profile[
                                                    `jhs_${yearLevel}_year` as keyof typeof profile
                                                ] as number | null | undefined;

                                                if (!school) {
                                                    return null;
                                                }

                                                return (
                                                    <div
                                                        key={`jhs-${yearLevel}`}
                                                        className="space-y-1"
                                                    >
                                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                            Grade{' '}
                                                            {yearLevel + 6}
                                                        </dt>
                                                        <dd className="text-sm">
                                                            {school}
                                                            {year
                                                                ? ` (${year})`
                                                                : ''}
                                                        </dd>
                                                    </div>
                                                );
                                            })}
                                        </dl>
                                    </div>
                                )}

                                {hasSeniorHighSchool && (
                                    <div className="space-y-2 border-t pt-4">
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

                                {shouldShowCollege && (
                                    <div className="space-y-2 border-t pt-4">
                                        <h3 className="text-sm font-semibold">
                                            College
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            <div className="space-y-1">
                                                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Degree / Course
                                                </dt>
                                                <dd className="text-sm">
                                                    {profile.college_degree ||
                                                        'N/A'}
                                                </dd>
                                            </div>
                                            <div className="space-y-1">
                                                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    School
                                                </dt>
                                                <dd className="text-sm">
                                                    {collegeSchoolDisplay ||
                                                        'N/A'}
                                                </dd>
                                            </div>
                                            <div className="space-y-1">
                                                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Year Graduated
                                                </dt>
                                                <dd className="text-sm">
                                                    {profile.college_year_graduated ||
                                                        'N/A'}
                                                </dd>
                                            </div>
                                            <div className="space-y-1">
                                                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Graduated in SPUP
                                                </dt>
                                                <dd className="text-sm">
                                                    {profile.is_transferee
                                                        ? 'Yes'
                                                        : 'No'}
                                                </dd>
                                            </div>
                                            {profile.college_transferee_note && (
                                                <div className="space-y-1 md:col-span-2">
                                                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Note
                                                    </dt>
                                                    <dd className="text-sm">
                                                        {
                                                            profile.college_transferee_note
                                                        }
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                )}

                                {shouldShowGraduateStudies && (
                                    <div className="space-y-2 border-t pt-4">
                                        <h3 className="text-sm font-semibold">
                                            Graduate Studies
                                        </h3>
                                        <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                                            {profile.grad_masteral_school && (
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

                        {/* Graduate Program Fields */}
                        {isGraduateProgram && (
                            <div className="space-y-6 border-t pt-6">
                                <div className="space-y-1">
                                    <h2 className="text-base font-semibold tracking-tight md:text-lg">
                                        Graduate Program Details
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Information about your graduate subjects
                                        and thesis/dissertation.
                                    </p>
                                </div>
                                <div className="space-y-6 border-y py-6">
                                    {application.thesis_dissertation_title && (
                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Thesis / Dissertation Title
                                            </Label>
                                            <p className="text-sm leading-relaxed">
                                                {
                                                    application.thesis_dissertation_title
                                                }
                                            </p>
                                        </div>
                                    )}
                                    {application.thesis_dissertation_adviser && (
                                        <div className="space-y-1">
                                            <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                Adviser
                                            </Label>
                                            <p className="text-sm">
                                                {
                                                    application.thesis_dissertation_adviser
                                                }
                                            </p>
                                        </div>
                                    )}
                                    {graduateSubjects.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold">
                                                    Subjects Presently Enrolled
                                                </h3>
                                                <span className="text-xs text-muted-foreground">
                                                    {graduateSubjects.length}{' '}
                                                    subject
                                                    {graduateSubjects.length ===
                                                    1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            </div>
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right column: requirements */}
                    <div className="lg:col-span-1">
                        <div className="space-y-3 rounded-lg border bg-muted/30 p-3 md:space-y-4 md:p-6">
                            <div className="space-y-1">
                                <h2 className="text-base font-semibold md:text-lg">
                                    Requirements
                                </h2>
                                <p className="text-xs text-muted-foreground md:text-sm">
                                    These documents are required to complete
                                    your application.
                                </p>
                            </div>

                            {/* All requirements with status */}
                            <div className="space-y-2 border-t pt-3 md:space-y-3 md:pt-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase md:text-xs">
                                        Requirements Checklist
                                    </p>
                                </div>
                                <RequirementsList
                                    requirements={application.requirements}
                                    mode="student"
                                    portalMode={portalMode}
                                    onFileUpload={(requirementId, file) => {
                                        const maxBytes = 10 * 1024 * 1024;
                                        if (file.size > maxBytes) {
                                            addToast({
                                                variant: 'error',
                                                title: 'File too large',
                                                description:
                                                    'Maximum allowed file size is 10MB.',
                                            });
                                            return;
                                        }

                                        setUploadingRequirement(requirementId);
                                        const formData = new FormData();
                                        formData.append('file', file);

                                        router.post(
                                            uploadHref(requirementId),
                                            formData,
                                            {
                                                preserveScroll: true,
                                                forceFormData: true,
                                                onStart: () => {
                                                    // Remove any existing uploading toast
                                                    if (
                                                        uploadingToastIdRef.current
                                                    ) {
                                                        removeToast(
                                                            uploadingToastIdRef.current,
                                                        );
                                                    }
                                                    // Create new uploading toast and store its ID
                                                    const toastId = addToast({
                                                        variant: 'info',
                                                        title: 'Uploading...',
                                                        description:
                                                            'Uploading file...',
                                                        duration: 0,
                                                    });
                                                    uploadingToastIdRef.current =
                                                        toastId;
                                                },
                                                onSuccess: () => {
                                                    setUploadingRequirement(
                                                        null,
                                                    );
                                                    // Remove the uploading toast
                                                    if (
                                                        uploadingToastIdRef.current
                                                    ) {
                                                        removeToast(
                                                            uploadingToastIdRef.current,
                                                        );
                                                        uploadingToastIdRef.current =
                                                            null;
                                                    }
                                                    addToast({
                                                        variant: 'success',
                                                        title: 'File uploaded',
                                                        description:
                                                            'File uploaded successfully',
                                                    });
                                                },
                                                onError: (errors) => {
                                                    setUploadingRequirement(
                                                        null,
                                                    );
                                                    // Remove the uploading toast
                                                    if (
                                                        uploadingToastIdRef.current
                                                    ) {
                                                        removeToast(
                                                            uploadingToastIdRef.current,
                                                        );
                                                        uploadingToastIdRef.current =
                                                            null;
                                                    }
                                                    const errorMessage =
                                                        errors?.file?.[0] ||
                                                        errors?.message ||
                                                        'Failed to upload file';
                                                    addToast({
                                                        variant: 'error',
                                                        title: 'Upload failed',
                                                        description:
                                                            errorMessage,
                                                    });
                                                },
                                                onFinish: () => {
                                                    setUploadingRequirement(
                                                        null,
                                                    );
                                                    // Ensure uploading toast is removed
                                                    if (
                                                        uploadingToastIdRef.current
                                                    ) {
                                                        removeToast(
                                                            uploadingToastIdRef.current,
                                                        );
                                                        uploadingToastIdRef.current =
                                                            null;
                                                    }
                                                },
                                            },
                                        );
                                    }}
                                    uploadingRequirement={uploadingRequirement}
                                    applicationNumber={
                                        application.application_number
                                    }
                                    showNotesInput={false}
                                    className="space-y-3"
                                    showDownloadButton={!isGuestPortal}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    if (isGuestPortal) {
        return <ApplyLayout>{content}</ApplyLayout>;
    }

    return <AppLayout breadcrumbs={breadcrumbs}>{content}</AppLayout>;
}
