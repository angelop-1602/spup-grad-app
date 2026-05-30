import {
    ApplicationWizard,
    type ApplicationWindow,
    type Department,
    type ExistingApplication,
    type StudentProfile,
} from '@/components/application-wizard';
import {
    PossibleDuplicateApplications,
    type PossibleDuplicateApplication,
} from '@/components/possible-duplicate-applications';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface AdminEditApplicationPageProps {
    application: ExistingApplication & { window: ApplicationWindow };
    profile: StudentProfile | null;
    departments: Department[];
    isApproved?: boolean;
    updateUrl: string;
    cancelHref: string;
    possibleDuplicates: PossibleDuplicateApplication[];
}

export default function AdminEditApplicationPage({
    application,
    profile,
    departments,
    isApproved = false,
    updateUrl,
    cancelHref,
    possibleDuplicates,
}: AdminEditApplicationPageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Admin Dashboard',
            href: adminRoutes.dashboard().url,
        },
        {
            title: 'Application Details',
            href: cancelHref,
        },
        {
            title: 'Edit Application',
            href: '#',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Application" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4 md:gap-6 md:p-6">
                <PossibleDuplicateApplications
                    duplicates={possibleDuplicates}
                    canDelete
                />
                <ApplicationWizard
                    mode="edit"
                    window={application.window}
                    profile={profile}
                    departments={departments}
                    application={application}
                    isApproved={isApproved}
                    updateUrl={updateUrl}
                    cancelHref={cancelHref}
                    requireIdentityConfirmation={false}
                    requireAgreement={false}
                    pageTitle="Edit Application Data"
                    introText="Update the applicant record using the same validation rules as the application form."
                />
            </div>
        </AppLayout>
    );
}
