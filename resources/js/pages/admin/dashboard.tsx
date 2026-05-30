import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    Clock,
    Download,
    FileText,
    Plus,
    ShieldCheck,
} from 'lucide-react';
import { KeyboardEvent, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
];

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

interface AdminDashboardProps {
    stats: {
        total_applications: number;
        pending_applications: number;
        approved_applications: number;
        incomplete_applications: number;
        rejected_applications: number;
        applications_today: number;
        applications_this_week: number;
        current_window_applications: number;
        current_window: {
            id: number;
            title: string;
            start_date: string;
            end_date: string;
        } | null;
        total_students: number;
        total_coordinators: number;
        total_departments: number;
        manual_verification_drafts: number;
    };
    newApplicants: Applicant[];
    notifications: Notification[];
    unreadNotificationCount: number;
}

export default function AdminDashboard({
    stats,
    newApplicants,
    notifications,
}: AdminDashboardProps) {
    useEffect(() => {
        const refresh = () => {
            router.reload({
                only: [
                    'stats',
                    'newApplicants',
                    'notifications',
                    'unreadNotificationCount',
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Graduation application operations overview
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stats.current_window && (
                            <Button asChild variant="outline">
                                <a
                                    href={
                                        adminRoutes.windows.export({
                                            window: stats.current_window.id,
                                        }).url
                                    }
                                >
                                    <Download className="h-4 w-4" />
                                    Export Excel
                                </a>
                            </Button>
                        )}
                        <Button asChild>
                            <Link href={adminRoutes.windows.create().url}>
                                <Plus className="h-4 w-4" />
                                Create Window
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        icon={FileText}
                        label="Current Window"
                        value={stats.current_window_applications}
                        description={
                            stats.current_window?.title ??
                            'All application windows'
                        }
                    />
                    <MetricCard
                        icon={Clock}
                        label="Needs Review"
                        value={stats.pending_applications}
                        description="Submitted or pending applications"
                    />
                    <MetricCard
                        icon={AlertCircle}
                        label="Incomplete"
                        value={stats.incomplete_applications}
                        description="Returned for corrections"
                    />
                    <MetricCard
                        icon={ShieldCheck}
                        label="Manual Verification"
                        value={stats.manual_verification_drafts}
                        description="Guest drafts pending"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Newest Applicants</CardTitle>
                            <CardDescription>
                                Latest applications for the active window
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
                                                        <div className="min-w-0">
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
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <div className="min-w-0">
                                                            <p className="truncate">
                                                                {applicant.course_name ??
                                                                    'No course'}
                                                            </p>
                                                            <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                                                {applicant.department_code ??
                                                                    'N/A'}
                                                            </p>
                                                        </div>
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
                                    message="No applicants for the current scope."
                                />
                            )}
                        </CardContent>
                    </Card>

                    <RecentRequirementUploads
                        notifications={notifications}
                        formatTimeAgo={formatTimeAgo}
                        applicationUrl={(applicationNumber) =>
                            adminRoutes.applications.show(applicationNumber).url
                        }
                        openApplication={openApplication}
                        openApplicationFromKeyboard={
                            openApplicationFromKeyboard
                        }
                    />
                </div>
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
                    Unread document uploads from applicants
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
