import AuthLayout from '@/layouts/auth-layout';
import { Head } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

interface EmailVerifiedProps {
    user_id: number;
    already_verified?: boolean;
}

export default function EmailVerified({ user_id, already_verified = false }: EmailVerifiedProps) {
    useEffect(() => {
        // Store verification status in localStorage for the registration page to pick up
        localStorage.setItem('email_verified', 'true');
        localStorage.setItem('verified_user_id', user_id.toString());

        // Dispatch storage event for same-tab/window communication
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'email_verified',
            newValue: 'true',
        }));

        // Try to communicate with the registration page (if it's the opener)
        if (window.opener && !window.opener.closed) {
            try {
                window.opener.localStorage.setItem('email_verified', 'true');
                window.opener.localStorage.setItem('verified_user_id', user_id.toString());
                
                // Dispatch storage event on the opener window
                window.opener.dispatchEvent(new StorageEvent('storage', {
                    key: 'email_verified',
                    newValue: 'true',
                }));
            } catch (e) {
                // Cross-origin or other error, ignore
            }
        }

        // Close this window after a short delay
        const timer = setTimeout(() => {
            if (window.opener) {
                window.close();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [user_id]);

    return (
        <AuthLayout
            title="Email Verified"
            description="Your email address has been successfully verified."
        >
            <Head title="Email Verified" />

            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold">
                        Your account is verified
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {already_verified
                            ? 'Your email address was already verified. This window will close automatically and you will be logged in on the registration page.'
                            : 'Your email address has been successfully verified. This window will close automatically and you will be logged in on the registration page.'}
                    </p>
                </div>
            </div>
        </AuthLayout>
    );
}

