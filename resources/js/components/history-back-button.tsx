import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

type HistoryBackButtonProps = Omit<
    ComponentProps<typeof Button>,
    'asChild' | 'onClick' | 'type'
> & {
    fallbackHref?: string;
    iconOnly?: boolean;
    label?: string;
    children?: ReactNode;
};

export function HistoryBackButton({
    fallbackHref,
    iconOnly = false,
    label = 'Back',
    children,
    ...props
}: HistoryBackButtonProps) {
    const ariaLabel = props['aria-label'];

    const goBack = () => {
        if (globalThis.history.length > 1) {
            globalThis.history.back();

            return;
        }

        if (fallbackHref) {
            router.visit(fallbackHref);

            return;
        }

        globalThis.history.back();
    };

    return (
        <Button
            {...props}
            type="button"
            aria-label={iconOnly ? (ariaLabel ?? label) : ariaLabel}
            onClick={goBack}
        >
            <ArrowLeft className="size-4" />
            {iconOnly ? null : (children ?? label)}
        </Button>
    );
}
