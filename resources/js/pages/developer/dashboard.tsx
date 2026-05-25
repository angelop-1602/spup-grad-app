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
import { Head, router, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Download,
    LogOut,
    RefreshCw,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type HealthCard = {
    label: string;
    status: 'ok' | 'warning' | 'critical' | 'unknown' | string;
    value: string;
    message: string;
};

type SystemEvent = {
    id: number;
    module: string;
    action: string;
    status: string;
    severity: string;
    actor_guard: string | null;
    actor_label: string | null;
    subject_type: string | null;
    subject_id: number | null;
    message: string | null;
    created_at: string;
};

type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    from: number | null;
    to: number | null;
    total: number;
};

type ApplicationWindowOption = {
    id: number;
    title: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    applications_count: number;
};

type DashboardProps = {
    healthCards: HealthCard[];
    applicationMetrics: Record<string, string | number>;
    applicationMetricsScope: string;
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    eventFilters: {
        modules: string[];
        actions: string[];
        severities: string[];
        statuses: string[];
        actors: string[];
        subjects: string[];
    };
    events: Paginated<SystemEvent>;
    recentLogLines: string[];
    filters: Record<string, string | null>;
};

const statusClass: Record<string, string> = {
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning:
        'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    critical:
        'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    unknown:
        'border-muted-foreground/30 bg-muted text-muted-foreground',
    success:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    failed: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

function cleanFilters(filters: Record<string, string | null>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([key, value]) => value && (value !== 'all' || key === 'window_id'),
        ),
    ) as Record<string, string>;
}

function headline(value: string) {
    return value
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

function shortClassName(value: string | null) {
    return value ? (value.split('\\').pop() ?? value) : null;
}

export default function DeveloperDashboard({
    healthCards,
    applicationMetrics,
    applicationMetricsScope,
    applicationWindows,
    currentWindow,
    selectedWindowId,
    eventFilters,
    events,
    recentLogLines,
    filters,
}: DashboardProps) {
    const { auth } = usePage().props as {
        auth?: { developer?: { name?: string; email?: string } | null };
    };
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
            window_id:
                filters.window_id ??
                (selectedWindowId ? String(selectedWindowId) : 'all'),
        },
    );

    const queryString = useMemo(
        () => new URLSearchParams(cleanFilters(filterData)).toString(),
        [filterData],
    );
    const metricsQueryString = useMemo(() => {
        const windowFilter = cleanFilters({
            window_id: filterData.window_id ?? 'all',
        });

        return new URLSearchParams(windowFilter).toString();
    }, [filterData.window_id]);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/developer/dashboard', cleanFilters(filterData), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Developer Diagnostics" />

            <header className="border-b bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                            Developer Console
                        </p>
                        <h1 className="text-xl font-semibold">
                            System Audit & Diagnostics
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right text-sm sm:block">
                            <p className="font-medium">
                                {auth?.developer?.name ?? 'Developer'}
                            </p>
                            <p className="text-muted-foreground">
                                {auth?.developer?.email}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                router.post('/developer/logout', undefined, {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <LogOut className="size-4" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {healthCards.map((card) => (
                        <div
                            key={`${card.label}-${card.value}`}
                            className="rounded-lg border bg-card p-4 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {card.label}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={statusClass[card.status] ?? ''}
                                >
                                    {headline(card.status)}
                                </Badge>
                            </div>
                            <p className="mt-3 text-2xl font-semibold">
                                {card.value}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {card.message}
                            </p>
                        </div>
                    ))}
                </section>

                <section>
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Graduation Application Monitoring
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Showing application volume and processing health
                                for {applicationMetricsScope}.
                            </p>
                            {currentWindow ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Current active window: {currentWindow.title}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="grid min-w-72 gap-1.5">
                                <Label>Application Window</Label>
                                <Select
                                    value={filterData.window_id ?? 'all'}
                                    onValueChange={(value) => {
                                        const nextFilters = {
                                            ...filterData,
                                            window_id: value,
                                        };

                                        setFilterData(nextFilters);
                                        router.get(
                                            '/developer/dashboard',
                                            cleanFilters(nextFilters),
                                            {
                                                preserveScroll: true,
                                                preserveState: true,
                                            },
                                        );
                                    }}
                                >
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
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={`/developer/metrics/export${
                                        metricsQueryString
                                            ? `?${metricsQueryString}`
                                            : ''
                                    }`}
                                >
                                    <Download className="size-4" />
                                    Export metrics
                                </a>
                            </Button>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {Object.entries(applicationMetrics).map(
                            ([key, value]) => (
                                <div
                                    key={key}
                                    className="rounded-lg border bg-card p-4"
                                >
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {headline(key)}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold">
                                        {String(value)}
                                    </p>
                                </div>
                            ),
                        )}
                    </div>
                </section>

                <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Audit Trail
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {events.total} events found
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.get('/developer/dashboard')
                                }
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
                                        <SelectItem
                                            key={severity}
                                            value={severity}
                                        >
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
                                        <SelectItem
                                            key={subject}
                                            value={subject}
                                        >
                                            {headline(
                                                shortClassName(subject) ??
                                                    subject,
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
                                    <th className="px-3 py-2 font-medium">
                                        Date
                                    </th>
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
                                            {new Date(
                                                event.created_at,
                                            ).toLocaleString()}
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
                                                            ) ??
                                                                event.subject_type,
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
                                dangerouslySetInnerHTML={{
                                    __html: link.label,
                                }}
                            />
                        ))}
                    </div>
                </section>

                <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="size-5 text-yellow-600" />
                        <h2 className="text-lg font-semibold">
                            Recent Laravel Warnings and Errors
                        </h2>
                    </div>
                    {recentLogLines.length > 0 ? (
                        <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                            {recentLogLines.join('\n')}
                        </pre>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            <Activity className="size-4" />
                            No recent warning, error, or critical log lines were found.
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
