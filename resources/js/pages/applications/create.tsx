import { ApplicationWizard, type ApplicationWindow, type Department, type StudentProfile } from '@/components/application-wizard';
import AppLayout from '@/layouts/app-layout';
import applicationRoutes from '@/routes/applications/index';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Create Application',
        href: applicationRoutes.create().url,
    },
];

interface CreateApplicationPageProps {
    window: ApplicationWindow;
    profile: StudentProfile | null;
    departments: Department[];
}

export default function CreateApplicationPage({
    window,
    profile,
    departments,
}: CreateApplicationPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Application" />
            <ApplicationWizard
                mode="create"
                window={window}
                profile={profile}
                departments={departments}
            />
        </AppLayout>
    );
}
