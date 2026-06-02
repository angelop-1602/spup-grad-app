import {
    compactDate,
    headline,
    staffStatusClass,
} from '@/components/staff-table-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { CheckCircle2, Pencil } from 'lucide-react';

export type ManualVerificationRecord = {
    id: number;
    key?: string;
    applicant_name: string;
    email: string | null;
    student_id: string | null;
    tracking_code: string | null;
    tracking_pin?: string | null;
    window_title: string | null;
    department_code?: string | null;
    department_name?: string | null;
    course_code?: string | null;
    course_name?: string | null;
    application_number: string | null;
    application_edit_url?: string | null;
    verification_status: string;
    status?: string;
    created_at: string | null;
    verified_at?: string | null;
};

type ManualVerificationTableProps = {
    records: ManualVerificationRecord[];
    verifyingId?: number | null;
    onVerify?: (record: ManualVerificationRecord) => void;
    emptyMessage?: string;
    showProgram?: boolean;
    applicationActionLabel?: string;
};

function programLabel(record: ManualVerificationRecord) {
    return (
        record.course_code ??
        record.course_name ??
        record.department_code ??
        record.department_name ??
        '-'
    );
}

export function ManualVerificationTable({
    records,
    verifyingId = null,
    onVerify,
    emptyMessage = 'No drafts are waiting for manual verification.',
    showProgram = false,
    applicationActionLabel = 'Open application',
}: ManualVerificationTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/60 text-left">
                    <tr>
                        <th className="px-3 py-2 font-medium">Applicant</th>
                        <th className="px-3 py-2 font-medium">Window</th>
                        {showProgram ? (
                            <th className="px-3 py-2 font-medium">Program</th>
                        ) : null}
                        <th className="px-3 py-2 font-medium">Tracking Code</th>
                        <th className="px-3 py-2 font-medium">PIN</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                        <th className="px-3 py-2 text-right font-medium">
                            Action
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record) => (
                        <tr
                            key={record.key ?? record.id}
                            className="border-t align-top"
                        >
                            <td className="px-3 py-3">
                                <p className="font-medium">
                                    {record.applicant_name}
                                </p>
                                <p className="text-xs break-all text-muted-foreground">
                                    {record.email ?? '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {record.student_id ?? '-'}
                                </p>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                                {record.window_title ?? '-'}
                            </td>
                            {showProgram ? (
                                <td className="px-3 py-3 text-muted-foreground">
                                    <p>{programLabel(record)}</p>
                                    <p className="text-xs">
                                        {record.department_code ??
                                            record.department_name ??
                                            '-'}
                                    </p>
                                </td>
                            ) : null}
                            <td className="px-3 py-3">
                                <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                                    {record.tracking_code ?? '-'}
                                </code>
                            </td>
                            <td className="px-3 py-3">
                                <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                                    {record.tracking_pin ?? '-'}
                                </code>
                            </td>
                            <td className="px-3 py-3">
                                <Badge
                                    variant="outline"
                                    className={
                                        staffStatusClass[
                                            record.verification_status
                                        ] ?? ''
                                    }
                                >
                                    {headline(record.verification_status)}
                                </Badge>
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                                {compactDate(record.created_at)}
                            </td>
                            <td className="px-3 py-3 text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                    {record.application_edit_url ? (
                                        <Button
                                            asChild
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                        >
                                            <Link
                                                href={
                                                    record.application_edit_url
                                                }
                                            >
                                                <Pencil className="size-3.5" />
                                                {applicationActionLabel}
                                            </Link>
                                        </Button>
                                    ) : null}
                                    {onVerify ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 px-2 text-xs"
                                            onClick={() => onVerify(record)}
                                            disabled={
                                                verifyingId === record.id ||
                                                record.verification_status ===
                                                    'verified'
                                            }
                                        >
                                            <CheckCircle2 className="size-3.5" />
                                            {verifyingId === record.id
                                                ? 'Verifying'
                                                : 'Verify'}
                                        </Button>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {records.length === 0 && (
                        <tr>
                            <td
                                colSpan={showProgram ? 8 : 7}
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
