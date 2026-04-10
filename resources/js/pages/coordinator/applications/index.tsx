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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Download, MoreVertical, Eye } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Coordinator Dashboard',
        href: coordinatorRoutes.dashboard().url,
    },
    {
        title: 'Application Windows',
        href: coordinatorRoutes.applications.index().url,
    },
];

interface ApplicationWindow {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    applications_count: number;
}

interface HistoricalWindow {
    key: string;
    batch: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    applications_count: number;
    is_historical: boolean;
    view_url: string;
}

interface WindowsIndexProps {
    windows: {
        data: ApplicationWindow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    historicalWindows: HistoricalWindow[];
}

export default function CoordinatorApplicationsIndex({ windows, historicalWindows }: WindowsIndexProps) {
    const totalWindows = windows.total + historicalWindows.length;
    const hasRows = windows.data.length > 0 || historicalWindows.length > 0;

    const getStatus = (startDateValue: string, endDateValue: string) => {
        const now = new Date();
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);

        if (now >= startDate && now <= endDate) {
            return {
                label: 'Active',
                color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            };
        }

        if (now < startDate) {
            return {
                label: 'Upcoming',
                color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            };
        }

        return {
            label: 'Ended',
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        };
    };

    const handleExport = (windowId: number) => {
        const params = new URLSearchParams();
        params.set('window_id', windowId.toString());

        const url = `${coordinatorRoutes.applications.export().url}?${params.toString()}`;
        window.location.href = url;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Windows" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={coordinatorRoutes.dashboard().url}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Application Windows</h1>
                            <p className="text-muted-foreground">
                                View application windows and export applications for your departments
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Application Windows</CardTitle>
                        <CardDescription>
                            {totalWindows} window{totalWindows !== 1 ? 's' : ''} total
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {hasRows ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Title
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Description
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Start Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                End Date
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Status
                                            </th>
                                             <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {windows.data.map((window) => {
                                            const status = getStatus(window.start_date, window.end_date);

                                            return (
                                                <tr
                                                    key={window.id}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{window.title}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                ({window.applications_count} applications)
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-muted-foreground">
                                                            {window.description || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">
                                                            {new Date(window.start_date).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">
                                                            {new Date(window.end_date).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                    <span className="sr-only">Open menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link
                                                                        href={coordinatorRoutes.windows.show({
                                                                            window: window.id,
                                                                        }).url}
                                                                        className="flex items-center"
                                                                    >
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Window
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleExport(window.id)}
                                                                    className="flex items-center"
                                                                >
                                                                    <Download className="mr-2 h-4 w-4" />
                                                                    Export XLSX
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {historicalWindows.map((window) => {
                                            const status = getStatus(window.start_date, window.end_date);

                                            return (
                                                <tr
                                                    key={`historical-${window.key}`}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium">{window.title}</span>
                                                            <span className="text-xs text-muted-foreground">
                                                                ({window.applications_count} applications)
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-muted-foreground">
                                                            {window.description || 'Historical applications import'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">
                                                            {new Date(window.start_date).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm">
                                                            {new Date(window.end_date).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <MoreVertical className="h-4 w-4" />
                                                                    <span className="sr-only">Open menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={window.view_url} className="flex items-center">
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Applications
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No windows found</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    There are no application windows available.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
