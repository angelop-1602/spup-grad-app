import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { formatDate, headline, statusClass } from '../developer/console-utils';

type ApplicationRecord = {
    key: string;
    type: 'application' | 'draft';
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
};

type DuplicateResolutionProps = {
    resolved: boolean;
    message: string | null;
    left: ApplicationRecord | null;
    right: ApplicationRecord | null;
    deleteUrl: string | null;
};

function recordTypeLabel(record: ApplicationRecord) {
    return record.type === 'application' ? 'Verified application' : 'Draft';
}

function recordProgram(record: ApplicationRecord) {
    return (
        record.course_code ??
        record.course_name ??
        record.department_code ??
        record.department_name ??
        '-'
    );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">
                {label}
            </dt>
            <dd className="break-words text-sm">{value || '-'}</dd>
        </div>
    );
}

function RecordCard({
    record,
    selected,
    onSelect,
}: {
    record: ApplicationRecord;
    selected: boolean;
    onSelect: (key: string) => void;
}) {
    return (
        <Card className={selected ? 'border-destructive' : ''}>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{record.applicant_name}</CardTitle>
                    <Badge
                        variant="outline"
                        className={statusClass[record.status] ?? ''}
                    >
                        {headline(record.status)}
                    </Badge>
                </div>
                <CardDescription>{recordTypeLabel(record)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                    <DetailRow
                        label="Record"
                        value={
                            record.application_number ??
                            record.tracking_code ??
                            record.record_label
                        }
                    />
                    <DetailRow label="Student ID" value={record.student_id} />
                    <DetailRow label="Email" value={record.email} />
                    <DetailRow label="Window" value={record.window_title} />
                    <DetailRow label="Program" value={recordProgram(record)} />
                    <DetailRow
                        label="Created"
                        value={formatDate(record.created_at)}
                    />
                </dl>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <input
                        type="radio"
                        name="selected_record"
                        value={record.key}
                        checked={selected}
                        onChange={() => onSelect(record.key)}
                        className="size-4"
                    />
                    Delete this record
                </label>
            </CardContent>
        </Card>
    );
}

export default function DuplicateApplicationResolve({
    resolved,
    message,
    left,
    right,
    deleteUrl,
}: DuplicateResolutionProps) {
    const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!deleteUrl || !selectedRecord) {
            return;
        }

        if (
            !window.confirm(
                'Delete the selected duplicate record? This cannot be undone.',
            )
        ) {
            return;
        }

        setProcessing(true);
        router.post(
            deleteUrl,
            { selected_record: selectedRecord },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <Head title="Duplicate Application Review" />

            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Duplicate Application Review
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Compare the records and keep the application you want to
                        use.
                    </p>
                </div>

                {resolved || !left || !right ? (
                    <Alert variant="info">
                        <AlertTriangle className="size-4" />
                        <AlertTitle>Review resolved</AlertTitle>
                        <AlertDescription>
                            {message ??
                                'This duplicate review is no longer available.'}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <form onSubmit={submit} className="grid gap-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <RecordCard
                                record={left}
                                selected={selectedRecord === left.key}
                                onSelect={setSelectedRecord}
                            />
                            <RecordCard
                                record={right}
                                selected={selectedRecord === right.key}
                                onSelect={setSelectedRecord}
                            />
                        </div>

                        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Only the selected record will be deleted.
                            </p>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={!selectedRecord || processing}
                            >
                                <Trash2 className="size-4" />
                                {processing ? 'Deleting...' : 'Delete Selected'}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
