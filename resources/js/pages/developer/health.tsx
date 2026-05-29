import { Badge } from '@/components/ui/badge';
import DeveloperConsoleLayout from '@/layouts/developer-console-layout';
import { Head } from '@inertiajs/react';
import { Activity, AlertTriangle } from 'lucide-react';
import { headline, statusClass, type HealthCard } from './console-utils';

type HealthProps = {
    healthCards: HealthCard[];
    recentLogLines: string[];
};

export default function DeveloperHealth({
    healthCards,
    recentLogLines,
}: HealthProps) {
    return (
        <DeveloperConsoleLayout
            title="System Health"
            description="Review service checks, deployment details, storage status, and recent application warning or error logs."
        >
            <Head title="Developer System Health" />

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

            <section className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="size-5 text-yellow-600" />
                    <h2 className="text-lg font-semibold">
                        Recent Application Warnings and Errors
                    </h2>
                </div>
                {recentLogLines.length > 0 ? (
                    <pre className="max-h-[32rem] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                        {recentLogLines.join('\n')}
                    </pre>
                ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        <Activity className="size-4" />
                        No recent warning, error, or critical log lines were
                        found.
                    </div>
                )}
            </section>
        </DeveloperConsoleLayout>
    );
}
