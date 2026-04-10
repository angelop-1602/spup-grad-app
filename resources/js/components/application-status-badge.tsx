import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export type ApplicationStatus = 'submitted' | 'pending' | 'approved' | 'incomplete';

interface StatusConfig {
    submitted: {
        label: string;
        color: string;
        icon: typeof Clock;
    };
    pending: {
        label: string;
        color: string;
        icon: typeof Clock;
    };
    approved: {
        label: string;
        color: string;
        icon: typeof CheckCircle2;
    };
    incomplete: {
        label: string;
        color: string;
        icon: typeof AlertCircle;
    };
}

const statusConfig: StatusConfig = {
    submitted: {
        label: 'Submitted',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: Clock,
    },
    pending: {
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock,
    },
    approved: {
        label: 'Approved',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle2,
    },
    incomplete: {
        label: 'Incomplete',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        icon: AlertCircle,
    },
};

interface ApplicationStatusBadgeProps {
    status: ApplicationStatus;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

export function ApplicationStatusBadge({
    status,
    size = 'md',
    showIcon = false,
    className = '',
}: ApplicationStatusBadgeProps) {
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${config.color} ${className}`}
        >
            {showIcon && <StatusIcon className="h-3 w-3" />}
            {config.label}
        </span>
    );
}

// Export the status config for use in other components if needed
export { statusConfig };

