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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { formatName } from '@/utils/format-name';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    Bell,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    MoreVertical,
    Search,
} from 'lucide-react';
import { useState } from 'react';

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
    course_name: string | null;
    major: string | null;
    status: string;
    window_title: string | null;
    submitted_at: string | null;
    show_url: string;
}

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
            return <Badge variant="secondary">Approved</Badge>;
        }

        if (status === 'incomplete') {
            return <Badge variant="outline">Incomplete</Badge>;
        }

        return (
            <Badge>{status === 'submitted' ? 'Submitted' : 'Pending'}</Badge>
        );
    };

    const renderApplicationsTable = (apps: Application[]) => {
        if (apps.length === 0) {
            return (
                <EmptyState icon={FileText} message="No applications found" />
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Student
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Course / Major
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                Submitted
                            </th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {apps.map((application) => (
                            <tr
                                key={application.id}
                                className="border-b transition-colors hover:bg-muted/50"
                            >
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {formatName(
                                                application.user.profile
                                                    ?.first_name,
                                                application.user.profile
                                                    ?.last_name,
                                                application.user.profile
                                                    ?.middle_name,
                                            )}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {application.user.student_id} -{' '}
                                            {application.application_number}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span>{application.course.name}</span>
                                        {application.major && (
                                            <span className="text-sm text-muted-foreground">
                                                {application.major}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {statusBadge(application.status)}
                                </td>
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {formatTimeAgo(application.created_at)}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                                <span className="sr-only">
                                                    Open menu
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={
                                                        coordinatorRoutes.applications.show(
                                                            application.application_number,
                                                        ).url
                                                    }
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                    <div className="flex flex-wrap gap-2">
                        {coordinator.departments.map((department) => (
                            <Badge key={department.id} variant="outline">
                                {department.name}
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
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm">
                                                            {applicant.course_name ??
                                                                'No course'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {applicant.department_name ??
                                                                'No department'}
                                                        </p>
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
                                    message="No assigned applicants for the current scope."
                                />
                            )}
                        </CardContent>
                    </Card>

                    <RecentRequirementUploads
                        notifications={notifications}
                        formatTimeAgo={formatTimeAgo}
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
}: {
    notifications: Notification[];
    formatTimeAgo: (date: string | null) => string;
}) {
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
