import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { formatName } from '@/utils/format-name';
import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Search,
} from 'lucide-react';
import { KeyboardEvent, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Coordinator Dashboard',
        href: coordinatorRoutes.dashboard().url,
    },
];

interface Application {
    id: number;
    application_number: string;
    user: {
        id: number;
        student_id: string;
        email?: string | null;
        profile: {
            first_name: string;
            last_name: string;
            middle_name: string | null;
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
    };
    major: string | null;
    status: string;
    created_at: string;
}

interface Applicant {
    id: number;
    application_number: string;
    student_name: string;
    student_id: string | null;
    email: string | null;
    department_name: string | null;
    department_code: string | null;
    course_name: string | null;
    major: string | null;
    status: string;
    window_title: string | null;
    submitted_at: string | null;
    show_url: string;
}

interface Notification {
    id: string;
    type?: string;
    student_name: string;
    student_id: string;
    requirement_label: string;
    application_number: string;
    upload_count?: number;
    course_name: string;
    department_code?: string;
    created_at: string;
}

interface ApplicationWindow {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
}

interface Coordinator {
    id: number;
    name: string;
    email: string;
    departments: Array<{
        id: number;
        name: string;
        code: string;
    }>;
}

interface CoordinatorDashboardProps {
    currentWindow: ApplicationWindow | null;
    applications: {
        pending: Application[];
        approved: Application[];
        revision: Application[];
        rejected: Application[];
    };
    dashboardStats: {
        total: number;
        pending: number;
        approved: number;
        incomplete: number;
        new_today: number;
        new_this_week: number;
        assigned_departments: number;
    };
    newApplicants: Applicant[];
    notifications: Notification[];
    search: string;
    coordinator: Coordinator;
}

export default function CoordinatorDashboard({
    currentWindow,
    applications,
    dashboardStats,
    newApplicants,
    notifications,
    search: initialSearch,
    coordinator,
}: CoordinatorDashboardProps) {
    const [search, setSearch] = useState(initialSearch);

    useEffect(() => {
        const refresh = () => {
            router.reload({
                only: [
                    'currentWindow',
                    'applications',
                    'dashboardStats',
                    'newApplicants',
                    'notifications',
                    'unreadNotificationCount',
                    'coordinator',
                ],
            });
        };

        const intervalId = window.setInterval(refresh, 5000);
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refresh();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(coordinatorRoutes.dashboard().url, {
            search: search || undefined,
        });
    };

    const formatTimeAgo = (date: string | null) => {
        if (!date) {
            return 'Unknown';
        }

        const now = new Date();
        const then = new Date(date);
        const diffInSeconds = Math.floor(
            (now.getTime() - then.getTime()) / 1000,
        );

        if (diffInSeconds < 60) {
            return 'Just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        }

        return then.toLocaleDateString();
    };

    const statusBadge = (status: string) => {
        if (status === 'approved') {
            return (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    Approved
                </Badge>
            );
        }

        if (status === 'incomplete') {
            return (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    Incomplete
                </Badge>
            );
        }

        return (
            <Badge className="px-1.5 py-0 text-[10px]">
                {status === 'submitted' ? 'Submitted' : 'Pending'}
            </Badge>
        );
    };

    const applicationUrl = (applicationNumber: string) =>
        coordinatorRoutes.applications.show(applicationNumber).url;

    const openApplication = (url: string) => {
        router.visit(url);
    };

    const openApplicationFromKeyboard = (
        event: KeyboardEvent<HTMLTableRowElement>,
        url: string,
    ) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openApplication(url);
        }
    };

    const renderApplicationsTable = (apps: Application[]) => {
        if (apps.length === 0) {
            return (
                <EmptyState icon={FileText} message="No applications found" />
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full table-fixed text-xs">
                    <thead>
                        <tr className="border-b">
                            <th className="w-[32%] px-3 py-2 text-left font-medium text-muted-foreground">
                                Student
                            </th>
                            <th className="w-[35%] px-3 py-2 text-left font-medium text-muted-foreground">
                                Program
                            </th>
                            <th className="w-[17%] px-3 py-2 text-left font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="w-[16%] px-3 py-2 text-left font-medium text-muted-foreground">
                                Submitted
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {apps.map((application) => (
                            <tr
                                key={application.id}
                                role="link"
                                tabIndex={0}
                                aria-label={`Open ${application.application_number}`}
                                onClick={() =>
                                    openApplication(
                                        applicationUrl(
                                            application.application_number,
                                        ),
                                    )
                                }
                                onKeyDown={(event) =>
                                    openApplicationFromKeyboard(
                                        event,
                                        applicationUrl(
                                            application.application_number,
                                        ),
                                    )
                                }
                                className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                            >
                                <td className="px-3 py-2 align-top">
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate font-medium">
                                            {formatName(
                                                application.user.profile
                                                    ?.first_name,
                                                application.user.profile
                                                    ?.last_name,
                                                application.user.profile
                                                    ?.middle_name,
                                            )}
                                        </span>
                                        <span className="truncate text-[11px] text-muted-foreground">
                                            {application.user.student_id} -{' '}
                                            {application.application_number}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 align-top">
                                    <div className="flex min-w-0 flex-col">
                                        <span className="truncate">
                                            {application.course.name}
                                        </span>
                                        {application.major && (
                                            <span className="truncate text-[11px] text-muted-foreground">
                                                {application.major}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            {application.department.code}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-3 py-2 align-top">
                                    {statusBadge(application.status)}
                                </td>
                                <td className="px-3 py-2 align-top text-muted-foreground">
                                    {formatTimeAgo(application.created_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coordinator Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Coordinator Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Welcome back, {coordinator.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {currentWindow && (
                            <Button asChild variant="outline">
                                <a
                                    href={
                                        coordinatorRoutes.applications.export({
                                            query: {
                                                window_id: currentWindow.id,
                                                search: search || undefined,
                                            },
                                        }).url
                                    }
                                >
                                    <Download className="h-4 w-4" />
                                    Export Excel
                                </a>
                            </Button>
                        )}
                        {coordinator.departments.map((department) => (
                            <Badge key={department.id} variant="outline">
                                {department.code}
                            </Badge>
                        ))}
                    </div>
                </div>

                {!currentWindow && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                        <CardHeader>
                            <CardTitle>No Active Window</CardTitle>
                            <CardDescription>
                                There is currently no active application window.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={FileText}
                        label="Assigned Applications"
                        value={dashboardStats.total}
                        description={currentWindow?.title ?? 'All windows'}
                    />
                    <MetricCard
                        icon={Clock}
                        label="Needs Review"
                        value={dashboardStats.pending}
                        description="Submitted or pending"
                    />
                    <MetricCard
                        icon={AlertCircle}
                        label="Incomplete"
                        value={dashboardStats.incomplete}
                        description="Returned for corrections"
                    />
                    <MetricCard
                        icon={CheckCircle2}
                        label="Approved"
                        value={dashboardStats.approved}
                        description="Ready for final listing"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Newest Assigned Applicants</CardTitle>
                            <CardDescription>
                                Latest applicants from your departments
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {newApplicants.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full table-fixed text-xs">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="w-[34%] px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Applicant
                                                </th>
                                                <th className="w-[33%] px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Program
                                                </th>
                                                <th className="w-[17%] px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Status
                                                </th>
                                                <th className="w-[16%] px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Submitted
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newApplicants.map((applicant) => (
                                                <tr
                                                    key={applicant.id}
                                                    role="link"
                                                    tabIndex={0}
                                                    aria-label={`Open ${applicant.application_number}`}
                                                    onClick={() =>
                                                        openApplication(
                                                            applicant.show_url,
                                                        )
                                                    }
                                                    onKeyDown={(event) =>
                                                        openApplicationFromKeyboard(
                                                            event,
                                                            applicant.show_url,
                                                        )
                                                    }
                                                    className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                                                >
                                                    <td className="px-3 py-2 align-top">
                                                        <p className="truncate font-medium">
                                                            {
                                                                applicant.student_name
                                                            }
                                                        </p>
                                                        <p className="truncate text-[11px] text-muted-foreground">
                                                            {
                                                                applicant.student_id
                                                            }{' '}
                                                            -{' '}
                                                            {
                                                                applicant.application_number
                                                            }
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <p className="truncate">
                                                            {applicant.course_name ??
                                                                'No course'}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-muted-foreground">
                                                            {applicant.department_code ??
                                                                'N/A'}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        {statusBadge(
                                                            applicant.status,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-muted-foreground">
                                                        {formatTimeAgo(
                                                            applicant.submitted_at,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={FileText}
                                    message="No assigned applicants for the current scope."
                                />
                            )}
                        </CardContent>
                    </Card>

                    <RecentRequirementUploads
                        notifications={notifications}
                        formatTimeAgo={formatTimeAgo}
                        applicationUrl={applicationUrl}
                        openApplication={openApplication}
                        openApplicationFromKeyboard={
                            openApplicationFromKeyboard
                        }
                    />
                </div>

                {currentWindow && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <CardTitle>Review Queue</CardTitle>
                                    <CardDescription>
                                        Applications from your assigned
                                        departments
                                    </CardDescription>
                                </div>
                                <form
                                    onSubmit={handleSearch}
                                    className="flex w-full gap-2 lg:w-auto"
                                >
                                    <Input
                                        type="text"
                                        placeholder="Search by name or student ID..."
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        className="lg:w-72"
                                    />
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="pending">
                                <TabsList>
                                    <TabsTrigger value="pending">
                                        Pending ({applications.pending.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="approved">
                                        Approved ({applications.approved.length}
                                        )
                                    </TabsTrigger>
                                    <TabsTrigger value="revision">
                                        Incomplete (
                                        {applications.revision.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="pending" className="mt-4">
                                    {renderApplicationsTable(
                                        applications.pending,
                                    )}
                                </TabsContent>

                                <TabsContent value="approved" className="mt-4">
                                    {renderApplicationsTable(
                                        applications.approved,
                                    )}
                                </TabsContent>

                                <TabsContent value="revision" className="mt-4">
                                    {renderApplicationsTable(
                                        applications.revision,
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    description,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    description: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold">{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

function RecentRequirementUploads({
    notifications,
    formatTimeAgo,
    applicationUrl,
    openApplication,
    openApplicationFromKeyboard,
}: {
    notifications: Notification[];
    formatTimeAgo: (date: string | null) => string;
    applicationUrl: (applicationNumber: string) => string;
    openApplication: (url: string) => void;
    openApplicationFromKeyboard: (
        event: KeyboardEvent<HTMLTableRowElement>,
        url: string,
    ) => void;
}) {
    const notificationLabel = (notification: Notification) =>
        notification.type === 'application_submitted'
            ? 'New application'
            : notification.requirement_label;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Requirement Uploads</CardTitle>
                <CardDescription>
                    Unread document uploads from assigned applicants
                </CardDescription>
            </CardHeader>
            <CardContent>
                {notifications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-xs">
                            <thead>
                                <tr className="border-b">
                                    <th className="w-[38%] px-3 py-2 text-left font-medium text-muted-foreground">
                                        Student
                                    </th>
                                    <th className="w-[45%] px-3 py-2 text-left font-medium text-muted-foreground">
                                        Requirement
                                    </th>
                                    <th className="w-[17%] px-3 py-2 text-left font-medium text-muted-foreground">
                                        Uploaded
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifications
                                    .slice(0, 8)
                                    .map((notification) => (
                                        <tr
                                            key={notification.id}
                                            role="link"
                                            tabIndex={0}
                                            aria-label={`Open ${notification.application_number}`}
                                            onClick={() =>
                                                openApplication(
                                                    applicationUrl(
                                                        notification.application_number,
                                                    ),
                                                )
                                            }
                                            onKeyDown={(event) =>
                                                openApplicationFromKeyboard(
                                                    event,
                                                    applicationUrl(
                                                        notification.application_number,
                                                    ),
                                                )
                                            }
                                            className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
                                        >
                                            <td className="px-3 py-2 align-top">
                                                <p className="truncate font-medium">
                                                    {notification.student_name}
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    {notification.student_id} -{' '}
                                                    {
                                                        notification.application_number
                                                    }
                                                </p>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <p className="truncate">
                                                    {notificationLabel(
                                                        notification,
                                                    )}
                                                    {(notification.upload_count ??
                                                        1) > 1 && (
                                                        <span className="ml-1 text-[11px] text-muted-foreground">
                                                            x
                                                            {
                                                                notification.upload_count
                                                            }
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="truncate text-[11px] text-muted-foreground">
                                                    {[
                                                        notification.department_code,
                                                        notification.course_name,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' - ')}
                                                </p>
                                            </td>
                                            <td className="px-3 py-2 align-top text-muted-foreground">
                                                {formatTimeAgo(
                                                    notification.created_at,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        icon={Bell}
                        message="No unread requirement uploads."
                    />
                )}
            </CardContent>
        </Card>
    );
}

function EmptyState({
    icon: Icon,
    message,
}: {
    icon: React.ComponentType<{ className?: string }>;
    message: string;
}) {
    return (
        <div className="py-8 text-center">
            <Icon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
