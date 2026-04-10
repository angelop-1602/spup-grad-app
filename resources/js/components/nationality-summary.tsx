import { Badge } from '@/components/ui/badge';

interface Nationality {
    nationality: string;
    count: number;
}

interface NationalitySummaryProps {
    nationalities: Nationality[];
    compact?: boolean;
    inline?: boolean;
}

export function NationalitySummary({
    nationalities,
    compact = false,
    inline = false,
}: NationalitySummaryProps) {
    if (!nationalities || nationalities.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">N/A</span>
        );
    }

    const sorted = [...nationalities].sort((a, b) => b.count - a.count);

    if (inline) {
        // For major level - ultra compact
        return (
            <span className="text-xs text-muted-foreground">
                {sorted.map((n, i) => (
                    <span key={i}>
                        {n.nationality}: {n.count}
                        {i < sorted.length - 1 && ', '}
                    </span>
                ))}
            </span>
        );
    }

    if (compact) {
        // For program level - compact badges
        return (
            <div className="flex flex-wrap gap-1">
                {sorted.map((n) => (
                    <Badge key={n.nationality} variant="outline" className="text-xs">
                        {n.nationality}: {n.count}
                    </Badge>
                ))}
            </div>
        );
    }

    // For department level - full list
    return (
        <div className="space-y-1">
            {sorted.map((n) => (
                <div key={n.nationality} className="flex items-center justify-between text-xs">
                    <span>{n.nationality}</span>
                    <Badge variant="outline" className="text-xs">{n.count}</Badge>
                </div>
            ))}
        </div>
    );
}

