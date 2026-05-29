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
import { Download, RefreshCw } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
    cleanFilters,
    formatDate,
    headline,
    shortClassName,
    statusClass,
    type Paginated,
    type SystemEvent,
} from './console-utils';

type EventsProps = {
    eventFilters: {
        modules: string[];
        actions: string[];
        severities: string[];
        statuses: string[];
        actors: string[];
        subjects: string[];
    };
    events: Paginated<SystemEvent>;
    filters: Record<string, string | null>;
};

export default function DeveloperEvents({
    eventFilters,
    events,
    filters,
}: EventsProps) {
    const [filterData, setFilterData] = useState<Record<string, string | null>>(
        {
            module: filters.module ?? 'all',
            action: filters.action ?? 'all',
            severity: filters.severity ?? 'all',
            status: filters.status ?? 'all',
            actor_guard: filters.actor_guard ?? 'all',
            subject_type: filters.subject_type ?? 'all',
            subject_id: filters.subject_id ?? '',
            search: filters.search ?? '',
            from: filters.from ?? '',
            to: filters.to ?? '',
        },
    );

    const queryString = useMemo(
        () => new URLSearchParams(cleanFilters(filterData)).toString(),
        [filterData],
    );

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/developer/events', cleanFilters(filterData), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <DeveloperConsoleLayout
            title="Audit Trail"
            description="Search application, email, support, and system events captured by the audit logger."
        >
            <Head title="Developer Audit Trail" />

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            System Events
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {events.total} events found
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.get('/developer/events')}
                        >
                            <RefreshCw className="size-4" />
                            Reset
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={`/developer/events/export${
                                    queryString ? `?${queryString}` : ''
                                }`}
                            >
                                <Download className="size-4" />
                                Export CSV
                            </a>
                        </Button>
                    </div>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                >
                    <div className="grid gap-1.5">
                        <Label>Module</Label>
                        <Select
                            value={filterData.module ?? 'all'}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    module: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {eventFilters.modules.map((module) => (
                                    <SelectItem key={module} value={module}>
                                        {module}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Severity</Label>
                        <Select
                            value={filterData.severity ?? 'all'}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    severity: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {eventFilters.severities.map((severity) => (
                                    <SelectItem key={severity} value={severity}>
                                        {headline(severity)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Actor</Label>
                        <Select
                            value={filterData.actor_guard ?? 'all'}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    actor_guard: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {eventFilters.actors.map((actor) => (
                                    <SelectItem key={actor} value={actor}>
                                        {headline(actor)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="search">Search</Label>
                        <Input
                            id="search"
                            value={filterData.search ?? ''}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            placeholder="Message, actor, action"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label>Subject</Label>
                        <Select
                            value={filterData.subject_type ?? 'all'}
                            onValueChange={(value) =>
                                setFilterData((current) => ({
                                    ...current,
                                    subject_type: value,
                                }))
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                {eventFilters.subjects.map((subject) => (
                                    <SelectItem key={subject} value={subject}>
                                        {headline(
                                            shortClassName(subject) ?? subject,
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="subject_id">Subject ID</Label>
                        <Input
                            id="subject_id"
                            inputMode="numeric"
                            value={filterData.subject_id ?? ''}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    subject_id: event.target.value,
                                }))
                            }
                            placeholder="Record ID"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="from">From</Label>
                        <Input
                            id="from"
                            type="date"
                            value={filterData.from ?? ''}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    from: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="to">To</Label>
                        <Input
                            id="to"
                            type="date"
                            value={filterData.to ?? ''}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    to: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="flex items-end xl:col-span-2">
                        <Button type="submit" className="w-full xl:w-auto">
                            Apply filters
                        </Button>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[980px] text-sm">
                        <thead className="bg-muted/60 text-left">
                            <tr>
                                <th className="px-3 py-2 font-medium">Date</th>
                                <th className="px-3 py-2 font-medium">
                                    Event
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Actor
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Subject
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Status
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Message
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.data.map((event) => (
                                <tr
                                    key={event.id}
                                    className="border-t align-top"
                                >
                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                        {formatDate(event.created_at)}
                                    </td>
                                    <td className="px-3 py-3">
                                        <p className="font-medium">
                                            {event.module}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {event.action}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3">
                                        <p>{event.actor_label ?? 'System'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {event.actor_guard ?? 'system'}
                                        </p>
                                    </td>
                                    <td className="px-3 py-3 text-xs text-muted-foreground">
                                        {event.subject_type ? (
                                            <>
                                                <p>
                                                    {headline(
                                                        shortClassName(
                                                            event.subject_type,
                                                        ) ?? event.subject_type,
                                                    )}
                                                </p>
                                                <p>#{event.subject_id}</p>
                                            </>
                                        ) : (
                                            'None'
                                        )}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex flex-wrap gap-1">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    statusClass[
                                                        event.status
                                                    ] ?? ''
                                                }
                                            >
                                                {headline(event.status)}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    statusClass[
                                                        event.severity
                                                    ] ?? ''
                                                }
                                            >
                                                {headline(event.severity)}
                                            </Badge>
                                        </div>
                                    </td>
                                    <td className="max-w-md px-3 py-3 text-muted-foreground">
                                        {event.message ?? '-'}
                                    </td>
                                </tr>
                            ))}
                            {events.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-8 text-center text-muted-foreground"
                                    >
                                        No events found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {events.links.map((link, index) => (
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
