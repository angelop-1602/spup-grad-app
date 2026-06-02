import {
    compactDate,
    headline,
    staffStatusClass,
    windowStatus,
} from '@/components/staff-table-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Link, router } from '@inertiajs/react';
import { Calendar, MoreVertical, Search } from 'lucide-react';
import { FormEvent, useState, type ReactNode } from 'react';

export type ApplicationWindowRow = {
    id: number | string;
    key?: string;
    title: string;
    description: string | null;
    status?: string | null;
    start_date: string | null;
    end_date: string | null;
    applications_count: number;
    is_historical?: boolean;
    view_url?: string | null;
};

export type PaginatedApplicationWindows = {
    data: ApplicationWindowRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
};

export type WindowTableAction = {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
};

type ApplicationWindowsTableProps = {
    windows: PaginatedApplicationWindows;
    historicalWindows?: ApplicationWindowRow[];
    currentWindow?: ApplicationWindowRow | null;
    filters?: {
        search?: string;
    };
    indexUrl: string;
    title?: string;
    description?: string;
    searchPlaceholder?: string;
    createAction?: ReactNode;
    emptyMessage?: string;
    getActions: (window: ApplicationWindowRow) => WindowTableAction[];
};

function rowKey(window: ApplicationWindowRow) {
    return window.key ?? String(window.id);
}

export function ApplicationWindowsTable({
    windows,
    historicalWindows = [],
    currentWindow = null,
    filters = {},
    indexUrl,
    title = 'Application Window List',
    description,
    searchPlaceholder = 'Search windows...',
    createAction = null,
    emptyMessage = 'No application windows match the current search.',
    getActions,
}: ApplicationWindowsTableProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [isFiltering, setIsFiltering] = useState(false);
    const rows = [
        ...windows.data,
        ...historicalWindows.map((window) => ({
            ...window,
            key: `historical-${window.key ?? window.id}`,
        })),
    ];
    const actionSets = rows.map((row) => getActions(row));
    const showActionColumn = actionSets.some((actions) => actions.length !== 1);

    const visit = (page?: number) => {
        setIsFiltering(true);
        router.get(
            indexUrl,
            {
                search: search || undefined,
                page,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onFinish: () => setIsFiltering(false),
            },
        );
    };

    const applySearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        visit(1);
    };

    const openSoleAction = (actions: WindowTableAction[]) => {
        const action = actions[0];

        if (!action) {
            return;
        }

        if (action.href) {
            router.visit(action.href);
            return;
        }

        action.onClick?.();
    };

    return (
        <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">
                        {description ??
                            `${windows.total + historicalWindows.length} window${
                                windows.total + historicalWindows.length === 1
                                    ? ''
                                    : 's'
                            } found`}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                                placeholder={searchPlaceholder}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="h-9"
                            disabled={isFiltering}
                        >
                            {isFiltering ? 'Loading' : 'Search'}
                        </Button>
                    </form>
                    {createAction}
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-muted/60 text-left">
                        <tr>
                            <th className="px-3 py-2 font-medium">Window</th>
                            <th className="px-3 py-2 font-medium">Schedule</th>
                            <th className="px-3 py-2 font-medium">
                                Applications
                            </th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            {showActionColumn ? (
                                <th className="px-3 py-2 text-right font-medium">
                                    Actions
                                </th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((window, index) => {
                            const actions = actionSets[index] ?? [];
                            const status = windowStatus(window);
                            const isCurrent = currentWindow?.id === window.id;
                            const clickable =
                                !showActionColumn && actions.length === 1;

                            return (
                                <tr
                                    key={rowKey(window)}
                                    className={
                                        clickable
                                            ? 'cursor-pointer border-t align-top hover:bg-muted/40'
                                            : 'border-t align-top'
                                    }
                                    role={clickable ? 'link' : undefined}
                                    tabIndex={clickable ? 0 : undefined}
                                    onClick={
                                        clickable
                                            ? () => openSoleAction(actions)
                                            : undefined
                                    }
                                    onKeyDown={
                                        clickable
                                            ? (event) => {
                                                  if (
                                                      event.key === 'Enter' ||
                                                      event.key === ' '
                                                  ) {
                                                      event.preventDefault();
                                                      openSoleAction(actions);
                                                  }
                                              }
                                            : undefined
                                    }
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
                                                        (window.is_historical
                                                            ? 'Historical applications import'
                                                            : 'No description')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-muted-foreground">
                                        <p>
                                            Starts{' '}
                                            {compactDate(window.start_date)}
                                        </p>
                                        <p>
                                            Ends {compactDate(window.end_date)}
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
                                                    staffStatusClass[status] ??
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
                                            {window.is_historical ? (
                                                <Badge variant="secondary">
                                                    Historical
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </td>
                                    {showActionColumn ? (
                                        <td className="px-3 py-3 text-right">
                                            <WindowActions actions={actions} />
                                        </td>
                                    ) : null}
                                </tr>
                            );
                        })}
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={showActionColumn ? 5 : 4}
                                    className="px-3 py-10 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {windows.last_page > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing {windows.from ?? 0}-{windows.to ?? 0} of{' '}
                        {windows.total}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isFiltering || windows.current_page <= 1}
                            onClick={() => visit(windows.current_page - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                isFiltering ||
                                windows.current_page >= windows.last_page
                            }
                            onClick={() => visit(windows.current_page + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function WindowActions({ actions }: { actions: WindowTableAction[] }) {
    if (actions.length === 0) {
        return <span className="text-xs text-muted-foreground">-</span>;
    }

    if (actions.length <= 2) {
        return (
            <div className="flex flex-wrap justify-end gap-2">
                {actions.map((action) =>
                    action.href ? (
                        <Button
                            key={action.label}
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                        >
                            <Link href={action.href}>
                                {action.icon}
                                {action.label}
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            key={action.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={action.onClick}
                        >
                            {action.icon}
                            {action.label}
                        </Button>
                    ),
                )}
            </div>
        );
    }

    const [primary, ...rest] = actions;

    return (
        <div className="flex justify-end gap-2">
            {primary.href ? (
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                >
                    <Link href={primary.href}>
                        {primary.icon}
                        {primary.label}
                    </Link>
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={primary.onClick}
                >
                    {primary.icon}
                    {primary.label}
                </Button>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">More actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {rest.map((action) =>
                        action.href ? (
                            <DropdownMenuItem asChild key={action.label}>
                                <Link href={action.href}>
                                    {action.icon}
                                    {action.label}
                                </Link>
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                key={action.label}
                                onClick={action.onClick}
                            >
                                {action.icon}
                                {action.label}
                            </DropdownMenuItem>
                        ),
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
