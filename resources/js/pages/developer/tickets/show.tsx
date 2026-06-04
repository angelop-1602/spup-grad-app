import { HistoryBackButton } from '@/components/history-back-button';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, Image } from 'lucide-react';
import { formatDate, headline, statusClass } from '../console-utils';

type TicketDetail = {
    ticket_number: string;
    status: string;
    category: string;
    priority: string;
    subject: string;
    description: string;
    reporter_guard: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    page_url: string | null;
    ip_address: string | null;
    user_agent: string | null;
    screenshot_original_name: string | null;
    screenshot_mime: string | null;
    screenshot_size: number | null;
    screenshot_url: string | null;
    created_at: string | null;
    resolved_at: string | null;
    resolved_by_developer: { name: string; email: string } | null;
    resolution_note: string | null;
    resolve_url: string;
};

type TicketShowProps = {
    ticket: TicketDetail;
};

function bytes(value: number | null) {
    if (!value) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let index = 0;

    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
    }

    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function DeveloperTicketShow({ ticket }: TicketShowProps) {
    const form = useForm({
        resolution_note: ticket.resolution_note ?? '',
    });
    const isResolved = ticket.status === 'resolved';

    const resolveTicket = () => {
        form.post(ticket.resolve_url, {
            preserveScroll: true,
        });
    };

    return (
        <DeveloperConsoleLayout
            title={ticket.ticket_number}
            description="Review the issue report context, screenshot, and resolution status."
        >
            <Head title={`Ticket ${ticket.ticket_number}`} />

            <div>
                <HistoryBackButton
                    variant="outline"
                    size="sm"
                    fallbackHref="/developer/tickets"
                    label="Back to tickets"
                />
            </div>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {ticket.subject}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Submitted {formatDate(ticket.created_at)}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant="outline"
                                    className={statusClass[ticket.status] ?? ''}
                                >
                                    {headline(ticket.status)}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={
                                        statusClass[ticket.priority] ?? ''
                                    }
                                >
                                    {headline(ticket.priority)}
                                </Badge>
                                <Badge variant="outline">
                                    {headline(ticket.category)}
                                </Badge>
                            </div>
                        </div>
                        <div className="rounded-lg border bg-background/80 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                            {ticket.description}
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Screenshot Attachment
                        </h2>
                        {ticket.screenshot_url ? (
                            <div className="mt-4 space-y-3">
                                <div className="grid gap-3 text-sm sm:grid-cols-3">
                                    <div className="rounded-lg border bg-background/80 p-3">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            File
                                        </p>
                                        <p className="mt-1 break-all">
                                            {ticket.screenshot_original_name ??
                                                'Screenshot'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-background/80 p-3">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Type
                                        </p>
                                        <p className="mt-1">
                                            {ticket.screenshot_mime ?? '-'}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-background/80 p-3">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Size
                                        </p>
                                        <p className="mt-1">
                                            {bytes(ticket.screenshot_size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-lg border bg-muted">
                                    <img
                                        src={ticket.screenshot_url}
                                        alt="Applicant issue screenshot"
                                        className="max-h-[36rem] w-full object-contain"
                                    />
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <a
                                        href={ticket.screenshot_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink className="size-4" />
                                        Open screenshot
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                <Image className="size-4" />
                                No screenshot was attached to this report.
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Reporter Context
                        </h2>
                        <dl className="mt-4 space-y-3 text-sm">
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground uppercase">
                                    Reporter
                                </dt>
                                <dd className="mt-1">
                                    {ticket.reporter_name ?? 'Applicant'}
                                </dd>
                                <dd className="text-muted-foreground">
                                    {ticket.reporter_email ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground uppercase">
                                    Reporter Type
                                </dt>
                                <dd className="mt-1">
                                    {headline(ticket.reporter_guard ?? 'guest')}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground uppercase">
                                    Page URL
                                </dt>
                                <dd className="mt-1 break-all">
                                    {ticket.page_url ? (
                                        <a
                                            href={ticket.page_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline-offset-4 hover:underline"
                                        >
                                            {ticket.page_url}
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground uppercase">
                                    IP Address
                                </dt>
                                <dd className="mt-1">
                                    {ticket.ip_address ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-muted-foreground uppercase">
                                    Browser
                                </dt>
                                <dd className="mt-1 break-words text-muted-foreground">
                                    {ticket.user_agent ?? '-'}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <h2 className="text-lg font-semibold">Resolution</h2>
                        {isResolved ? (
                            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                                <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="size-4" />
                                    Resolved {formatDate(ticket.resolved_at)}
                                </p>
                                {ticket.resolved_by_developer ? (
                                    <p className="mt-2 text-muted-foreground">
                                        By {ticket.resolved_by_developer.name}
                                    </p>
                                ) : null}
                                {ticket.resolution_note ? (
                                    <p className="mt-3 whitespace-pre-wrap">
                                        {ticket.resolution_note}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="resolution_note">
                                        Resolution note
                                    </Label>
                                    <Textarea
                                        id="resolution_note"
                                        value={form.data.resolution_note}
                                        onChange={(event) =>
                                            form.setData(
                                                'resolution_note',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Optional note about the fix or action taken"
                                        rows={5}
                                    />
                                    <InputError
                                        message={form.errors.resolution_note}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={resolveTicket}
                                    disabled={form.processing}
                                    className="w-full"
                                >
                                    <CheckCircle2 className="size-4" />
                                    {form.processing
                                        ? 'Resolving...'
                                        : 'Mark resolved'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </DeveloperConsoleLayout>
    );
}
