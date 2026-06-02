import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, MailWarning } from 'lucide-react';
import { useState } from 'react';
import { formatDate, headline, statusClass } from './console-utils';

type DeveloperWindow = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    applications_count: number;
};

type ApplicationRecord = {
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
    department_code: string | null;
    department_name: string | null;
    course_code: string | null;
    course_name: string | null;
    status: string;
    application_number: string | null;
    tracking_code: string | null;
    verification_status: string;
    created_at: string | null;
    verified_at: string | null;
    developer_url?: string | null;
};

type DuplicatePair = {
    id: string;
    left: ApplicationRecord;
    right: ApplicationRecord;
    match: {
        first_name: string;
        last_name: string;
        student_id: string;
    };
};

type DeveloperWindowProps = {
    window: DeveloperWindow;
    verifiedApplications: ApplicationRecord[];
    unverifiedApplications: ApplicationRecord[];
    duplicatePairs: DuplicatePair[];
};

function recordProgram(record: ApplicationRecord) {
    return (
        record.course_code ??
        record.course_name ??
        record.department_code ??
        record.department_name ??
        '-'
    );
}

function recordIdentifier(record: ApplicationRecord) {
    return (
        record.application_number ?? record.tracking_code ?? record.record_label
    );
}

function recordTypeLabel(record: ApplicationRecord) {
    return record.type === 'application' ? 'Verified' : 'Unverified';
}

