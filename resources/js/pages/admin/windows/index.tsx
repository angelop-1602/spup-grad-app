import {
    ApplicationWindowsTable,
    type ApplicationWindowRow,
    type PaginatedApplicationWindows,
} from '@/components/application-windows-table';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Edit, Eye, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Application Windows',
        href: adminRoutes.windows.index().url,
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

export default function WindowsIndex({
    windows,
    currentWindow,
    historicalWindows,
    filters,
}: WindowsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Application Windows" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Application Windows
                        </h1>
                        <p className="text-muted-foreground">
                            Manage application submission windows
                        </p>
                    </div>
                </div>

                <ApplicationWindowsTable
                    windows={windows}
                    historicalWindows={historicalWindows}
                    currentWindow={currentWindow}
                    filters={filters}
                    indexUrl={adminRoutes.windows.index().url}
                    createAction={
                        <Button asChild className="h-9">
                            <Link href={adminRoutes.windows.create().url}>
                                <Plus className="size-4" />
                                Create Window
                            </Link>
                        </Button>
                    }
                    getActions={(window) => {
                        const viewHref =
                            window.view_url ??
                            adminRoutes.windows.show({
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
                                label: 'Edit',
                                href: adminRoutes.windows.edit({
                                    window: Number(window.id),
                                }).url,
                                icon: <Edit className="size-3.5" />,
                            },
                        ];
                    }}
                />
            </div>
        </AppLayout>
    );
}
