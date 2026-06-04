import {
    ApplicationWindowsTable,
    type ApplicationWindowRow,
    type PaginatedApplicationWindows,
} from '@/components/application-windows-table';
import { HistoryBackButton } from '@/components/history-back-button';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Download, Eye } from 'lucide-react';

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

type WindowsIndexProps = {
    windows: PaginatedApplicationWindows;
    currentWindow: ApplicationWindowRow | null;
    historicalWindows: ApplicationWindowRow[];
    filters?: {
        search?: string;
    };
};

export default function CoordinatorApplicationsIndex({
    windows,
    currentWindow,
    historicalWindows,
    filters,
}: WindowsIndexProps) {
    const handleExport = (windowId: number | string) => {
        const params = new URLSearchParams();
        params.set('window_id', String(windowId));

        globalThis.location.href = `${coordinatorRoutes.applications.export().url}?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Windows" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <HistoryBackButton
                            variant="ghost"
                            size="icon"
                            iconOnly
                            fallbackHref={coordinatorRoutes.dashboard().url}
                            label="Back to dashboard"
                        />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Application Windows
                            </h1>
                            <p className="text-muted-foreground">
                                View application windows and export applications
                                for your departments
                            </p>
                        </div>
                    </div>
                </div>

                <ApplicationWindowsTable
                    windows={windows}
                    historicalWindows={historicalWindows}
                    currentWindow={currentWindow}
                    filters={filters}
                    indexUrl={coordinatorRoutes.applications.index().url}
                    getActions={(window) => {
                        const viewHref =
                            window.view_url ??
                            coordinatorRoutes.windows.show({
                                window: Number(window.id),
                            }).url;

                        if (window.is_historical) {
                            return [
                                {
                                    label: 'View',
                                    href: viewHref,
                                    icon: <Eye className="size-3.5" />,
                                },
                            ];
                        }

                        return [
                            {
                                label: 'View',
                                href: viewHref,
                                icon: <Eye className="size-3.5" />,
                            },
                            {
                                label: 'Export',
                                onClick: () => handleExport(window.id),
                                icon: <Download className="size-3.5" />,
                            },
                        ];
                    }}
                />
            </div>
        </AppLayout>
    );
}
