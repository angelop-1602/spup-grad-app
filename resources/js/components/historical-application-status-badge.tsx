import type { HistoricalStatus } from '@/types/historical-graduation-application';
import { AlertCircle, CheckCircle2, Clock, HelpCircle } from 'lucide-react';

const statusConfig: Record<
    HistoricalStatus,
    {
        label: string;
        color: string;
        icon: typeof Clock;
    }
> = {
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle2,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock,
    },
    incomplete: {
        label: 'Incomplete',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        icon: AlertCircle,
    },
    unknown: {
        label: 'Unknown',
        color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
        icon: HelpCircle,
    },
};

interface HistoricalApplicationStatusBadgeProps {
    status: HistoricalStatus;
    size?: 'sm' | 'md';
    showIcon?: boolean;
}

export function HistoricalApplicationStatusBadge({
    status,
    size = 'md',
    showIcon = false,
}: HistoricalApplicationStatusBadgeProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.color}`}
        >
            {showIcon ? <Icon className="h-3 w-3" /> : null}
            {config.label}
        </span>
    );
}
