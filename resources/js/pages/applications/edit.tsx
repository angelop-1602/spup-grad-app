import {
    ApplicationWizard,
    type ApplicationWindow,
    type Department,
    type ExistingApplication,
    type StudentProfile,
} from '@/components/application-wizard';
import AppLayout from '@/layouts/app-layout';
import ApplyLayout from '@/layouts/apply-layout';
import applicationRoutes from '@/routes/applications/index';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Edit Application',
        href: applicationRoutes.create().url,
    },
];

interface EditApplicationPageProps {
    application: ExistingApplication & { window: ApplicationWindow };
    profile: StudentProfile | null;
    departments: Department[];
    isApproved?: boolean;
    portalMode?: 'student' | 'guest';
}

export default function EditApplicationPage({
    application,
    profile,
    departments,
    isApproved = false,
    portalMode = 'student',
}: EditApplicationPageProps) {
    const content = (
        <>
            <Head title="Edit Application" />
            <ApplicationWizard
                mode="edit"
                window={application.window}
                profile={profile}
                departments={departments}
                application={application}
                portalMode={portalMode}
                isApproved={isApproved}
            />
        </>
    );

    if (portalMode === 'guest') {
        return <ApplyLayout>{content}</ApplyLayout>;
    }

    return <AppLayout breadcrumbs={breadcrumbs}>{content}</AppLayout>;
}
