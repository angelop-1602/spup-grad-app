import {
    ManualVerificationTable,
    type ManualVerificationRecord,
} from '@/components/manual-verification-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/contexts/toast-context';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import {
    FileText,
    MailWarning,
    ShieldQuestion,
    Trash2,
    UsersRound,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

type ReviewSection = 'applications' | 'unverified' | 'duplicates';

export type WindowApplicationReviewRecord = {
    key: string;
    type: 'application' | 'draft';
    id: number;
    record_label: string;
    applicant_name: string;
    first_name: string;
    last_name: string;
    student_id: string | null;
    email: string | null;
    window_title: string;
    department_id?: number | null;
    department_code: string | null;
    department_name: string | null;
    course_code: string | null;
    course_name: string | null;
    status: string;
    application_number: string | null;
    tracking_code: string | null;
    tracking_pin?: string | null;
    verification_status: string;
    created_at: string | null;
    verified_at: string | null;
};

export type WindowApplicationDuplicatePair = {
    id: string;
    left: WindowApplicationReviewRecord;
    right: WindowApplicationReviewRecord;
    match: {
        matched_on?: string | null;
        first_name: string;
        last_name: string;
        student_id: string;
        email?: string | null;
    };
};

type WindowApplicationReviewTabsProps = {
    applicationsCount: number;
    unverifiedApplications: WindowApplicationReviewRecord[];
    duplicatePairs: WindowApplicationDuplicatePair[];
    duplicateAlertUrl: string;
    duplicateDeleteUrl: string;
    verifyDraftUrl: (draft: WindowApplicationReviewRecord) => string;
    children: ReactNode;
};

const sections = [
    {
        value: 'applications',
        label: 'Applications',
        icon: FileText,
    },
    {
        value: 'unverified',
        label: 'Unverified',
        icon: ShieldQuestion,
    },
    {
        value: 'duplicates',
        label: 'Duplications',
        icon: UsersRound,
    },
] as const;

function headline(value: string | null | undefined) {
    return (value ?? '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function recordIdentifier(record: WindowApplicationReviewRecord) {
    return (
        record.application_number ?? record.tracking_code ?? record.record_label
    );
}

function departmentLabel(record: WindowApplicationReviewRecord) {
    return record.department_code ?? record.department_name ?? '-';
}

function courseLabel(record: WindowApplicationReviewRecord) {
    return record.course_code ?? record.course_name ?? '-';
}

function recordStatusClass(status: string) {
    const classes: Record<string, string> = {
        pending:
            'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
        verified:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        needs_application:
            'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
        submitted:
            'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
        approved:
            'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        incomplete:
            'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
        rejected:
            'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    };

    return classes[status] ?? '';
}

export function WindowApplicationReviewTabs({
    applicationsCount,
    unverifiedApplications,
    duplicatePairs,
    duplicateAlertUrl,
    duplicateDeleteUrl,
    verifyDraftUrl,
    children,
}: WindowApplicationReviewTabsProps) {
    const { addToast } = useToast();
    const [activeSection, setActiveSection] =
        useState<ReviewSection>('applications');
    const [verifyingDraftId, setVerifyingDraftId] = useState<number | null>(
        null,
    );
    const [sendingPairId, setSendingPairId] = useState<string | null>(null);
    const [deletingRecordKey, setDeletingRecordKey] = useState<string | null>(
        null,
    );

    const sectionCounts: Record<ReviewSection, number> = {
        applications: applicationsCount,
        unverified: unverifiedApplications.length,
        duplicates: duplicatePairs.length,
    };

    const verifyDraft = (draft: WindowApplicationReviewRecord) => {
        setVerifyingDraftId(draft.id);
        router.post(
            verifyDraftUrl(draft),
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

    const sendDuplicateAlert = (pair: WindowApplicationDuplicatePair) => {
        setSendingPairId(pair.id);
        router.post(
            duplicateAlertUrl,
            {
                left: pair.left.key,
                right: pair.right.key,
            },
            {
                preserveScroll: true,
                onFinish: () => setSendingPairId(null),
                onSuccess: () =>
                    addToast({
                        variant: 'success',
                        title: 'Duplicate alert sent',
                        description:
                            'The applicant was emailed a secure review link.',
                        duration: 5000,
                    }),
            },
        );
    };

    const deleteDuplicateRecord = (
        pair: WindowApplicationDuplicatePair,
        record: WindowApplicationReviewRecord,
    ) => {
        const confirmed = globalThis.confirm(
            `Delete duplicate record ${recordIdentifier(record)} for ${record.applicant_name}? This cannot be undone.`,
        );

        if (!confirmed) {
            return;
        }

        setDeletingRecordKey(record.key);
        router.delete(duplicateDeleteUrl, {
            data: {
                left: pair.left.key,
                right: pair.right.key,
                selected_record: record.key,
            },
            preserveScroll: true,
            onFinish: () => setDeletingRecordKey(null),
            onSuccess: () =>
                addToast({
                    variant: 'success',
                    title: 'Duplicate deleted',
                    description: `${record.applicant_name}'s selected duplicate record was deleted.`,
                    duration: 5000,
                }),
        });
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
            <nav
                aria-label="Application window review sections"
                className="rounded-lg border bg-card p-2 lg:sticky lg:top-20 lg:self-start"
            >
                <div className="grid gap-1">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.value;

                        return (
                            <button
                                key={section.value}
                                type="button"
                                onClick={() => setActiveSection(section.value)}
                                className={cn(
                                    'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <Icon className="size-4 shrink-0" />
                                    <span className="truncate">
                                        {section.label}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-xs',
                                        isActive
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {sectionCounts[section.value]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div className="min-w-0">
                {activeSection === 'applications' ? children : null}
                {activeSection === 'unverified' ? (
                    <UnverifiedApplicationsPanel
                        records={unverifiedApplications}
                        verifyingDraftId={verifyingDraftId}
                        onVerify={verifyDraft}
                    />
                ) : null}
                {activeSection === 'duplicates' ? (
                    <DuplicateApplicationsPanel
                        pairs={duplicatePairs}
                        sendingPairId={sendingPairId}
                        deletingRecordKey={deletingRecordKey}
                        onSendAlert={sendDuplicateAlert}
                        onDeleteRecord={deleteDuplicateRecord}
                    />
                ) : null}
            </div>
        </div>
    );
}

function UnverifiedApplicationsPanel({
    records,
    verifyingDraftId,
    onVerify,
}: {
    records: WindowApplicationReviewRecord[];
    verifyingDraftId: number | null;
    onVerify: (draft: WindowApplicationReviewRecord) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Unverified Applications</CardTitle>
                <CardDescription>
                    Guest drafts in this application window that still need
                    email or manual verification.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ManualVerificationTable
                    records={records as ManualVerificationRecord[]}
                    verifyingId={verifyingDraftId}
                    onVerify={(record) =>
                        onVerify(record as WindowApplicationReviewRecord)
                    }
                    showProgram
                    emptyMessage="This window has no guest drafts waiting for verification."
                />
            </CardContent>
        </Card>
    );
}

function DuplicateApplicationsPanel({
    pairs,
    sendingPairId,
    deletingRecordKey,
    onSendAlert,
    onDeleteRecord,
}: {
    pairs: WindowApplicationDuplicatePair[];
    sendingPairId: string | null;
    deletingRecordKey: string | null;
    onSendAlert: (pair: WindowApplicationDuplicatePair) => void;
    onDeleteRecord: (
        pair: WindowApplicationDuplicatePair,
        record: WindowApplicationReviewRecord,
    ) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Possible Duplications</CardTitle>
                <CardDescription>
                    Records with matching applicant account, student ID, email,
                    or name and birth date inside this application window.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {pairs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1040px] text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                        Match
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                        Record A
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                        Record B
                                    </th>
                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pairs.map((pair) => (
                                    <tr
                                        key={pair.id}
                                        className="border-b align-top transition-colors hover:bg-muted/50"
                                    >
                                        <td className="px-3 py-3">
                                            <Badge
                                                variant="outline"
                                                className="mb-2"
                                            >
                                                {pair.match.matched_on ??
                                                    'Identity details'}
                                            </Badge>
                                            <p className="font-medium">
                                                {pair.match.first_name}{' '}
                                                {pair.match.last_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {pair.match.student_id}
                                            </p>
                                            {pair.match.email ? (
                                                <p className="text-xs break-all text-muted-foreground">
                                                    {pair.match.email}
                                                </p>
                                            ) : null}
                                        </td>
                                        <DuplicateRecordCell
                                            record={pair.left}
                                            pair={pair}
                                            deletingRecordKey={
                                                deletingRecordKey
                                            }
                                            onDelete={onDeleteRecord}
                                        />
                                        <DuplicateRecordCell
                                            record={pair.right}
                                            pair={pair}
                                            deletingRecordKey={
                                                deletingRecordKey
                                            }
                                            onDelete={onDeleteRecord}
                                        />
                                        <td className="px-3 py-3 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() =>
                                                    onSendAlert(pair)
                                                }
                                                disabled={
                                                    sendingPairId === pair.id
                                                }
                                            >
                                                <MailWarning className="size-4" />
                                                {sendingPairId === pair.id
                                                    ? 'Sending'
                                                    : 'Send Alert'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <UsersRound className="mx-auto h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-4 text-base font-semibold">
                            No duplicate records
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            No records in this window match on account, student
                            ID, email, or name and birth date.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DuplicateRecordCell({
    record,
    pair,
    deletingRecordKey,
    onDelete,
}: {
    record: WindowApplicationReviewRecord;
    pair: WindowApplicationDuplicatePair;
    deletingRecordKey: string | null;
    onDelete: (
        pair: WindowApplicationDuplicatePair,
        record: WindowApplicationReviewRecord,
    ) => void;
}) {
    const isDeleting = deletingRecordKey === record.key;

    return (
        <td className="px-3 py-3">
            <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{record.applicant_name}</p>
                    <Badge variant="secondary">
                        {record.type === 'application' ? 'Verified' : 'Draft'}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    {recordIdentifier(record)}
                </p>
                <p className="text-xs break-all text-muted-foreground">
                    {record.email ?? '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                    Department: {departmentLabel(record)}
                </p>
                <Badge
                    variant="outline"
                    className={cn('w-fit', recordStatusClass(record.status))}
                >
                    {headline(record.status)}
                </Badge>
                <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="mt-2 w-fit"
                    onClick={() => onDelete(pair, record)}
                    disabled={isDeleting}
                >
                    <Trash2 className="size-4" />
                    {isDeleting ? 'Deleting' : 'Delete'}
                </Button>
            </div>
        </td>
    );
}
