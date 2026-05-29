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
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Activity } from 'lucide-react';

interface AuditEvent {
    id: number;
    action_label: string;
    status: string;
    severity: string;
    actor_label: string | null;
    actor_guard: string | null;
    message: string | null;
    created_at: string | null;
    subject_label: string | null;
    subject_url: string | null;
}

interface PaginatedEvents {
    data: AuditEvent[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface AuditTrailProps {
    viewer: 'admin' | 'coordinator';
    events: PaginatedEvents;
}

export default function AuditTrailIndex({ viewer, events }: AuditTrailProps) {
    const dashboardHref =
        viewer === 'admin' ? '/admin/dashboard' : '/coordinator/dashboard';
    const auditHref =
        viewer === 'admin' ? '/admin/audit-trail' : '/coordinator/audit-trail';
    const dashboardTitle =
        viewer === 'admin' ? 'Admin Dashboard' : 'Coordinator Dashboard';

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: dashboardTitle,
            href: dashboardHref,
        },
        {
            title: 'Audit Trail',
            href: auditHref,
        },
    ];

    const formatDate = (date: string | null) => {
        if (!date) {
            return 'Unknown';
        }

        return new Date(date).toLocaleString();
    };

    const eventBadge = (event: AuditEvent) => {
        if (event.severity === 'error' || event.severity === 'critical') {
            return <Badge variant="destructive">{event.severity}</Badge>;
        }

        if (event.status === 'failed') {
            return <Badge variant="destructive">Failed</Badge>;
        }

        return <Badge variant="outline">{event.status}</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Trail" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Audit Trail
                    </h1>
                    <p className="text-muted-foreground">
                        Graduation application activity only
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Application Audit
                        </CardTitle>
                        <CardDescription>
                            {events.total} recorded application event
                            {events.total === 1 ? '' : 's'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {events.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Action
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Actor
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Application
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                    Date
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {events.data.map((event) => (
                                                <tr
                                                    key={event.id}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">
                                                            {event.action_label}
                                                        </p>
                                                        {event.message && (
                                                            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                                                                {event.message}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-sm">
                                                            {event.actor_label ??
                                                                'System'}
                                                        </p>
                                                        {event.actor_guard && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    event.actor_guard
                                                                }
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {event.subject_url &&
                                                        event.subject_label ? (
                                                            <Link
                                                                href={
                                                                    event.subject_url
                                                                }
                                                                className="text-sm font-medium text-primary hover:underline"
                                                            >
                                                                {
                                                                    event.subject_label
                                                                }
                                                            </Link>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">
                                                                Not linked
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {eventBadge(event)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {formatDate(
                                                            event.created_at,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {events.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                        <div>
                                            Page {events.current_page} of{' '}
                                            {events.last_page}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                disabled={!events.prev_page_url}
                                            >
                                                <Link
                                                    href={
                                                        events.prev_page_url ??
                                                        auditHref
                                                    }
                                                >
                                                    Previous
                                                </Link>
                                            </Button>
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                disabled={!events.next_page_url}
                                            >
                                                <Link
                                                    href={
                                                        events.next_page_url ??
                                                        auditHref
                                                    }
                                                >
                                                    Next
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">
                                    No audit events found
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Application actions will appear here after
                                    they are recorded.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
