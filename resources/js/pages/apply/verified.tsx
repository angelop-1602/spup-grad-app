import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ApplyLayout from '@/layouts/apply-layout';
import { Head } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, MailCheck } from 'lucide-react';
import { useEffect } from 'react';

const GUEST_VERIFICATION_EVENT_KEY = 'guest_application_verified';

interface VerifiedPageProps {
    draft: {
        id: number;
        tracking_code: string;
        tracking_pin: string;
        application_number: string | null;
        access_url: string;
    };
    alreadyVerified: boolean;
}

export default function GuestApplicationVerifiedPage({ draft, alreadyVerified }: VerifiedPageProps) {
    useEffect(() => {
        const payload = JSON.stringify({
            draftId: draft.id,
            accessUrl: draft.access_url,
            issuedAt: Date.now(),
        });

        localStorage.setItem(GUEST_VERIFICATION_EVENT_KEY, payload);
        window.dispatchEvent(new StorageEvent('storage', {
            key: GUEST_VERIFICATION_EVENT_KEY,
            newValue: payload,
        }));

        const closeTimer = window.setTimeout(() => {
            window.close();
        }, 900);

        const redirectTimer = window.setTimeout(() => {
            window.location.replace(draft.access_url);
        }, 1800);

        return () => {
            window.clearTimeout(closeTimer);
            window.clearTimeout(redirectTimer);
        };
    }, [draft.access_url, draft.id]);

    return (
        <ApplyLayout>
            <Head title="Email Verified" />

            <div className="mx-auto max-w-2xl">
                <Card className="border-border/70 bg-background/80 shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/20">
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                            <MailCheck className="h-7 w-7" />
                        </div>
                        <CardTitle className="text-2xl">
                            {alreadyVerified ? 'Email already verified' : 'Email verified'}
                        </CardTitle>
                        <CardDescription>
                            {alreadyVerified
                                ? 'This application was already active. We are reopening it for you now.'
                                : 'Your application is now active. If you still have the pending page open, it will continue automatically.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Redirecting to your application</AlertTitle>
                            <AlertDescription>
                                This tab will try to close automatically. If it stays open, we&apos;ll continue to your application here in a moment.
                            </AlertDescription>
                        </Alert>

                        <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tracking code</p>
                                <p className="mt-1 text-sm font-medium">{draft.tracking_code}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tracking PIN</p>
                                <p className="mt-1 text-sm font-medium">{draft.tracking_pin}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Application number</p>
                                <p className="mt-1 text-sm font-medium">{draft.application_number ?? 'Your application is being prepared.'}</p>
                            </div>
                        </div>

                        <Button type="button" className="w-full" onClick={() => window.location.replace(draft.access_url)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Continue to application
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </ApplyLayout>
    );
}
