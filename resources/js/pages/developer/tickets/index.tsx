import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Camera, Filter, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
    formatDate,
    headline,
    statusClass,
    type Paginated,
    type SupportTicketListItem,
} from '../console-utils';

type TicketsIndexProps = {
    tickets: Paginated<SupportTicketListItem>;
    filters: {
        status: string;
        category: string;
        priority: string;
        search: string;
    };
    filterOptions: {
        statuses: string[];
        categories: string[];
        priorities: string[];
    };
    ticketCounts: {
        open: number;
        resolved: number;
        emergency: number;
    };
};

function cleanTicketFilters(filters: Record<string, string>) {
    return Object.entries(filters).reduce<Record<string, string>>(
        (cleaned, [key, value]) => {
            if (value !== '' && (value !== 'all' || key === 'status')) {
                cleaned[key] = value;
            }

            return cleaned;
        },
        {},
    );
}

export default function DeveloperTicketsIndex({
    tickets,
    filters,
    filterOptions,
    ticketCounts,
}: TicketsIndexProps) {
    const [filterData, setFilterData] = useState(filters);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/developer/tickets', cleanTicketFilters(filterData), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <DeveloperConsoleLayout
            title="Support Tickets"
            description="Review applicant issue reports submitted from the graduation application portal."
        >
            <Head title="Developer Support Tickets" />

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        Open
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                        {ticketCounts.open}
                    </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        Emergency
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                        {ticketCounts.emergency}
                    </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <p className="text-sm font-medium text-muted-foreground">
                        Resolved
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                        {ticketCounts.resolved}
                    </p>
                </div>
            </section>

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <form
                    onSubmit={applyFilters}
                    className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
                >
                    <div className="grid gap-1.5">
                        <Label>Status</Label>
                        <Select
                            value={filterData.status}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    status: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {filterOptions.statuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {headline(status)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Category</Label>
                        <Select
                            value={filterData.category}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    category: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {filterOptions.categories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {headline(category)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Priority</Label>
                        <Select
                            value={filterData.priority}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    priority: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {filterOptions.priorities.map((priority) => (
                                    <SelectItem key={priority} value={priority}>
                                        {headline(priority)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="ticket-search">Search</Label>
                        <Input
                            id="ticket-search"
                            value={filterData.search}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            placeholder="Ticket, reporter, issue"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button type="submit" className="flex-1">
                            <Filter className="size-4" />
                            Filter
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => router.get('/developer/tickets')}
                            aria-label="Reset ticket filters"
                        >
                            <RefreshCw className="size-4" />
                        </Button>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-muted/60 text-left">
                            <tr>
                                <th className="px-3 py-2 font-medium">
                                    Ticket
                                </th>
                                <th className="px-3 py-2 font-medium">Issue</th>
                                <th className="px-3 py-2 font-medium">
                                    Reporter
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Status
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Created
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Attachment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.data.map((ticket) => (
                                <tr
                                    key={ticket.ticket_number}
                                    className="cursor-pointer border-t align-top hover:bg-muted/40"
                                    role="link"
                                    tabIndex={0}
                                    onClick={() => router.visit(ticket.show_url)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            router.visit(ticket.show_url);
                                        }
                                    }}
                                >
                                    <td className="px-3 py-3">
                                        <span className="font-semibold">
                                            {ticket.ticket_number}
                                        </span>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {headline(ticket.category)}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3">
                                        <p className="font-medium">
                                            {ticket.subject}
                                        </p>
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
                                    <td className="px-3 py-3">
                                        <div className="flex flex-wrap gap-1">
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
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                        {formatDate(ticket.created_at)}
                                    </td>
                                    <td className="px-3 py-3 text-muted-foreground">
                                        {ticket.has_screenshot ? (
                                            <span className="inline-flex items-center gap-1">
                                                <Camera className="size-4" />
                                                Screenshot
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {tickets.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-8 text-center text-muted-foreground"
                                    >
                                        No support tickets match the current
                                        filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {tickets.links.map((link, index) => (
                        <Button
                            key={`${link.label}-${index}`}
                            variant={link.active ? 'default' : 'outline'}
                            size="sm"
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.get(link.url, undefined, {
                                    preserveScroll: true,
                                })
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </section>
        </DeveloperConsoleLayout>
    );
}
