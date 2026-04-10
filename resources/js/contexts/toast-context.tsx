import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '@/components/ui/toast';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface ToastMessage {
    id: string;
    variant: ToastVariant;
    title?: string;
    description: string;
    duration?: number;
}

interface ToastContextType {
    toasts: ToastMessage[];
    addToast: (message: Omit<ToastMessage, 'id'>) => string; // Returns the toast ID
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastMessage = {
            ...message,
            id,
            duration: message.duration ?? 5000,
        };
        setToasts((prev) => [...prev, newToast]);

        // Auto-remove toast after duration
        if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, newToast.duration);
        }
        
        return id; // Return the toast ID so it can be removed manually
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div
            className="pointer-events-none fixed top-0 left-1/2 z-[100] flex max-h-screen w-full -translate-x-1/2 flex-col items-center p-4 sm:top-4 md:max-w-[420px]"
            aria-live="polite"
            aria-label="Notifications"
            role="region"
        >
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    variant={toast.variant}
                    title={toast.title}
                    description={toast.description}
                    onClose={() => onRemove(toast.id)}
                    className="pointer-events-auto mt-2 w-full first:mt-0 last:mb-0"
                />
            ))}
        </div>
    );
}

