import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const toastVariants = cva(
    'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
    {
        variants: {
            variant: {
                default: 'border bg-background text-foreground',
                success:
                    'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200',
                error:
                    'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200',
                warning:
                    'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
                info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface ToastProps extends React.ComponentPropsWithoutRef<'div'>, VariantProps<typeof toastVariants> {
    title?: string;
    description?: string;
    action?: React.ReactNode;
    onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
    ({ className, variant, title, description, action, onClose, ...props }, ref) => {
        const iconMap = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
            default: Info,
        };

        const Icon = variant ? iconMap[variant] : iconMap.default;

        return (
            <div
                ref={ref}
                className={cn(toastVariants({ variant }), className)}
                role="alert"
                aria-live={variant === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
                {...props}
            >
                <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 space-y-1">
                        {title && (
                            <div className="text-sm font-semibold" data-slot="alert-title">
                                {title}
                            </div>
                        )}
                        {description && (
                            <div className="text-sm opacity-90" data-slot="alert-description">
                                {description}
                            </div>
                        )}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6 rounded-md p-0 text-current opacity-0 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                        onClick={onClose}
                        aria-label="Close notification"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}
            </div>
        );
    }
);
Toast.displayName = 'Toast';

export { Toast, toastVariants };