function ApplicationTable({
    records,
    emptyMessage,
}: {
    records: ApplicationRecord[];
    emptyMessage: string;
}) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/60 text-left">
                    <tr>
                        <th className="px-3 py-2 font-medium">Applicant</th>
                        <th className="px-3 py-2 font-medium">Record</th>
                        <th className="px-3 py-2 font-medium">Program</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => (
                        <tr
                            key={record.key}
                            className={
                                record.developer_url
                                    ? 'cursor-pointer border-t align-top hover:bg-muted/40'
                                    : 'border-t align-top'
                            }
                            role={record.developer_url ? 'link' : undefined}
                            tabIndex={record.developer_url ? 0 : undefined}
                            onClick={
                                record.developer_url
                                    ? () => router.visit(record.developer_url!)
                                    : undefined
                            }
                            onKeyDown={
                                record.developer_url
                                    ? (event) => {
                                          if (
                                              event.key === 'Enter' ||
                                              event.key === ' '
                                          ) {
                                              event.preventDefault();
                                              router.visit(
                                                  record.developer_url!,
                                              );
                                          }
                                      }
                                    : undefined
                            }
                        >
                            <td className="px-3 py-3">
                                <p className="font-medium">
                                    {record.applicant_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {record.student_id ?? '-'}
                                </p>
                                <p className="text-xs break-all text-muted-foreground">
                                    {record.email ?? '-'}
                                </p>
                            </td>
                            <td className="px-3 py-3">
                                <p className="font-medium">
                                    {recordIdentifier(record)}
                                </p>
                                <Badge variant="secondary" className="mt-2">
                                    {recordTypeLabel(record)}
                                </Badge>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                                <p>{recordProgram(record)}</p>
                                <p className="text-xs">
                                    {record.department_code ??
                                        record.department_name ??
                                        '-'}
                                </p>
                            </td>
                            <td className="px-3 py-3">
                                <Badge
                                    variant="outline"
                                    className={statusClass[record.status] ?? ''}
                                >
                                    {headline(record.status)}
                                </Badge>
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                                {formatDate(record.created_at)}
                            </td>
                        </tr>
                    ))}
                    {records.length === 0 && (
                        <tr>
                            <td
                                colSpan={5}
                                className="px-3 py-10 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function DeveloperWindow({
    window,
    verifiedApplications,
    unverifiedApplications,
    duplicatePairs,
}: DeveloperWindowProps) {
    const [sendingPairId, setSendingPairId] = useState<string | null>(null);

    const sendDuplicateAlert = (pair: DuplicatePair) => {
        setSendingPairId(pair.id);
        router.post(
            `/developer/windows/${window.id}/duplicates/alert`,
            {
                left: pair.left.key,
                right: pair.right.key,
            },
            {
                preserveScroll: true,
                onFinish: () => setSendingPairId(null),
            },
        );
    };

    return (
        <DeveloperConsoleLayout
            title={window.title}
            description="Application window review across verified, unverified, and duplicate records."
        >
            <Head title={`Developer Window - ${window.title}`} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="outline" size="sm">
                    <Link href="/developer/windows">
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                    <Badge
                        variant="outline"
                        className={statusClass[window.status] ?? ''}
                    >
                        {headline(window.status)}
                    </Badge>
                    <Badge variant="secondary">
                        {window.applications_count} verified
                    </Badge>
                    <Badge variant="secondary">
                        {unverifiedApplications.length} unverified
                    </Badge>
                    <Badge variant="secondary">
                        {duplicatePairs.length} duplicate
                        {duplicatePairs.length === 1 ? '' : 's'}
                    </Badge>
                </div>
            </div>

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">{window.title}</h2>
                    <p className="text-sm text-muted-foreground">
                        {formatDate(window.start_date)} to{' '}
                        {formatDate(window.end_date)}
                    </p>
                    {window.description ? (
                        <p className="text-sm text-muted-foreground">
                            {window.description}
                        </p>
                    ) : null}
                </div>

                <Tabs defaultValue="verified">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="verified">
                            Verified ({verifiedApplications.length})
                        </TabsTrigger>
                        <TabsTrigger value="unverified">
                            Unverified ({unverifiedApplications.length})
                        </TabsTrigger>
                        <TabsTrigger value="duplicates">
                            Duplications ({duplicatePairs.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="verified" className="mt-4">
                        <ApplicationTable
                            records={verifiedApplications}
                            emptyMessage="No verified applications for this window."
                        />
                    </TabsContent>

                    <TabsContent value="unverified" className="mt-4">
                        <ApplicationTable
                            records={unverifiedApplications}
                            emptyMessage="No unverified applications for this window."
                        />
                    </TabsContent>

                    <TabsContent value="duplicates" className="mt-4">
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[1040px] text-sm">
                                <thead className="bg-muted/60 text-left">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">
                                            Match
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Record A
                                        </th>
                                        <th className="px-3 py-2 font-medium">
                                            Record B
                                        </th>
                                        <th className="px-3 py-2 text-right font-medium">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duplicatePairs.map((pair) => (
                                        <tr
                                            key={pair.id}
                                            className="border-t align-top"
                                        >
                                            <td className="px-3 py-3">
                                                <p className="font-medium">
                                                    {pair.match.first_name}{' '}
                                                    {pair.match.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {pair.match.student_id}
                                                </p>
                                            </td>
                                            {[pair.left, pair.right].map(
                                                (record) => (
                                                    <td
                                                        key={record.key}
                                                        className="px-3 py-3"
                                                    >
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="font-medium">
                                                                    {
                                                                        record.applicant_name
                                                                    }
                                                                </p>
                                                                <Badge variant="secondary">
                                                                    {recordTypeLabel(
                                                                        record,
                                                                    )}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {recordIdentifier(
                                                                    record,
                                                                )}
                                                            </p>
                                                            <p className="text-xs break-all text-muted-foreground">
                                                                {record.email ??
                                                                    '-'}
                                                            </p>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    statusClass[
                                                                        record
                                                                            .status
                                                                    ] ?? ''
                                                                }
                                                            >
                                                                {headline(
                                                                    record.status,
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                ),
                                            )}
                                            <td className="px-3 py-3 text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        sendDuplicateAlert(pair)
                                                    }
                                                    disabled={
                                                        sendingPairId ===
                                                        pair.id
                                                    }
                                                >
                                                    <MailWarning className="size-4" />
                                                    {sendingPairId === pair.id
                                                        ? 'Sending...'
                                                        : 'Send Alert'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {duplicatePairs.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-3 py-10 text-center text-muted-foreground"
                                            >
                                                No duplicate records found for
                                                this window.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </TabsContent>
                </Tabs>
            </section>
        </DeveloperConsoleLayout>
    );
}
