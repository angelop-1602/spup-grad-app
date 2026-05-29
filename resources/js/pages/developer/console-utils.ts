export type HealthCard = {
    label: string;
    status: string;
    value: string;
    message: string;
};

export type Paginated<T> = {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    from: number | null;
    to: number | null;
    total: number;
};

export type ApplicationWindowOption = {
    id: number;
    title: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    applications_count: number;
};

export type ManualVerificationDraft = {
    id: number;
    applicant_name: string;
    email: string;
    student_id: string;
    tracking_code: string;
    tracking_pin: string;
    window_title: string;
    application_number: string | null;
    created_at: string | null;
    verified_at: string | null;
};

export type SystemEvent = {
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

export type SupportTicketListItem = {
    id?: number;
    ticket_number: string;
    status: string;
    category: string;
    priority: string;
    subject: string;
    reporter_name: string | null;
    reporter_email: string | null;
    has_screenshot?: boolean;
    created_at: string | null;
    resolved_at?: string | null;
    show_url: string;
};

export const statusClass: Record<string, string> = {
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
    low: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    normal: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    high: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
    emergency: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

export function headline(value: string | null | undefined) {
    return (value ?? '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

export function cleanFilters(
    filters: Record<string, string | null>,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(filters).filter(
            ([key, value]) => value && (value !== 'all' || key === 'window_id'),
        ),
    ) as Record<string, string>;
}

export function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export function shortClassName(value: string | null) {
    return value ? (value.split('\\').pop() ?? value) : null;
}
