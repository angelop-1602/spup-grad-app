import {
    ManualVerificationTable,
    type ManualVerificationRecord,
} from '@/components/manual-verification-table';
import {
    cleanStaffFilters,
    headline,
    type ApplicationWindowOption,
} from '@/components/staff-table-utils';
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
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

export type ManualVerificationPagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
};

type ManualVerificationPanelProps = {
    records: ManualVerificationRecord[];
    pagination?: ManualVerificationPagination | null;
    applicationWindows: ApplicationWindowOption[];
    currentWindow: ApplicationWindowOption | null;
    selectedWindowId: number | null;
    filters?: Record<string, string | null | undefined>;
    actionUrl: string;
    verifyingId?: number | null;
    onVerify: (record: ManualVerificationRecord) => void;
    title?: string;
    description?: string;
    emptyMessage?: string;
    showProgram?: boolean;
    applicationActionLabel?: string;
};

export function ManualVerificationPanel({
    records,
    pagination = null,
    applicationWindows,
    currentWindow,
    selectedWindowId,
    filters = {},
    actionUrl,
    verifyingId = null,
    onVerify,
    title = 'Drafts Waiting for Verification',
    description = 'Tracking code and PIN are shown for applicant support.',
    emptyMessage,
    showProgram = false,
    applicationActionLabel,
}: ManualVerificationPanelProps) {
    const [windowId, setWindowId] = useState(
        filters.window_id ??
            (selectedWindowId ? String(selectedWindowId) : 'all'),
    );
    const [search, setSearch] = useState(filters.search ?? '');
    const [isFiltering, setIsFiltering] = useState(false);
    const total = pagination?.total ?? records.length;

    const visit = (nextFilters: {
        window_id?: string;
        search?: string;
        page?: number;
    }) => {
        setIsFiltering(true);
        router.get(
            actionUrl,
            cleanStaffFilters({
                window_id: nextFilters.window_id ?? windowId,
                search: nextFilters.search ?? search,
                page: nextFilters.page ? String(nextFilters.page) : null,
            }),
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onFinish: () => setIsFiltering(false),
            },
        );
    };

    const changeWindow = (value: string) => {
        setWindowId(value);
        visit({ window_id: value, page: 1 });
    };

    const applySearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        visit({ search, page: 1 });
    };

    return (
        <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">
                        {total} record{total === 1 ? '' : 's'} match the current
                        filters. {description}
                    </p>
                    {currentWindow ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Current active window: {currentWindow.title}
                        </p>
                    ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                            No active window is open. The default filter uses
                            the latest application window.
                        </p>
                    )}
                </div>
                <form
                    onSubmit={applySearch}
                    className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_minmax(14rem,18rem)_auto]"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="manual-verification-search">
                            Search
                        </Label>
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="manual-verification-search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Name, student ID, email, tracking"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
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
                    <div className="flex items-end">
                        <Button
                            type="submit"
                            disabled={isFiltering}
                            className="h-9"
                        >
                            <Search className="size-4" />
                            {isFiltering ? 'Loading' : 'Search'}
                        </Button>
                    </div>
                </form>
            </div>

            <ManualVerificationTable
                records={records}
                verifyingId={verifyingId}
                onVerify={onVerify}
                emptyMessage={emptyMessage}
                showProgram={showProgram}
                applicationActionLabel={applicationActionLabel}
            />

            {pagination && pagination.last_page > 1 ? (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        Showing {pagination.from ?? 0}-{pagination.to ?? 0} of{' '}
                        {pagination.total}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                isFiltering || pagination.current_page <= 1
                            }
                            onClick={() =>
                                visit({ page: pagination.current_page - 1 })
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                isFiltering ||
                                pagination.current_page >= pagination.last_page
                            }
                            onClick={() =>
                                visit({ page: pagination.current_page + 1 })
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
