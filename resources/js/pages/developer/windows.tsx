import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Search, ShieldQuestion } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { formatDate, headline, statusClass } from './console-utils';

type DeveloperWindow = {
    id: number;
    title: string;
    description: string | null;
    status?: string;
    start_date: string | null;
    end_date: string | null;
    applications_count: number;
};

type PaginatedWindows = {
    data: DeveloperWindow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type DeveloperWindowsProps = {
    windows: PaginatedWindows;
    currentWindow: DeveloperWindow | null;
    filters?: {
        search?: string;
    };
};

function windowStatus(window: DeveloperWindow) {
    if (window.status) {
        return window.status;
    }

    const now = new Date();
    const start = window.start_date ? new Date(window.start_date) : null;
    const end = window.end_date ? new Date(window.end_date) : null;

    if (start && end && now >= start && now <= end) {
        return 'active';
    }

    if (start && now < start) {
        return 'upcoming';
    }

    return 'ended';
}

export default function DeveloperWindows({
    windows,
    currentWindow,
    filters,
}: DeveloperWindowsProps) {
    const [search, setSearch] = useState(filters?.search ?? '');

    const applySearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/developer/windows',
            { search: search || undefined },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const changePage = (page: number) => {
        router.get(
            '/developer/windows',
            {
                search: search || undefined,
                page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <DeveloperConsoleLayout
            title="Application Windows"
            description="Review every graduation application window and jump into window-specific diagnostics."
        >
            <Head title="Developer Application Windows" />

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">
                            Application Window List
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {windows.total} window
                            {windows.total === 1 ? '' : 's'} found
                        </p>
                    </div>
                    <form
                        onSubmit={applySearch}
                        className="flex w-full gap-2 lg:w-96"
                    >
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search windows..."
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit">Search</Button>
                    </form>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[820px] text-sm">
                        <thead className="bg-muted/60 text-left">
                            <tr>
                                <th className="px-3 py-2 font-medium">
                                    Window
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Schedule
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Applications
                                </th>
                                <th className="px-3 py-2 font-medium">
                                    Status
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {windows.data.map((window) => {
                                const status = windowStatus(window);
                                const isCurrent =
                                    currentWindow?.id === window.id;

                                return (
                                    <tr
                                        key={window.id}
                                        className="border-t align-top"
                                    >
                                        <td className="px-3 py-3">
                                            <div className="flex items-start gap-2">
                                                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                <div className="min-w-0">
                                                    <p className="font-medium">
                                                        {window.title}
                                                    </p>
                                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                        {window.description ||
                                                            'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            <p>
                                                Starts{' '}
                                                {formatDate(window.start_date)}
                                            </p>
                                            <p>
                                                Ends{' '}
                                                {formatDate(window.end_date)}
                                            </p>
                                        </td>
                                        <td className="px-3 py-3">
                                            {window.applications_count}
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        statusClass[status] ??
                                                        ''
                                                    }
                                                >
                                                    {headline(status)}
                                                </Badge>
                                                {isCurrent ? (
                                                    <Badge variant="secondary">
                                                        Current
                                                    </Badge>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Link
                                                    href={`/developer/windows/${window.id}`}
                                                >
                                                    <ShieldQuestion className="size-4" />
                                                    View Window
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {windows.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-3 py-10 text-center text-muted-foreground"
                                    >
                                        No application windows match the current
                                        search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {windows.last_page > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            Showing {windows.from ?? 0}-{windows.to ?? 0} of{' '}
                            {windows.total}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={windows.current_page <= 1}
                                onClick={() =>
                                    changePage(windows.current_page - 1)
                                }
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    windows.current_page >= windows.last_page
                                }
                                onClick={() =>
                                    changePage(windows.current_page + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </section>
        </DeveloperConsoleLayout>
    );
}
