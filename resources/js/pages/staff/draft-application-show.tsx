import {
    ApplicationTrackingCard,
    type ApplicationTracking,
} from '@/components/application-tracking-card';
import { HistoryBackButton } from '@/components/history-back-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { formatDateOnly } from '@/lib/date-only';
import { profilePhotoUrl } from '@/lib/profile-photo';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';

const HIGHEST_EDUCATION_LEVEL_LABELS: Record<string, string> = {
    elementary: 'Elementary (Grade School)',
    junior_high_school: 'Junior High School',
    senior_high_school: 'Senior High School',
    college: 'College',
    masters: "Master's Degree",
    doctor: 'Doctoral Degree',
};

type DraftStatus = 'pending' | 'needs_application' | 'verified' | string;

type DraftPayload = {
    id: number;
    tracking_code: string;
    tracking_pin: string;
    verification_status: DraftStatus;
    created_at: string | null;
    verified_at: string | null;
};

type SubjectEnrollment = {
    id: number;
    subject_name: string;
    units: number | null;
    order: number;
};

type DraftApplication = {
    id: number | null;
    application_number: string | null;
    window: {
        id: number | null;
        title: string;
        start_date: string | null;
        end_date: string | null;
    };
    department: {
        id: number | null;
        name: string;
        code?: string | null;
    };
    course: {
        id: number | null;
        name: string;
        code?: string | null;
    };
    major: string | null;
    degree_title: string | null;
    presence: string | null;
    status: string;
    subject_code: string | null;
    subject_title: string | null;
    units: number | null;
    thesis_dissertation_title: string | null;
    thesis_dissertation_adviser: string | null;
    subject_enrollments: SubjectEnrollment[];
    created_at: string | null;
    updated_at: string | null;
};

type DraftProfile = {
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    suffix?: string | null;
    date_of_birth: string | null;
    place_of_birth: string | null;
    sex: string | null;
    civil_status: string | null;
    religion: string | null;
    nationality: string | null;
    permanent_address: string | null;
    contact_number: string | null;
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
};

type DraftApplicationShowProps = {
    viewerRole: 'admin' | 'coordinator' | 'developer';
    title: string;
    backUrl: string;
    verifyUrl: string;
    applicationUrl?: string | null;
    application_url?: string | null;
    draft: DraftPayload;
    tracking: ApplicationTracking;
    application: DraftApplication;
    user: {
        email: string | null;
        student_id: string | null;
    };
    profile: DraftProfile;
};

function headline(value: string | null | undefined) {
    return (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

function value(value: string | number | null | undefined) {
    return value === null || value === undefined || value === ''
        ? 'N/A'
        : value;
}

function schoolRows(
    profile: DraftProfile,
    prefix: 'grade' | 'jhs',
    count: number,
    labelOffset = 0,
) {
    return Array.from({ length: count }, (_, index) => {
        const position = index + 1;
        const school = profile[
            `${prefix}_${position}_school` as keyof DraftProfile
        ] as string | null | undefined;
        const year = profile[
            `${prefix}_${position}_year` as keyof DraftProfile
        ] as number | null | undefined;

        if (!school) {
            return null;
        }

        return {
            label: `Grade ${position + labelOffset}`,
            value: `${school}${year ? ` (${year})` : ''}`,
        };
    }).filter((row): row is { label: string; value: string } => Boolean(row));
}

function DetailItem({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">{children}</dd>
        </div>
    );
}

function DetailSection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {children}
        </section>
    );
}

