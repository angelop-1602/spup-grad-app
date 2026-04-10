import { ApplicationApplicantCell } from '@/components/application-applicant-cell';
import { HistoricalApplicationStatusBadge } from '@/components/historical-application-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import coordinatorRoutes from '@/routes/coordinator';
import type { BreadcrumbItem } from '@/types';
import type { HistoricalApplicationShowProps, HistoricalViewer } from '@/types/historical-graduation-application';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Database, GraduationCap, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

function viewerRoutes(viewer: HistoricalViewer) {
    if (viewer === 'admin') {
        return {
            dashboardLabel: 'Admin Dashboard',
            dashboardHref: adminRoutes.dashboard().url,
            indexHref: adminRoutes.windows.index().url,
            indexLabel: 'Application Windows',
        };
    }

    return {
        dashboardLabel: 'Coordinator Dashboard',
        dashboardHref: coordinatorRoutes.dashboard().url,
        indexHref: coordinatorRoutes.applications.index().url,
        indexLabel: 'Application Windows',
    };
}

function formatDate(value: string | null, includeTime = false): string {
    if (!value) {
        return 'N/A';
    }

    const options: Intl.DateTimeFormatOptions = includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' };

    return new Date(value).toLocaleString(undefined, options);
}

function attendanceLabel(value: string | null): string {
    if (value === 'attending') {
        return 'Attending';
    }

    if (value === 'not attending') {
        return 'Not Attending';
    }

    return 'N/A';
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="grid gap-1 md:grid-cols-[180px,1fr]">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-sm">{value || 'N/A'}</p>
        </div>
    );
}

