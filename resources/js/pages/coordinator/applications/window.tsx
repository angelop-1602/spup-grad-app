import { ApplicationApplicantCell } from '@/components/application-applicant-cell';
import { DownloadFormButton } from '@/components/download-form-button';
import { NationalitySummary } from '@/components/nationality-summary';
import { headline, staffStatusClass } from '@/components/staff-table-utils';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    WindowApplicationReviewTabs,
    type WindowApplicationDuplicatePair,
    type WindowApplicationReviewRecord,
} from '@/components/window-application-review-tabs';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Download, Eye, Search } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Coordinator Dashboard',
        href: coordinatorRoutes.dashboard().url,
    },
    {
        title: 'Application Windows',
        href: coordinatorRoutes.applications.index().url,
    },
    {
        title: 'Window Details',
        href: '#',
    },
];

interface Application {
    id: number;
    application_number: string;
    is_historical?: boolean;
    detail_url?: string | null;
    download_url?: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        student_id: string;
        profile: {
            first_name: string;
            last_name: string;
            middle_name: string | null;
            suffix?: string | null;
            photo_path?: string | null;
        } | null;
    };
    department: {
        id: number;
        name: string;
        code: string;
    };
    course: {
        id: number;
        name: string;
        code: string;
    };
    major: string | null;
    status: string;
    created_at: string;
}

interface ApplicationWindow {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    is_historical?: boolean;
    view_url?: string | null;
}

interface PaginatedApplications {
    data: Application[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links?: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface WindowStats {
    attendance: {
        attending: number;
        not_attending: number;
    };
    departments: Array<{
        code: string;
        name: string;
        total: number;
    }>;
    programs: Array<{
        code: string;
        name: string;
        total: number;
    }>;
    majors: Array<{
        code: string;
        name: string;
        total: number;
    }>;
    nationalities: Array<{
        nationality: string;
        total: number;
    }>;
    hierarchical?: Array<{
        name: string;
        total: number;
        attendance: {
            attending: number;
            not_attending: number;
        };
        nationalities: Array<{
            nationality: string;
            count: number;
        }>;
        programs: Array<{
            name: string;
            total: number;
            attendance: {
                attending: number;
                not_attending: number;
            };
            nationalities: Array<{
                nationality: string;
                count: number;
            }>;
            majors: Array<{
                name: string;
                total: number;
                attendance: {
                    attending: number;
                    not_attending: number;
                };
                nationalities: Array<{
                    nationality: string;
                    count: number;
                }>;
            }>;
        }>;
    }>;
    status_counts?: {
        all: number;
        submitted: number;
        pending: number;
        approved: number;
        incomplete: number;
    };
}

interface ShowWindowProps {
    window: ApplicationWindow;
    applications: PaginatedApplications;
    stats: WindowStats;
    unverifiedApplications?: WindowApplicationReviewRecord[];
    duplicatePairs?: WindowApplicationDuplicatePair[];
    filters?: {
        search?: string;
        status?: string;
    };
}

export default function CoordinatorWindowShow({
    window,
    applications,
    stats,
    unverifiedApplications = [],
    duplicatePairs = [],
    filters = {},
}: ShowWindowProps) {
    // Ensure we have valid data structures
    const safeApplications: PaginatedApplications =
        applications &&
        typeof applications === 'object' &&
        'data' in applications
            ? {
                  data: applications.data || [],
                  current_page: applications.current_page || 1,
                  last_page: applications.last_page || 1,
                  per_page: applications.per_page || 20,
                  total: applications.total || 0,
                  from: applications.from ?? null,
                  to: applications.to ?? null,
                  links: applications.links || [],
              }
            : {
                  data: [],
                  current_page: 1,
                  last_page: 1,
                  per_page: 20,
                  total: 0,
                  from: null,
                  to: null,
              };

    const safeStats = stats || {
        attendance: { attending: 0, not_attending: 0 },
        departments: [],
        programs: [],
        majors: [],
        nationalities: [],
        hierarchical: [],
        status_counts: {
            all: 0,
            submitted: 0,
            pending: 0,
            approved: 0,
            incomplete: 0,
        },
    };

    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [selectedDepartmentId, setSelectedDepartmentId] =
        useState<string>('all');

    // Add safety checks to prevent white screen
    if (!window) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Loading..." />
                <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading application window...
                    </div>
                </div>
            </AppLayout>
        );
    }

