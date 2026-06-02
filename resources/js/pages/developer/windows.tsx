import {
    ApplicationWindowsTable,
    type ApplicationWindowRow,
    type PaginatedApplicationWindows,
} from '@/components/application-windows-table';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head } from '@inertiajs/react';
import { ShieldQuestion } from 'lucide-react';

type DeveloperWindowsProps = {
    windows: PaginatedApplicationWindows;
    currentWindow: ApplicationWindowRow | null;
    filters?: {
        search?: string;
    };
};

export default function DeveloperWindows({
    windows,
    currentWindow,
    filters,
}: DeveloperWindowsProps) {
    return (
        <DeveloperConsoleLayout
            title="Application Windows"
            description="Review every graduation application window and jump into window-specific diagnostics."
        >
            <Head title="Developer Application Windows" />

            <ApplicationWindowsTable
                windows={windows}
                currentWindow={currentWindow}
                filters={filters}
                indexUrl="/developer/windows"
                getActions={(window) => [
                    {
                        label: 'View Window',
                        href: `/developer/windows/${window.id}`,
                        icon: <ShieldQuestion className="size-3.5" />,
                    },
                ]}
            />
        </DeveloperConsoleLayout>
    );
}
