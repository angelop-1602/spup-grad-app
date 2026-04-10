import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import ApplyLayout from '@/layouts/apply-layout';
import applyRoutes from '@/routes/apply';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock3, Mail, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const GUEST_VERIFICATION_EVENT_KEY = 'guest_application_verified';

interface PendingDraftProps {
    draft: {
        id: number;
        email: string;
        student_id: string;
        tracking_code: string;
        tracking_pin: string;
        verified_at: string | null;
        has_portal_access: boolean;
        application_number: string | null;
        access_url: string | null;
        window: {
            id: number;
            title: string;
            start_date: string;
            end_date: string;
        };
    };
}

export default function PendingDraftPage({ draft }: PendingDraftProps) {
    const resendForm = useForm({});
    const changeEmailForm = useForm({
        email: draft.email,
    });
    const [isRedirecting, setIsRedirecting] = useState(false);
    const wasVerifiedRef = useRef(!!draft.verified_at);

    const isVerified = !!draft.verified_at;

    const continueToPortal = (accessUrl?: string | null) => {
        if (!accessUrl || isRedirecting) {
            return;
        }

        setIsRedirecting(true);
        window.location.assign(accessUrl);
    };

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== GUEST_VERIFICATION_EVENT_KEY || !event.newValue) {
                return;
            }

            try {
                const payload = JSON.parse(event.newValue) as { draftId?: number; accessUrl?: string };

                if (payload.draftId === draft.id) {
                    continueToPortal(payload.accessUrl);
                }
            } catch {
                // Ignore malformed cross-tab payloads.
            }
        };

        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [draft.id, isRedirecting]);

    useEffect(() => {
        if (!wasVerifiedRef.current && draft.verified_at && draft.access_url) {
            continueToPortal(draft.access_url);
        }

        wasVerifiedRef.current = !!draft.verified_at;
    }, [draft.access_url, draft.verified_at, isRedirecting]);

    useEffect(() => {
        if (draft.verified_at || isRedirecting) {
            return;
        }

        const interval = window.setInterval(() => {
            router.visit(applyRoutes.pending.show(draft.id).url, {
                method: 'get',
                only: ['draft'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 5000);

        return () => {
            window.clearInterval(interval);
        };
    }, [draft.verified_at, isRedirecting]);

    return (
        <ApplyLayout>
            <Head title="Check Your Email" />

            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-border/70 bg-background/80 shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            {isVerified ? <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-300" /> : <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-200" />}
                            {isVerified ? 'Application verified' : 'Check your email'}
                        </CardTitle>
                        <CardDescription>
                            {isVerified
                                ? 'Your graduation application is now active. Use the guest portal link below whenever you need to review or update it.'
                                : 'Your full application draft is saved. Verify your email to make it a real application and show it to the Registrar and coordinators.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
                            <Clock3 className="h-4 w-4" />
                            <AlertTitle>{isVerified ? 'Verified and active' : 'Waiting for verification'}</AlertTitle>
                            <AlertDescription>
                                {isVerified
                                    ? 'Only verified applications appear in admin and coordinator lists, and yours has already been activated.'
                                    : 'Until you click the email link, this application draft stays hidden from admin and coordinator dashboards.'}
                            </AlertDescription>
                        </Alert>

                        {isRedirecting && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Opening your application</AlertTitle>
                                <AlertDescription>
                                    Your email was confirmed in another tab. We&apos;re taking you to your graduation application now.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/30 p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Email</p>
                                <p className="mt-1 text-sm font-medium">{draft.email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Student ID</p>
                                <p className="mt-1 text-sm font-medium">{draft.student_id}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tracking code</p>
                                <p className="mt-1 text-sm font-medium">{draft.tracking_code}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tracking PIN</p>
                                <p className="mt-1 text-sm font-medium">{draft.tracking_pin}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Application window</p>
                                <p className="mt-1 text-sm font-medium">{draft.window.title}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Application number</p>
                                <p className="mt-1 text-sm font-medium">{draft.application_number || 'Will be assigned after verification'}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                type="button"
                                className="sm:w-auto"
                                onClick={() => resendForm.post(applyRoutes.pending.resend(draft.id).url)}
                                disabled={resendForm.processing}
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                {resendForm.processing
                                    ? 'Sending...'
                                    : isVerified
                                        ? 'Email a new access link'
                                        : 'Resend verification email'}
                            </Button>

                            {isVerified && draft.access_url && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="sm:w-auto"
                                    onClick={() => continueToPortal(draft.access_url)}
                                    disabled={isRedirecting}
                                >
                                    Open application
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70 bg-background/80 shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/20">
                    <CardHeader>
                        <CardTitle>Wrong email?</CardTitle>
                        <CardDescription>
                            {isVerified
                                ? 'Verified applications keep the confirmed email address. Use the emailed access link if you need to come back later.'
                                : 'You can change the email address before verification, and we will send a fresh verification link right away.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="change_email">
                                Email address
                            </Label>
                            <Input
                                id="change_email"
                                type="email"
                                value={changeEmailForm.data.email}
                                onChange={(event) => changeEmailForm.setData('email', event.target.value)}
                                disabled={isVerified || changeEmailForm.processing}
                                className="bg-background/90"
                            />
                            <InputError message={changeEmailForm.errors.email} />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => changeEmailForm.post(applyRoutes.pending.changeEmail(draft.id).url)}
                            disabled={isVerified || changeEmailForm.processing}
                        >
                            {changeEmailForm.processing ? 'Updating...' : 'Update email and resend'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </ApplyLayout>
    );
}