export default function DraftApplicationShow({
    viewerRole,
    title,
    backUrl,
    verifyUrl,
    applicationUrl,
    application_url,
    draft,
    tracking,
    application,
    user,
    profile,
}: DraftApplicationShowProps) {
    const { addToast } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    const profileDisplayName = [
        profile.first_name,
        profile.middle_name,
        profile.last_name,
        profile.suffix,
    ]
        .filter((part): part is string => Boolean(part))
        .join(' ');
    const verifiedApplicationUrl = applicationUrl ?? application_url ?? null;
    const isVerified = draft.verification_status === 'verified';
    const highestEducationLevelLabel = profile.highest_education_level
        ? (HIGHEST_EDUCATION_LEVEL_LABELS[profile.highest_education_level] ??
          profile.highest_education_level)
        : 'N/A';
    const collegeSchoolDisplay = profile.is_transferee
        ? 'St. Paul University Philippines'
        : profile.college_school_name;
    const gradeSchoolRows = schoolRows(profile, 'grade', 6);
    const juniorHighRows = schoolRows(profile, 'jhs', 4, 6);
    const seniorHighRows = [
        profile.shs_11_school
            ? {
                  label: 'Grade 11',
                  value: `${profile.shs_11_school}${profile.shs_11_year ? ` (${profile.shs_11_year})` : ''}`,
              }
            : null,
        profile.shs_12_school
            ? {
                  label: 'Grade 12',
                  value: `${profile.shs_12_school}${profile.shs_12_year ? ` (${profile.shs_12_year})` : ''}`,
              }
            : null,
    ].filter((row): row is { label: string; value: string } => Boolean(row));

    const graduateSubjects = application.subject_enrollments.map((subject) => {
        const parts = subject.subject_name.split(' - ');

        return {
            code: parts[0] || '',
            title: parts[1] || subject.subject_name,
            units: subject.units,
        };
    });

    const verifyDraft = () => {
        setIsVerifying(true);
        router.post(
            verifyUrl,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsVerifying(false),
                onSuccess: () => {
                    addToast({
                        variant: 'success',
                        title: 'Draft verified',
                        description:
                            'The applicant record was manually verified.',
                    });
                    router.reload();
                },
            },
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title:
                viewerRole === 'admin'
                    ? 'Admin Dashboard'
                    : 'Coordinator Dashboard',
            href:
                viewerRole === 'admin'
                    ? '/admin/dashboard'
                    : '/coordinator/dashboard',
        },
        {
            title: 'Manual Verification',
            href: backUrl,
        },
        {
            title: draft.tracking_code,
            href: '#',
        },
    ];

    const content = (
        <>
            <Head title={`${title} - ${draft.tracking_code}`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <HistoryBackButton
                            variant="ghost"
                            size="icon"
                            iconOnly
                            fallbackHref={backUrl}
                            label="Back to manual verification"
                        />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {title}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Review submitted applicant data before manual
                                verification.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                            {headline(draft.verification_status)}
                        </Badge>
                        {verifiedApplicationUrl ? (
                            <Button asChild variant="outline" size="sm">
                                <Link href={verifiedApplicationUrl}>
                                    <ExternalLink className="size-4" />
                                    Open application
                                </Link>
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            size="sm"
                            onClick={verifyDraft}
                            disabled={isVerifying || isVerified}
                        >
                            <CheckCircle2 className="size-4" />
                            {isVerified
                                ? 'Already verified'
                                : isVerifying
                                  ? 'Verifying'
                                  : 'Verify application'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="space-y-6">
                        <section className="rounded-lg border bg-muted/30 p-4">
                            <h2 className="text-lg font-semibold">
                                Application Details
                            </h2>
                            <dl className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <DetailItem label="Application Number">
                                    {value(application.application_number)}
                                </DetailItem>
                                <DetailItem label="Application Window">
                                    {value(application.window.title)}
                                </DetailItem>
                                <DetailItem label="Status">
                                    {headline(application.status)}
                                </DetailItem>
                                <DetailItem label="Course">
                                    {value(application.course.name)}
                                </DetailItem>
                                <DetailItem label="Degree Title">
                                    {value(application.degree_title)}
                                </DetailItem>
                                <DetailItem label="Department">
                                    {value(application.department.name)}
                                </DetailItem>
                                <DetailItem label="Major">
                                    {value(application.major)}
                                </DetailItem>
                                <DetailItem label="Graduation Appearance">
                                    {application.presence === 'attending'
                                        ? 'Attending'
                                        : application.presence ===
                                            'not attending'
                                          ? 'Not Attending'
                                          : value(application.presence)}
                                </DetailItem>
                            </dl>
                        </section>

                        <DetailSection title="Personal Data">
                            <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                        Photo
                                    </p>
                                    {profilePhotoUrl(profile) ? (
                                        <img
                                            src={profilePhotoUrl(profile) ?? ''}
                                            alt={`${profileDisplayName} profile`}
                                            className="h-44 w-full max-w-[180px] rounded-lg border object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-44 w-full max-w-[180px] items-center justify-center rounded-lg border border-dashed bg-muted/40 px-4 text-center text-xs text-muted-foreground">
                                            No photo uploaded
                                        </div>
                                    )}
                                </div>
                                <dl className="grid min-w-0 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                                    <DetailItem label="Full Name">
                                        {value(profileDisplayName)}
                                    </DetailItem>
                                    <DetailItem label="Email Address">
                                        <span className="break-all">
                                            {value(user.email)}
                                        </span>
                                    </DetailItem>
                                    <DetailItem label="Student ID">
                                        {value(user.student_id)}
                                    </DetailItem>
                                    <DetailItem label="Date of Birth">
                                        {profile.date_of_birth
                                            ? formatDateOnly(
                                                  profile.date_of_birth,
                                              )
                                            : 'N/A'}
                                    </DetailItem>
                                    <DetailItem label="Place of Birth">
                                        {value(profile.place_of_birth)}
                                    </DetailItem>
                                    <DetailItem label="Sex">
                                        {value(profile.sex)}
                                    </DetailItem>
                                    <DetailItem label="Civil Status">
                                        {value(profile.civil_status)}
                                    </DetailItem>
                                    <DetailItem label="Religion">
                                        {value(profile.religion)}
                                    </DetailItem>
                                    <DetailItem label="Nationality">
                                        {value(profile.nationality)}
                                    </DetailItem>
                                    <DetailItem label="Contact Number">
                                        {value(profile.contact_number)}
                                    </DetailItem>
                                    <div className="space-y-1 sm:col-span-2 xl:col-span-3">
                                        <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Permanent Address
                                        </dt>
                                        <dd className="text-sm leading-relaxed">
                                            {value(profile.permanent_address)}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </DetailSection>

                        <DetailSection title="Educational Background">
                            <dl className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                                <DetailItem label="Highest Education Level">
                                    {highestEducationLevelLabel}
                                </DetailItem>
                            </dl>

                            {gradeSchoolRows.length > 0 ? (
                                <SchoolBlock
                                    title="Grade School"
                                    rows={gradeSchoolRows}
                                />
                            ) : null}
                            {juniorHighRows.length > 0 ? (
                                <SchoolBlock
                                    title="Junior High School"
                                    rows={juniorHighRows}
                                />
                            ) : null}
                            {seniorHighRows.length > 0 ? (
                                <SchoolBlock
                                    title="Senior High School"
                                    rows={seniorHighRows}
                                />
                            ) : null}

                            {profile.college_degree ||
                            collegeSchoolDisplay ||
                            profile.college_year_graduated ? (
                                <SchoolBlock
                                    title="College"
                                    rows={[
                                        {
                                            label: 'Degree / Course',
                                            value: value(
                                                profile.college_degree,
                                            ).toString(),
                                        },
                                        {
                                            label: 'School',
                                            value: value(
                                                collegeSchoolDisplay,
                                            ).toString(),
                                        },
                                        {
                                            label: 'Year Graduated',
                                            value: value(
                                                profile.college_year_graduated,
                                            ).toString(),
                                        },
                                    ]}
                                />
                            ) : null}
                        </DetailSection>

                        <DetailSection title="Graduate Program Details">
                            <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                                <DetailItem label="Thesis / Dissertation Title">
                                    {value(
                                        application.thesis_dissertation_title,
                                    )}
                                </DetailItem>
                                <DetailItem label="Adviser">
                                    {value(
                                        application.thesis_dissertation_adviser,
                                    )}
                                </DetailItem>
                            </dl>

                            {graduateSubjects.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full min-w-[620px] text-sm">
                                        <thead className="bg-muted/60 text-left">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">
                                                    Code
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Title
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Units
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {graduateSubjects.map(
                                                (subject, index) => (
                                                    <tr
                                                        key={index}
                                                        className="border-t"
                                                    >
                                                        <td className="px-3 py-2">
                                                            {value(
                                                                subject.code,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {value(
                                                                subject.title,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {value(
                                                                subject.units,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </DetailSection>
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <ApplicationTrackingCard tracking={tracking} />
                        <section className="rounded-lg border bg-card p-4">
                            <h2 className="text-base font-semibold">
                                Verification Action
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Manual verification creates or updates the real
                                application record from this submitted draft.
                            </p>
                            <Button
                                type="button"
                                className="mt-4 w-full"
                                onClick={verifyDraft}
                                disabled={isVerifying || isVerified}
                            >
                                <CheckCircle2 className="size-4" />
                                {isVerified
                                    ? 'Already verified'
                                    : isVerifying
                                      ? 'Verifying'
                                      : 'Verify application'}
                            </Button>
                        </section>
                    </aside>
                </div>
            </div>
        </>
    );

    if (viewerRole === 'developer') {
        return (
            <DeveloperConsoleLayout
                title={title}
                description="Review and verify a submitted guest application draft."
            >
                {content}
            </DeveloperConsoleLayout>
        );
    }

    return <AppLayout breadcrumbs={breadcrumbs}>{content}</AppLayout>;
}

function SchoolBlock({
    title,
    rows,
}: {
    title: string;
    rows: Array<{ label: string; value: string }>;
}) {
    return (
        <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            <dl className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                {rows.map((row) => (
                    <DetailItem key={`${title}-${row.label}`} label={row.label}>
                        {row.value}
                    </DetailItem>
                ))}
            </dl>
        </div>
    );
}
