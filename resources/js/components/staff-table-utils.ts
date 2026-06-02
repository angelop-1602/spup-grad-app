export type ApplicationWindowOption = {
    id: number;
    title: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    applications_count?: number;
};

export const staffStatusClass: Record<string, string> = {
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    open: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    resolved:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning:
        'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    critical: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    unknown: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    success:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    failed: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    error: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    pending:
        'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    verified:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    needs_application:
        'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    submitted:
        'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    upcoming:
        'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    ended: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    approved:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    incomplete:
        'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    rejected: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

export function headline(value: string | null | undefined) {
    return (value ?? '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

export function formatStaffDate(value: string | null | undefined) {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function compactDate(value: string | null | undefined) {
    if (!value) return '-';

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

export function cleanStaffFilters(
    filters: Record<string, string | null | undefined>,
): Record<string, string> {
    return Object.entries(filters).reduce<Record<string, string>>(
        (cleaned, [key, value]) => {
            if (value && (value !== 'all' || key === 'window_id')) {
                cleaned[key] = value;
            }

            return cleaned;
        },
        {},
    );
}

export function windowStatus(window: {
    status?: string | null;
    start_date: string | null;
    end_date: string | null;
}) {
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
