import {
    ManualVerificationPanel,
    type ManualVerificationPagination,
} from '@/components/manual-verification-panel';
import { type ManualVerificationRecord } from '@/components/manual-verification-table';
import { type ApplicationWindowOption } from '@/components/staff-table-utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Coordinator Dashboard',
        href: coordinatorRoutes.dashboard().url,
    },
    {
        title: 'Manual Verification',
        href: '/coordinator/manual-verification',
    },
];

type PaginatedDrafts = ManualVerificationPagination & {
    data: ManualVerificationRecord[];
};

type ManualVerificationProps = {
    drafts: PaginatedDrafts;
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    filters?: {
        search?: string;
        window_id?: string;
    };
};

export default function CoordinatorManualVerificationIndex({
    drafts,
    applicationWindows,
    currentWindow,
    selectedWindowId,
    filters,
}: ManualVerificationProps) {
    const { addToast } = useToast();
    const [verifyingDraftId, setVerifyingDraftId] = useState<number | null>(
        null,
    );

    const verifyDraft = (draft: ManualVerificationRecord) => {
        setVerifyingDraftId(draft.id);
        router.post(
            `/coordinator/manual-verification/${draft.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setVerifyingDraftId(null),
                onSuccess: () =>
                    addToast({
                        variant: 'success',
                        title: 'Draft verified',
                        description: `${draft.applicant_name} was verified.`,
                        duration: 5000,
                    }),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coordinator Manual Verification" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Manual Verification
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Guest drafts waiting for verification in your
                            assigned departments
                        </p>
                    </div>
                    <Badge variant={drafts.total ? 'outline' : 'secondary'}>
                        {drafts.total} pending
                    </Badge>
                </div>

                <ManualVerificationPanel
                    records={drafts.data}
                    pagination={drafts}
                    applicationWindows={applicationWindows}
                    currentWindow={currentWindow}
                    selectedWindowId={selectedWindowId}
                    filters={filters}
                    actionUrl="/coordinator/manual-verification"
                    verifyingId={verifyingDraftId}
                    onVerify={verifyDraft}
                    applicationActionLabel="View application"
                    emptyMessage="Your assigned departments have no pending guest drafts."
                />
            </div>
        </AppLayout>
    );
}
