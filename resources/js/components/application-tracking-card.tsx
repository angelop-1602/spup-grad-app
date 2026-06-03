import { Badge } from '@/components/ui/badge';

export type ApplicationTracking = {
    tracking_code: string | null;
    tracking_pin: string | null;
    verification_status?: string | null;
    created_at?: string | null;
    verified_at?: string | null;
};

type ApplicationTrackingCardProps = {
    tracking?: ApplicationTracking | null;
    title?: string;
};

function headline(value: string | null | undefined) {
    return (value ?? '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
}

function formatDate(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export function ApplicationTrackingCard({
    tracking,
    title = 'Application Tracking',
}: ApplicationTrackingCardProps) {
    if (!tracking?.tracking_code && !tracking?.tracking_pin) {
        return null;
    }

    return (
        <section className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground">
                        Use these values when helping the applicant recover or
                        verify access.
                    </p>
                </div>
                {tracking.verification_status ? (
                    <Badge variant="outline">
                        {headline(tracking.verification_status)}
                    </Badge>
                ) : null}
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Tracking Code
                    </dt>
                    <dd>
                        <code className="rounded bg-background px-2 py-1 text-sm font-semibold">
                            {tracking.tracking_code ?? '-'}
                        </code>
                    </dd>
                </div>
                <div className="space-y-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Tracking PIN
                    </dt>
                    <dd>
                        <code className="rounded bg-background px-2 py-1 text-sm font-semibold">
                            {tracking.tracking_pin ?? '-'}
                        </code>
                    </dd>
                </div>
                <div className="space-y-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Created
                    </dt>
                    <dd className="text-sm">
                        {formatDate(tracking.created_at) ?? '-'}
                    </dd>
                </div>
                <div className="space-y-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Verified
                    </dt>
                    <dd className="text-sm">
                        {formatDate(tracking.verified_at) ?? 'Not verified'}
                    </dd>
                </div>
            </dl>
        </section>
    );
}
