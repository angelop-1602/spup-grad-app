import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useToast } from '@/contexts/toast-context';

/**
 * Component to handle Inertia flash messages and convert them to toasts.
 * This must be rendered inside an Inertia page component.
 */
export default function FlashToastHandler() {
    const { flash } = usePage().props as { flash?: { success?: string; error?: string; warning?: string; info?: string } };
    const { addToast } = useToast();

    useEffect(() => {
        if (flash) {
            if (flash.success) {
                addToast({
                    variant: 'success',
                    title: 'Success',
                    description: flash.success,
                });
            }
            if (flash.error) {
                addToast({
                    variant: 'error',
                    title: 'Error',
                    description: flash.error,
                    duration: 7000, // Errors stay longer
                });
            }
            if (flash.warning) {
                addToast({
                    variant: 'warning',
                    title: 'Warning',
                    description: flash.warning,
                });
            }
            if (flash.info) {
                addToast({
                    variant: 'info',
                    title: 'Information',
                    description: flash.info,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.success, flash?.error, flash?.warning, flash?.info]);

    return null;
}

