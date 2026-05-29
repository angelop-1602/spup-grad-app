import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import {
    cleanFilters,
    formatDate,
    headline,
    statusClass,
    type ApplicationWindowOption,
    type ManualVerificationDraft,
} from './console-utils';

type ManualVerificationProps = {
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    manualVerificationDrafts: ManualVerificationDraft[];
    filters: Record<string, string | null>;
};

export default function DeveloperManualVerification({
    applicationWindows,
    currentWindow,
    selectedWindowId,
    manualVerificationDrafts,
    filters,
}: ManualVerificationProps) {
    const [windowId, setWindowId] = useState(
        filters.window_id ?? (selectedWindowId ? String(selectedWindowId) : 'all'),
    );
    const [manualVerifyingId, setManualVerifyingId] = useState<number | null>(
        null,
    );

    const changeWindow = (value: string) => {
        setWindowId(value);
        router.get(
            '/developer/manual-verification',
            cleanFilters({ window_id: value }),
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const manuallyVerifyDraft = (draft: ManualVerificationDraft) => {
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

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Drafts Waiting for Verification
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {manualVerificationDrafts.length} drafts match this
                            window. Tracking code and PIN are shown for
                            applicant support.
                        </p>
                        {currentWindow ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Current active window: {currentWindow.title}
                            </p>
                        ) : null}
                    </div>
                    <div className="grid min-w-72 gap-1.5">
                        <Label>Application Window</Label>
                        <Select value={windowId} onValueChange={changeWindow}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All application windows
                                </SelectItem>
                                {applicationWindows.map((window) => (
                                    <SelectItem
                                        key={window.id}
                                        value={String(window.id)}
                                    >
                                        {window.title} (
                                        {headline(window.status)})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-muted/60 text-left">
                            <tr>
                                <th className="px-3 py-2 font-medium">
                                    Applicant
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Window
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Tracking Code
                                </th>
                                <th className="px-3 py-2 font-medium">PIN</th>
                                <th className="px-3 py-2 font-medium">
                                    Created
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {manualVerificationDrafts.map((draft) => (
                                <tr
                                    key={draft.id}
                                    className="border-t align-top"
                                >
                                    <td className="px-3 py-3">
                                        <p className="font-medium">
                                            {draft.applicant_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {draft.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {draft.student_id}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3 text-muted-foreground">
                                        {draft.window_title}
                                    </td>
                                    <td className="px-3 py-3">
                                        <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                                            {draft.tracking_code}
                                        </code>
                                    </td>
                                    <td className="px-3 py-3">
                                        <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                                            {draft.tracking_pin}
                                        </code>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                        {formatDate(draft.created_at)}
                                    </td>
                                    <td className="px-3 py-3">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                                manuallyVerifyDraft(draft)
                                            }
                                            disabled={
                                                manualVerifyingId === draft.id
                                            }
                                        >
                                            <CheckCircle2 className="size-4" />
                                            {manualVerifyingId === draft.id
                                                ? 'Verifying...'
                                                : 'Verify manually'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {manualVerificationDrafts.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-8 text-center text-muted-foreground"
                                    >
                                        No drafts are waiting for manual
                                        verification.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

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
                                className={statusClass[window.status] ?? ''}
                            >
                                {headline(window.status)}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {window.applications_count} applications
                        </p>
                    </div>
                ))}
            </section>
        </DeveloperConsoleLayout>
    );
}