    const isHistorical = Boolean(window?.is_historical);
    const windowShowUrl =
        isHistorical && window?.view_url
            ? window.view_url
            : coordinatorRoutes.windows.show(window.id).url;

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (!window) return;
        router.get(
            windowShowUrl,
            {
                search: value || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleStatusChange = (status: string) => {
        setStatusFilter(status);
        if (!window) return;
        router.get(
            windowShowUrl,
            {
                search: searchQuery || undefined,
                status: status !== 'all' ? status : undefined,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handlePageChange = (page: number) => {
        if (!window) return;
        router.get(
            windowShowUrl,
            {
                search: searchQuery || undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const now = new Date();
    const startDate = new Date(window.start_date);
    const endDate = new Date(window.end_date);

    const getStatus = () => {
        if (now < startDate)
            return {
                label: 'Upcoming',
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            };
        if (now > endDate)
            return {
                label: 'Ended',
                color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
            };
        return {
            label: 'Active',
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
    };

    const status = getStatus();

    const totalApplications =
        safeStats.status_counts?.all ?? safeApplications.total;
    const submittedApplications =
        safeStats.status_counts?.submitted ??
        safeApplications.data.filter((app) => app.status === 'submitted')
            .length;
    const pendingApplications =
        safeStats.status_counts?.pending ??
        safeApplications.data.filter((app) => app.status === 'pending').length;
    const approvedApplications =
        safeStats.status_counts?.approved ??
        safeApplications.data.filter((app) => app.status === 'approved').length;
    const incompleteApplications =
        safeStats.status_counts?.incomplete ??
        safeApplications.data.filter((app) => app.status === 'incomplete')
            .length;

    const renderApplicationsTable = () => {
        if (safeApplications.data.length === 0) {
            return (
                <div className="py-8 text-center text-sm text-muted-foreground">
                    No applications found for this filter.
                </div>
            );
        }

        return (
            <>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Student
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Department
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Course
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Submitted
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {safeApplications.data.map((application) => (
                                <tr
                                    key={application.id}
                                    className="border-b transition-colors hover:bg-muted/50"
                                >
                                    <td className="px-4 py-3">
                                        <ApplicationApplicantCell
                                            name={application.user.name}
                                            studentId={
                                                application.user.student_id
                                            }
                                            profile={application.user.profile}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm">
                                            {application.department?.code ||
                                                application.department?.name ||
                                                'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="text-sm">
                                                {application.course?.name ||
                                                    'N/A'}
                                            </span>
                                            {application.major && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Major: {application.major}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                staffStatusClass[
                                                    application.status
                                                ] ?? ''
                                            }
                                        >
                                            {headline(application.status)}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(
                                                application.created_at,
                                            ).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2 text-xs"
                                            >
                                                <Link
                                                    href={
                                                        application.detail_url
                                                            ? application.detail_url
                                                            : coordinatorRoutes.applications.show(
                                                                  {
                                                                      application:
                                                                          application.application_number,
                                                                  },
                                                              ).url
                                                    }
                                                >
                                                    <Eye className="size-3.5" />
                                                    View
                                                </Link>
                                            </Button>
                                            {application.status ===
                                                'approved' &&
                                                (() => {
                                                    const downloadUrl =
                                                        application.download_url
                                                            ? application.download_url
                                                            : application.is_historical
                                                              ? null
                                                              : coordinatorRoutes.applications.download(
                                                                    {
                                                                        application:
                                                                            application.application_number,
                                                                    },
                                                                ).url;

                                                    return downloadUrl ? (
                                                        <DownloadFormButton
                                                            href={downloadUrl}
                                                            className="h-8 px-2 text-xs"
                                                            showText
                                                            label="PDF"
                                                        />
                                                    ) : null;
                                                })()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {safeApplications.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <div>
                            Showing {safeApplications.from} –{' '}
                            {safeApplications.to} of {safeApplications.total}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={safeApplications.current_page === 1}
                                onClick={() =>
                                    handlePageChange(
                                        safeApplications.current_page - 1,
                                    )
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    safeApplications.current_page ===
                                    safeApplications.last_page
                                }
                                onClick={() =>
                                    handlePageChange(
                                        safeApplications.current_page + 1,
                                    )
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </>
        );
    };

    const uniqueDepartments = Array.from(
        new Map(
            (safeStats.departments || []).map((dept) => [
                dept.code,
                {
                    id: dept.code,
                    name: dept.code || dept.name,
                },
            ]),
        ).values(),
    );

    const handleExport = () => {
        const params = new URLSearchParams();
        params.set('window_id', window.id.toString());
        if (selectedDepartmentId !== 'all') {
            params.set('department', selectedDepartmentId);
        }
        const query = params.toString();
        const url = `${coordinatorRoutes.applications.export().url}?${query}`;
        globalThis.location.href = url;
        setExportDialogOpen(false);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Window: ${window.title}`} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link
                                href={
                                    coordinatorRoutes.applications.index().url
                                }
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {window.title}
                            </h1>
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                    {startDate.toLocaleDateString()} –{' '}
                                    {endDate.toLocaleDateString()}
                                </span>
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                                >
                                    {status.label}
                                </span>
                            </p>
                        </div>
                    </div>
                    {!isHistorical ? (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setExportDialogOpen(true)}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Excel
                            </Button>
                        </div>
                    ) : null}
                </div>
                <Dialog
                    open={exportDialogOpen}
                    onOpenChange={setExportDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Export graduate list</DialogTitle>
                            <DialogDescription>
                                Choose which assigned department to include in
                                the normalized Excel file.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="department-filter">
                                    Department
                                </Label>
                                <select
                                    id="department-filter"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    value={selectedDepartmentId}
                                    onChange={(e) =>
                                        setSelectedDepartmentId(e.target.value)
                                    }
                                    aria-label="Department filter"
                                >
                                    <option value="all">All departments</option>
                                    {uniqueDepartments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setExportDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleExport}>Export</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <WindowApplicationReviewTabs
                    applicationsCount={totalApplications}
                    unverifiedApplications={unverifiedApplications}
                    duplicatePairs={duplicatePairs}
                    duplicateAlertUrl={`/coordinator/windows/${window.id}/duplicates/alert`}
                    duplicateDeleteUrl={`/coordinator/windows/${window.id}/duplicates`}
                    verifyDraftUrl={(draft) =>
                        `/coordinator/manual-verification/${draft.id}/verify`
                    }
                >
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Applications</CardTitle>
                                        <CardDescription>
                                            {totalApplications} application
                                            {totalApplications !== 1
                                                ? 's'
                                                : ''}{' '}
                                            total
                                            {!isHistorical
                                                ? ' (limited to your assigned departments)'
                                                : ''}
                                        </CardDescription>
                                    </div>
                                    <div className="w-full max-w-sm">
                                        <div className="relative">
                                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Search by name, student ID, email, department, or course..."
                                                value={searchQuery}
                                                onChange={(e) =>
                                                    handleSearch(e.target.value)
                                                }
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs
                                    value={statusFilter}
                                    onValueChange={handleStatusChange}
                                    className="w-full"
                                >
                                    <TabsList className="grid w-full grid-cols-5">
                                        <TabsTrigger value="submitted">
                                            Submitted ({submittedApplications})
                                        </TabsTrigger>
                                        <TabsTrigger value="pending">
                                            Pending ({pendingApplications})
                                        </TabsTrigger>
                                        <TabsTrigger value="approved">
                                            Approved ({approvedApplications})
                                        </TabsTrigger>
                                        <TabsTrigger value="incomplete">
                                            Incomplete ({incompleteApplications}
                                            )
                                        </TabsTrigger>
                                        <TabsTrigger value="all">
                                            All ({totalApplications})
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="submitted"
                                        className="mt-4"
                                    >
                                        {renderApplicationsTable()}
                                    </TabsContent>
                                    <TabsContent
                                        value="pending"
                                        className="mt-4"
                                    >
                                        {renderApplicationsTable()}
                                    </TabsContent>
                                    <TabsContent
                                        value="approved"
                                        className="mt-4"
                                    >
                                        {renderApplicationsTable()}
                                    </TabsContent>
                                    <TabsContent
                                        value="incomplete"
                                        className="mt-4"
                                    >
                                        {renderApplicationsTable()}
                                    </TabsContent>
                                    <TabsContent value="all" className="mt-4">
                                        {renderApplicationsTable()}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Total by Department, Program & Major */}
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <CardTitle>
                                            Total by Department, Program & Major
                                        </CardTitle>
                                        <CardDescription>
                                            Hierarchical breakdown of
                                            applications by department,
                                            program/course, and major with
                                            attendance and nationality
                                            statistics
                                            {!isHistorical
                                                ? ' (your departments only)'
                                                : ''}
                                        </CardDescription>
                                    </div>
                                    {!isHistorical ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={
                                                        coordinatorRoutes.windows.exportStatisticsPdf(
                                                            {
                                                                window: window.id,
                                                            },
                                                        ).url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Summary PDF
                                                </a>
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {(safeStats.hierarchical || []).length > 0 ? (
                                    <div className="space-y-4">
                                        {(safeStats.hierarchical || []).map(
                                            (dept, deptIndex) => (
                                                <div
                                                    key={deptIndex}
                                                    className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                                                >
                                                    <div className="mb-3 flex items-center justify-between border-b pb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                            <span className="text-base font-semibold">
                                                                {dept.name}
                                                            </span>
                                                        </div>
                                                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                            Total: {dept.total}
                                                        </Badge>
                                                    </div>

                                                    {/* Department Stats Grid */}
                                                    <div className="mb-4 grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-3 md:grid-cols-3">
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-medium text-muted-foreground">
                                                                Attendance
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                    Attending:{' '}
                                                                    {dept
                                                                        .attendance
                                                                        ?.attending ||
                                                                        0}
                                                                </Badge>
                                                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                                    Not
                                                                    Attending:{' '}
                                                                    {dept
                                                                        .attendance
                                                                        ?.not_attending ||
                                                                        0}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 md:col-span-2">
                                                            <p className="text-xs font-medium text-muted-foreground">
                                                                Nationalities
                                                            </p>
                                                            <NationalitySummary
                                                                nationalities={
                                                                    dept.nationalities ||
                                                                    []
                                                                }
                                                            />
                                                        </div>
                                                    </div>

                                                    {dept.programs &&
                                                        dept.programs.length >
                                                            0 && (
                                                            <div className="ml-2 space-y-3">
                                                                {dept.programs.map(
                                                                    (
                                                                        program,
                                                                        programIndex,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                programIndex
                                                                            }
                                                                            className="space-y-2"
                                                                        >
                                                                            <div className="mb-2 flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                                                                    <span className="text-sm font-medium text-foreground">
                                                                                        {
                                                                                            program.name
                                                                                        }
                                                                                    </span>
                                                                                    <Badge
                                                                                        variant="outline"
                                                                                        className="text-xs"
                                                                                    >
                                                                                        Total:{' '}
                                                                                        {
                                                                                            program.total
                                                                                        }
                                                                                    </Badge>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="flex gap-1.5">
                                                                                        <Badge className="bg-green-100 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                                            Attending:{' '}
                                                                                            {program
                                                                                                .attendance
                                                                                                ?.attending ||
                                                                                                0}
                                                                                        </Badge>
                                                                                        <Badge className="bg-red-100 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">
                                                                                            Not
                                                                                            Attending:{' '}
                                                                                            {program
                                                                                                .attendance
                                                                                                ?.not_attending ||
                                                                                                0}
                                                                                        </Badge>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mb-2 ml-4">
                                                                                <NationalitySummary
                                                                                    nationalities={
                                                                                        program.nationalities ||
                                                                                        []
                                                                                    }
                                                                                    compact
                                                                                />
                                                                            </div>
                                                                            {program.majors &&
                                                                                program
                                                                                    .majors
                                                                                    .length >
                                                                                    0 &&
                                                                                program.majors.some(
                                                                                    (
                                                                                        m,
                                                                                    ) =>
                                                                                        m.name !==
                                                                                        'N/A',
                                                                                ) && (
                                                                                    <div className="ml-4 space-y-1.5 border-l-2 border-muted pl-3">
                                                                                        {program.majors
                                                                                            .filter(
                                                                                                (
                                                                                                    m,
                                                                                                ) =>
                                                                                                    m.name !==
                                                                                                    'N/A',
                                                                                            )
                                                                                            .map(
                                                                                                (
                                                                                                    major,
                                                                                                    majorIndex,
                                                                                                ) => (
                                                                                                    <div
                                                                                                        key={
                                                                                                            majorIndex
                                                                                                        }
                                                                                                        className="flex items-center justify-between py-1"
                                                                                                    >
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <div className="h-1 w-1 rounded-full bg-green-500" />
                                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                                {
                                                                                                                    major.name
                                                                                                                }
                                                                                                            </span>
                                                                                                            <Badge
                                                                                                                variant="outline"
                                                                                                                className="text-xs"
                                                                                                            >
                                                                                                                Total:{' '}
                                                                                                                {
                                                                                                                    major.total
                                                                                                                }
                                                                                                            </Badge>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="text-xs text-green-600">
                                                                                                                Attending:{' '}
                                                                                                                {major
                                                                                                                    .attendance
                                                                                                                    ?.attending ||
                                                                                                                    0}
                                                                                                            </span>
                                                                                                            <span className="text-xs text-red-600">
                                                                                                                Not
                                                                                                                Attending:{' '}
                                                                                                                {major
                                                                                                                    .attendance
                                                                                                                    ?.not_attending ||
                                                                                                                    0}
                                                                                                            </span>
                                                                                                            <NationalitySummary
                                                                                                                nationalities={
                                                                                                                    major.nationalities ||
                                                                                                                    []
                                                                                                                }
                                                                                                                inline
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ),
                                                                                            )}
                                                                                    </div>
                                                                                )}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Fallback: Department Totals */}
                                        {(safeStats.departments || []).length >
                                            0 && (
                                            <div>
                                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                                    Departments
                                                </h3>
                                                <div className="space-y-2">
                                                    {(
                                                        safeStats.departments ||
                                                        []
                                                    ).map((dept) => (
                                                        <div
                                                            key={dept.code}
                                                            className="flex items-center justify-between rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                                <span className="text-sm font-medium">
                                                                    {dept.code ||
                                                                        dept.name}
                                                                </span>
                                                            </div>
                                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                {dept.total}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Fallback: Program Totals */}
                                        {(safeStats.programs || []).length >
                                            0 && (
                                            <div>
                                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                                    Programs/Courses
                                                </h3>
                                                <div className="space-y-2">
                                                    {(
                                                        safeStats.programs || []
                                                    ).map((program) => (
                                                        <div
                                                            key={program.code}
                                                            className="flex items-center justify-between rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                                                <span className="text-sm font-medium">
                                                                    {
                                                                        program.code
                                                                    }{' '}
                                                                    -{' '}
                                                                    {
                                                                        program.name
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                                                {program.total}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Fallback: Major Totals */}
                                        {(safeStats.majors || []).length >
                                            0 && (
                                            <div>
                                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                                    Majors
                                                </h3>
                                                <div className="space-y-2">
                                                    {(
                                                        safeStats.majors || []
                                                    ).map((major) => (
                                                        <div
                                                            key={major.code}
                                                            className="flex items-center justify-between rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                                <span className="text-sm font-medium">
                                                                    {major.code}{' '}
                                                                    -{' '}
                                                                    {major.name}
                                                                </span>
                                                            </div>
                                                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                {major.total}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!safeStats.departments?.length &&
                                            !safeStats.programs?.length &&
                                            !safeStats.majors?.length && (
                                                <p className="py-8 text-center text-sm text-muted-foreground">
                                                    No data available.
                                                </p>
                                            )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </WindowApplicationReviewTabs>
            </div>
        </AppLayout>
    );
}
