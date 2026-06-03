import {
    ApplicationTrackingCard,
    type ApplicationTracking,
} from '@/components/application-tracking-card';
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
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head } from '@inertiajs/react';

interface DeveloperEditApplicationPageProps {
    application: ExistingApplication & { window: ApplicationWindow };
    profile: StudentProfile | null;
    departments: Department[];
    isApproved?: boolean;
    updateUrl: string;
    cancelHref: string;
    tracking?: ApplicationTracking | null;
    possibleDuplicates: PossibleDuplicateApplication[];
}

export default function DeveloperEditApplicationPage({
    application,
    profile,
    departments,
    isApproved = false,
    updateUrl,
    cancelHref,
    tracking,
    possibleDuplicates,
}: DeveloperEditApplicationPageProps) {
    return (
        <DeveloperConsoleLayout
            title="Edit Application"
            description={`${application.application_number} - ${application.user?.student_id ?? 'No Student ID'}`}
        >
            <Head title="Developer Edit Application" />
            <div className="space-y-4">
                <PossibleDuplicateApplications
                    duplicates={possibleDuplicates}
                    canDelete
                />
                <ApplicationTrackingCard tracking={tracking} />
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
        </DeveloperConsoleLayout>
    );
}
