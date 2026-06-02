import {
    ManualVerificationPanel,
    type ManualVerificationPagination,
} from '@/components/manual-verification-panel';
import { type ManualVerificationRecord } from '@/components/manual-verification-table';
import { type ApplicationWindowOption } from '@/components/staff-table-utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Manual Verification',
        href: adminRoutes.unverifiedApplications.index().url,
    },
];

type PaginatedDrafts = ManualVerificationPagination & {
    data: ManualVerificationRecord[];
};

type UnverifiedApplicationsProps = {
    drafts: PaginatedDrafts;
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    filters?: {
        search?: string;
        window_id?: string;
    };
};

export default function UnverifiedApplicationsIndex({
    drafts,
    applicationWindows,
    currentWindow,
    selectedWindowId,
    filters,
}: UnverifiedApplicationsProps) {
    const { addToast } = useToast();
    const [verifyingDraftId, setVerifyingDraftId] = useState<number | null>(
        null,
    );

    const verifyDraft = (draft: ManualVerificationRecord) => {
        setVerifyingDraftId(draft.id);
        router.post(
            `/admin/students/guest-drafts/${draft.id}/verify`,
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
            <Head title="Manual Verification" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Manual Verification
                        </h1>
                        <p className="text-muted-foreground">
                            Guest drafts waiting for email or manual
                            verification
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
                    actionUrl={adminRoutes.unverifiedApplications.index().url}
                    verifyingId={verifyingDraftId}
                    onVerify={verifyDraft}
                    applicationActionLabel="Edit application"
                    emptyMessage="No drafts are waiting for manual verification."
                />
            </div>
        </AppLayout>
    );
}
