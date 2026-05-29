import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    Download,
    FileText,
    HeartPulse,
} from 'lucide-react';
import {
    formatDate,
    headline,
    statusClass,
    type ApplicationWindowOption,
    type HealthCard,
    type ManualVerificationDraft,
    type SupportTicketListItem,
} from './console-utils';

type DashboardProps = {
    healthCards: HealthCard[];
    applicationMetrics: Record<string, string | number>;
    applicationMetricsScope: string;
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    manualVerificationDrafts: ManualVerificationDraft[];
    ticketSummary: {
        open: number;
        resolved: number;
        newToday: number;
        emergency: number;
    };
    recentSupportTickets: SupportTicketListItem[];
};

export default function DeveloperDashboard({
    healthCards,
    applicationMetrics,
    applicationMetricsScope,
    currentWindow,
    selectedWindowId,
    manualVerificationDrafts,
    ticketSummary,
    recentSupportTickets,
}: DashboardProps) {
    const criticalHealth = healthCards.filter((card) =>
        ['critical', 'warning', 'unknown'].includes(card.status),
    );
    const metricsQuery = selectedWindowId
        ? `?window_id=${selectedWindowId}`
        : '';

    return (
        <DeveloperConsoleLayout
            title="Help Desk Dashboard"
            description="Monitor urgent applicant issues, application activity, manual verification, and platform health from one console."
        >
            <Head title="Developer Dashboard" />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            Open Tickets
                        </p>
                        <ClipboardList className="size-5 text-blue-600" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">
                        {ticketSummary.open}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {ticketSummary.newToday} new today
                    </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            Emergency Tickets
                        </p>
                        <AlertTriangle className="size-5 text-red-600" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">
                        {ticketSummary.emergency}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Open reports marked emergency
                    </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            Manual Verification
                        </p>
                        <CheckCircle2 className="size-5 text-emerald-600" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">
                        {manualVerificationDrafts.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Drafts waiting for email verification
                    </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-muted-foreground">
                            System Attention
                        </p>
                        <HeartPulse className="size-5 text-yellow-600" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">
                        {criticalHealth.length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Warning, critical, or unknown checks
                    </p>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Recent Issue Reports
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Latest applicant reports submitted through the
                                always-visible help button.
                            </p>
                        </div>
                        <Button asChild size="sm">
                            <Link href="/developer/tickets">
                                View all tickets
                            </Link>
                        </Button>
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-muted/60 text-left">
                                <tr>
                                    <th className="px-3 py-2 font-medium">
                                        Ticket
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Issue
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Priority
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Reporter
                                    </th>
                                    <th className="px-3 py-2 font-medium">
                                        Created
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSupportTickets.map((ticket) => (
                                    <tr
                                        key={ticket.ticket_number}
                                        className="border-t align-top"
                                    >
                                        <td className="px-3 py-3">
                                            <Link
                                                href={ticket.show_url}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {ticket.ticket_number}
                                            </Link>
                                            <div className="mt-1">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        statusClass[
                                                            ticket.status
                                                        ] ?? ''
                                                    }
                                                >
                                                    {headline(ticket.status)}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium">
                                                {ticket.subject}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {headline(ticket.category)}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    statusClass[
                                                        ticket.priority
                                                    ] ?? ''
                                                }
                                            >
                                                {headline(ticket.priority)}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            <p>
                                                {ticket.reporter_name ??
                                                    'Applicant'}
                                            </p>
                                            <p className="text-xs">
                                                {ticket.reporter_email ?? '-'}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-muted-foreground">
                                            {formatDate(ticket.created_at)}
                                        </td>
                                    </tr>
                                ))}
                                {recentSupportTickets.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-3 py-8 text-center text-muted-foreground"
                                        >
                                            No issue reports have been
                                            submitted yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Application Monitoring
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {applicationMetricsScope}
                                </p>
                                {currentWindow ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Active window: {currentWindow.title}
                                    </p>
                                ) : null}
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={`/developer/metrics/export${metricsQuery}`}
                                >
                                    <Download className="size-4" />
                                    Export
                                </a>
                            </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {Object.entries(applicationMetrics)
                                .slice(0, 8)
                                .map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="rounded-lg border bg-background/80 p-3"
                                    >
                                        <p className="text-xs font-medium text-muted-foreground">
                                            {headline(key)}
                                        </p>
                                        <p className="mt-2 text-lg font-semibold">
                                            {String(value)}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Health Attention
                        </h2>
                        <div className="mt-3 space-y-2">
                            {(criticalHealth.length
                                ? criticalHealth.slice(0, 5)
                                : healthCards.slice(0, 5)
                            ).map((card) => (
                                <div
                                    key={`${card.label}-${card.value}`}
                                    className="flex items-start justify-between gap-3 rounded-lg border bg-background/80 p-3"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {card.label}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {card.message}
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className={
                                            statusClass[card.status] ?? ''
                                        }
                                    >
                                        {headline(card.status)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="mt-3"
                        >
                            <Link href="/developer/health">
                                Open health page
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Pending Manual Verification
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Emergency fallback for applicants who cannot
                            complete email verification.
                        </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/developer/manual-verification">
                            Review drafts
                        </Link>
                    </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {manualVerificationDrafts.slice(0, 4).map((draft) => (
                        <div
                            key={draft.id}
                            className="rounded-lg border bg-background/80 p-3"
                        >
                            <div className="flex items-start gap-2">
                                <FileText className="mt-0.5 size-4 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="truncate font-medium">
                                        {draft.applicant_name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {draft.email}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs">
                                <code className="rounded bg-muted px-2 py-1 font-semibold">
                                    {draft.tracking_code}
                                </code>
                                <code className="rounded bg-muted px-2 py-1 font-semibold">
                                    PIN {draft.tracking_pin}
                                </code>
                            </div>
                        </div>
                    ))}
                    {manualVerificationDrafts.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            No drafts are waiting for manual verification.
                        </div>
                    )}
                </div>
            </section>
        </DeveloperConsoleLayout>
    );
}
