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
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    Calendar,
    Clock,
    FileText,
    ShieldCheck,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
];

interface Notification {
    id: string;
    student_name: string;
    student_id: string;
    requirement_label: string;
    application_number: string;
    upload_count?: number;
    course_name: string;
    created_at: string;
}

interface Applicant {
    id: number;
    application_number: string;
    student_name: string;
    student_id: string | null;
    email: string | null;
    department_name: string | null;
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
            return <Badge variant="secondary">Approved</Badge>;
        }

        if (status === 'incomplete') {
            return <Badge variant="outline">Incomplete</Badge>;
        }

        return (
            <Badge>{status === 'submitted' ? 'Submitted' : 'Pending'}</Badge>
        );
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
                    {!stats.current_window && (
                        <Button asChild>
                            <Link href={adminRoutes.windows.create().url}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Create Window
                            </Link>
                        </Button>
                    )}
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
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Applicant
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Program
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Submitted
                                                </th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newApplicants.map((applicant) => (
                                                <tr
                                                    key={applicant.id}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium">
                                                                {
                                                                    applicant.student_name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
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
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="text-sm">
                                                                {applicant.course_name ??
                                                                    'No course'}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {applicant.department_name ??
                                                                    'No department'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {statusBadge(
                                                            applicant.status,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {formatTimeAgo(
                                                            applicant.submitted_at,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <Link
                                                                href={
                                                                    applicant.show_url
                                                                }
                                                            >
                                                                Open
                                                            </Link>
                                                        </Button>
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
}: {
    notifications: Notification[];
    formatTimeAgo: (date: string | null) => string;
}) {
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
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        Student
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                        Requirement
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
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
                                            className="border-b transition-colors hover:bg-muted/50"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium">
                                                    {notification.student_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {notification.student_id} -{' '}
                                                    {
                                                        notification.application_number
                                                    }
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm">
                                                    {
                                                        notification.requirement_label
                                                    }
                                                    {(notification.upload_count ??
                                                        1) > 1 && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            x
                                                            {
                                                                notification.upload_count
                                                            }
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {notification.course_name}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">
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
