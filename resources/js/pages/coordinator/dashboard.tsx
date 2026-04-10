import coordinatorRoutes from '@/routes/coordinator';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { Calendar, FileText, Search, Eye, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { formatName } from '@/utils/format-name';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    major: string;
    status: string;
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
        rejected: Application[]; // Kept for backward compatibility but will always be empty
    };
    search: string;
    coordinator: Coordinator;
}

export default function CoordinatorDashboard({
    currentWindow,
    applications,
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

    const renderApplicationsTable = (apps: Application[]) => {
        if (apps.length === 0) {
            return (
                <div className="py-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        No applications found
                    </p>
                </div>
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
                                                application.user.profile?.first_name,
                                                application.user.profile?.last_name,
                                                application.user.profile?.middle_name,
                                            )}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {application.user.student_id}
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
                                    {new Date(application.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                                <span className="sr-only">Open menu</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={coordinatorRoutes.applications.show(
                                                        application.application_number,
                                                    ).url}
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Coordinator Dashboard</h1>
                        <p className="text-muted-foreground">
                            Welcome back, {coordinator.name}
                        </p>
                    </div>
                </div>

                {/* Current Window Banner */}
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


                {/* Applications with Tabs */}
                {currentWindow && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Applications</CardTitle>
                                    <CardDescription>
                                        Review applications from your assigned departments
                                    </CardDescription>
                                </div>
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Search by name or student ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-64"
                                    />
                                    <Button type="submit" variant="outline" size="sm">
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
                                        Approved ({applications.approved.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="revision">
                                        Incomplete ({applications.revision.length})
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="pending" className="mt-4">
                                    {renderApplicationsTable(applications.pending)}
                                </TabsContent>

                                <TabsContent value="approved" className="mt-4">
                                    {renderApplicationsTable(applications.approved)}
                                </TabsContent>

                                <TabsContent value="revision" className="mt-4">
                                    {renderApplicationsTable(applications.revision)}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
