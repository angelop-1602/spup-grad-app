import adminRoutes from '@/routes/admin';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Activity,
    Calendar,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
];

interface Notification {
    id: string;
    type: string;
    student_name: string;
    student_avatar: string | null;
    student_id: string;
    requirement_label: string;
    application_number: string;
    upload_count?: number;
    course_name: string;
    created_at: string;
    read_at: string | null;
}

interface AdminDashboardProps {
    stats: {
        total_applications: number;
        pending_applications: number;
        approved_applications: number;
        rejected_applications: number;
        current_window: {
            id: number;
            title: string;
            start_date: string;
            end_date: string;
        } | null;
        total_students: number;
        total_coordinators: number;
        total_departments: number;
    };
    recentActivities: Array<{
        type: string;
        title: string;
        description: string;
        time: string;
        url: string;
    }>;
    notifications: Notification[];
    unreadNotificationCount: number;
}

export default function AdminDashboard({ stats, recentActivities, notifications, unreadNotificationCount }: AdminDashboardProps) {
    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }

        return then.toLocaleDateString();
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'application_submitted':
                return FileText;
            case 'window_created':
                return Calendar;
        case 'coordinator_action':
            return CheckCircle2;
            default:
                return Activity;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                        <p className="text-muted-foreground">
                            Overview of the graduation application system
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

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Recent Activity
                        </CardTitle>
                        <CardDescription>
                            Latest system activities and updates
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentActivities.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Activity
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Time
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentActivities.map((activity, index) => {
                                            const Icon = getActivityIcon(activity.type);
                                            return (
                                                <tr
                                                    key={index}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center">
                                                            <div className="rounded-full bg-muted p-2">
                                                                <Icon className="h-4 w-4" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm font-medium">
                                                            {activity.title}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm text-muted-foreground">
                                                            {activity.description}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-muted-foreground">
                                                            {formatTimeAgo(activity.time)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Link
                                                            href={activity.url}
                                                            className="text-sm text-primary hover:underline"
                                                        >
                                                            View →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No recent activity
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
