import { ManualVerificationPanel } from '@/components/manual-verification-panel';
import { type ManualVerificationRecord } from '@/components/manual-verification-table';
import {
    type ApplicationWindowOption,
    compactDate,
    headline,
    staffStatusClass,
} from '@/components/staff-table-utils';
import { Badge } from '@/components/ui/badge';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { type DeveloperApplicationSearchResult } from './console-utils';

type ManualVerificationProps = {
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    manualVerificationDrafts: ManualVerificationRecord[];
    applicationSearchResults: DeveloperApplicationSearchResult[];
    filters: Record<string, string | null>;
};

export default function DeveloperManualVerification({
    applicationWindows,
    currentWindow,
    selectedWindowId,
    manualVerificationDrafts,
    applicationSearchResults,
    filters,
}: ManualVerificationProps) {
    const [manualVerifyingId, setManualVerifyingId] = useState<number | null>(
        null,
    );

    const manuallyVerifyDraft = (draft: ManualVerificationRecord) => {
        setManualVerifyingId(draft.id);

        router.post(
            `/developer/drafts/${draft.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setManualVerifyingId(null),
            },
        );
    };

    return (
        <DeveloperConsoleLayout
            title="Manual Verification"
            description="Finalize guest application drafts when email verification cannot be completed during emergencies."
        >
            <Head title="Developer Manual Verification" />

            <ManualVerificationPanel
                records={manualVerificationDrafts}
                applicationWindows={applicationWindows}
                currentWindow={currentWindow}
                selectedWindowId={selectedWindowId}
                filters={filters}
                actionUrl="/developer/manual-verification"
                verifyingId={manualVerifyingId}
                onVerify={manuallyVerifyDraft}
                applicationActionLabel="Edit application"
            />

            {applicationSearchResults.length > 0 ? (
                <ApplicationSearchResultsTable
                    applications={applicationSearchResults}
                />
            ) : null}

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {applicationWindows.slice(0, 8).map((window) => (
                    <div
                        key={window.id}
                        className="rounded-lg border bg-card p-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{window.title}</p>
                            <Badge
                                variant="outline"
                                className={
                                    staffStatusClass[window.status] ?? ''
                                }
                            >
                                {headline(window.status)}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {window.applications_count ?? 0} applications
                        </p>
                    </div>
                ))}
            </section>
        </DeveloperConsoleLayout>
    );
}

function ApplicationSearchResultsTable({
    applications,
}: {
    applications: DeveloperApplicationSearchResult[];
}) {
    return (
        <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">
                    Applications Matching Search
                </h2>
                <p className="text-sm text-muted-foreground">
                    Select a row to verify or correct the applicant record.
                </p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[920px] text-sm">
                    <thead className="bg-muted/60 text-left">
                        <tr>
                            <th className="px-3 py-2 font-medium">Applicant</th>
                            <th className="px-3 py-2 font-medium">Window</th>
                            <th className="px-3 py-2 font-medium">Program</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applications.map((application) => (
                            <tr
                                key={application.id}
                                className="cursor-pointer border-t align-top hover:bg-muted/40"
                                role="link"
                                tabIndex={0}
                                onClick={() =>
                                    router.visit(application.edit_url)
                                }
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        router.visit(application.edit_url);
                                    }
                                }}
                            >
                                <td className="px-3 py-3">
                                    <p className="font-medium">
                                        {application.applicant_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {application.student_id ?? '-'} -{' '}
                                        {application.application_number}
                                    </p>
                                    <p className="text-xs break-all text-muted-foreground">
                                        {application.email ?? '-'}
                                    </p>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">
                                    {application.window_title ?? '-'}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">
                                    <p>{application.department_code ?? '-'}</p>
                                    <p>{application.course_name ?? '-'}</p>
                                </td>
                                <td className="px-3 py-3">
                                    <Badge
                                        variant="outline"
                                        className={
                                            staffStatusClass[
                                                application.status
                                            ] ?? ''
                                        }
                                    >
                                        {headline(application.status)}
                                    </Badge>
                                </td>
                                <td className="px-3 py-3 text-xs text-muted-foreground">
                                    {compactDate(application.created_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