export default function HistoricalApplicationsShow({ viewer, record }: HistoricalApplicationShowProps) {
    const routes = viewerRoutes(viewer);
    const breadcrumbs: BreadcrumbItem[] = useMemo(
        () => [
            {
                title: routes.dashboardLabel,
                href: routes.dashboardHref,
            },
            {
                title: routes.indexLabel,
                href: routes.indexHref,
            },
            {
                title: 'Details',
                href: '#',
            },
        ],
        [routes.dashboardHref, routes.dashboardLabel, routes.indexHref, routes.indexLabel],
    );

    const elementary = record.education_history.elementary ?? [];
    const juniorHigh = record.education_history.junior_high_school ?? [];
    const seniorHigh = record.education_history.senior_high_school ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Details" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 md:gap-6 md:p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={routes.indexHref}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight md:text-3xl">Application Details</h1>
                            <p className="text-sm text-muted-foreground">
                                Imported record from {record.source_period_label}.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-4 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Applicant</CardTitle>
                                <CardDescription>Historical identity and submission summary.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ApplicationApplicantCell
                                    name={record.full_name}
                                    studentId={record.student_id}
                                    email={record.contacts.email}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <HistoricalApplicationStatusBadge status={record.status} showIcon />
                                    <Badge variant="outline">{attendanceLabel(record.attendance)}</Badge>
                                    <Badge variant="secondary">{record.source_period_label}</Badge>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <DetailRow label="Reference Code" value={record.reference_code} />
                                    <DetailRow label="Submitted At" value={formatDate(record.submitted_at)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Program Details</CardTitle>
                                <CardDescription>Imported academic program information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label="Department" value={record.program.department_name} />
                                <DetailRow label="Course" value={record.program.course_name} />
                                <DetailRow label="Major" value={record.program.major_name} />
                                <DetailRow label="Degree Title" value={record.program.degree_title} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Data</CardTitle>
                                <CardDescription>Imported demographic and civil information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label="First Name" value={record.personal.first_name} />
                                <DetailRow label="Middle Name" value={record.personal.middle_name} />
                                <DetailRow label="Last Name" value={record.personal.last_name} />
                                <DetailRow label="Sex" value={record.personal.sex} />
                                <DetailRow label="Civil Status" value={record.personal.civil_status} />
                                <DetailRow label="Religion" value={record.personal.religion} />
                                <DetailRow label="Nationality" value={record.personal.nationality} />
                                <DetailRow label="Date of Birth" value={record.personal.date_of_birth} />
                                <DetailRow label="Place of Birth" value={record.personal.place_of_birth} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Contact Details</CardTitle>
                                <CardDescription>Email, phone, and address captured in the source data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label="Email" value={record.contacts.email} />
                                <DetailRow label="Contact Number" value={record.contacts.contact_number} />
                                <DetailRow label="Address" value={record.contacts.address} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Thesis / Research</CardTitle>
                                <CardDescription>Imported title and adviser details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label="Title" value={record.thesis.title} />
                                <DetailRow label="Adviser" value={record.thesis.adviser} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Subjects</CardTitle>
                                <CardDescription>Imported subject and unit information for the record.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {record.subjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No subject data is available for this imported record.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {record.subjects.map((subject) => (
                                            <div
                                                key={`${subject.order}-${subject.title}`}
                                                className="grid gap-2 rounded-lg border p-3 md:grid-cols-[80px,1fr,80px]"
                                            >
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    {subject.order ? `#${subject.order}` : 'Subject'}
                                                </p>
                                                <p className="text-sm">{subject.title || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {subject.units ? `${subject.units} unit(s)` : 'N/A'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Education History</CardTitle>
                                <CardDescription>Imported school history grouped by level.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <h3 className="font-medium">Elementary</h3>
                                    {elementary.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No elementary history provided.</p>
                                    ) : (
                                        elementary.map((entry) => (
                                            <div key={entry.label} className="grid gap-1 md:grid-cols-[180px,1fr,120px]">
                                                <p className="text-sm font-medium text-muted-foreground">{entry.label}</p>
                                                <p className="text-sm">{entry.school || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">{entry.year || 'N/A'}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-medium">Junior High School</h3>
                                    {juniorHigh.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No junior high school history provided.</p>
                                    ) : (
                                        juniorHigh.map((entry) => (
                                            <div key={entry.label} className="grid gap-1 md:grid-cols-[180px,1fr,120px]">
                                                <p className="text-sm font-medium text-muted-foreground">{entry.label}</p>
                                                <p className="text-sm">{entry.school || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">{entry.year || 'N/A'}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-medium">Senior High School</h3>
                                    {seniorHigh.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No senior high school history provided.</p>
                                    ) : (
                                        seniorHigh.map((entry) => (
                                            <div key={entry.label} className="grid gap-1 md:grid-cols-[180px,1fr,120px]">
                                                <p className="text-sm font-medium text-muted-foreground">{entry.label}</p>
                                                <p className="text-sm">{entry.school || 'N/A'}</p>
                                                <p className="text-sm text-muted-foreground">{entry.year || 'N/A'}</p>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-medium">Higher Education</h3>
                                    <DetailRow label="College Degree" value={record.education_history.college?.degree ?? null} />
                                    <DetailRow label="College Year" value={record.education_history.college?.year ?? null} />
                                    <DetailRow label="Master's School" value={record.education_history.masters?.school ?? null} />
                                    <DetailRow label="Master's Year" value={record.education_history.masters?.year ?? null} />
                                    <DetailRow label="Doctoral School" value={record.education_history.doctor?.school ?? null} />
                                    <DetailRow label="Doctoral Year" value={record.education_history.doctor?.year ?? null} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Degree</p>
                                        <p className="text-sm text-muted-foreground">{record.program.degree_title || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Submitted</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(record.submitted_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Email</p>
                                        <p className="text-sm text-muted-foreground break-all">{record.contacts.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Contact</p>
                                        <p className="text-sm text-muted-foreground">{record.contacts.contact_number || 'N/A'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Source Metadata</CardTitle>
                                <CardDescription>Import tracking for the isolated historical record.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Database className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium">Source</p>
                                        <p className="text-sm text-muted-foreground">
                                            {record.metadata.source_table} #{record.metadata.source_row_id}
                                        </p>
                                    </div>
                                </div>
                                <DetailRow label="Batch Key" value={record.metadata.source_batch} />
                                <DetailRow label="Raw Attendance" value={record.attendance_raw} />
                                <DetailRow label="Raw Status" value={record.status_raw} />
                                <DetailRow
                                    label="Source Created"
                                    value={formatDate(record.metadata.source_created_at, true)}
                                />
                                <DetailRow
                                    label="Source Updated"
                                    value={formatDate(record.metadata.source_updated_at, true)}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
