import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ApplyLayout from '@/layouts/apply-layout';
import applyRoutes from '@/routes/apply';
import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock3, Mail, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const GUEST_VERIFICATION_EVENT_KEY = 'guest_application_verified';
const RESEND_COOLDOWN_SECONDS = 60;

function formatCooldown(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}

interface PendingDraftProps {
    draft: {
        id: number;
        email: string;
        verified_at: string | null;
        access_url: string | null;
    };
}

export default function PendingDraftPage({ draft }: PendingDraftProps) {
    const resendForm = useForm({});
    const changeEmailForm = useForm({
        email: draft.email,
    });
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const wasVerifiedRef = useRef(!!draft.verified_at);

    const isVerified = !!draft.verified_at;
    const resendCooldownStorageKey = `guest-application-resend:${draft.id}`;

    const continueToPortal = (accessUrl?: string | null) => {
        if (!accessUrl || isRedirecting) {
            return;
        }

        setIsRedirecting(true);
        window.location.assign(accessUrl);
    };

    const resendEmail = () => {
        if (!isVerified) {
            const expiresAt = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;

            window.localStorage.setItem(
                resendCooldownStorageKey,
                String(expiresAt),
            );
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
        }

        resendForm.post(applyRoutes.pending.resend(draft.id).url);
    };

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== GUEST_VERIFICATION_EVENT_KEY || !event.newValue) {
                return;
            }

            try {
                const payload = JSON.parse(event.newValue) as {
                    draftId?: number;
                    accessUrl?: string;
                };

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
        if (isVerified) {
            setResendCooldown(0);
            window.localStorage.removeItem(resendCooldownStorageKey);
            return;
        }

        const updateCooldown = () => {
            const expiresAt = Number(
                window.localStorage.getItem(resendCooldownStorageKey) ?? 0,
            );
            const remaining = Math.max(
                0,
                Math.ceil((expiresAt - Date.now()) / 1000),
            );

            setResendCooldown(remaining);

            if (remaining === 0) {
                window.localStorage.removeItem(resendCooldownStorageKey);
            }
        };

        updateCooldown();
        const interval = window.setInterval(updateCooldown, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [isVerified, resendCooldownStorageKey]);

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

            <div className="mx-auto max-w-4xl">
                <Card className="border-border/70 bg-background/80 shadow-2xl shadow-black/10 backdrop-blur dark:shadow-black/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            {isVerified ? (
                                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                            ) : (
                                <Mail className="h-6 w-6 text-emerald-600 dark:text-emerald-200" />
                            )}
                            {isVerified
                                ? 'Application verified'
                                : 'Check your email'}
                        </CardTitle>
                        <CardDescription>
                            {isVerified
                                ? 'Your graduation application is now active. Use the guest portal link below whenever you need to review or update it.'
                                : 'Your full application draft is saved. Verify your email to make it a real application and show it to the Registrar and coordinators.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!isVerified && (
                            <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                                <p className="text-sm text-muted-foreground">
                                    Verification was sent to{' '}
                                    <span className="font-semibold text-foreground">
                                        {draft.email}
                                    </span>
                                    . Make sure this email is active and
                                    accessible so you can receive the
                                    verification link.
                                </p>
                            </div>
                        )}

                        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
                            <Clock3 className="h-4 w-4" />
                            <AlertTitle>
                                {isVerified
                                    ? 'Verified and active'
                                    : 'Waiting for verification'}
                            </AlertTitle>
                            <AlertDescription>
                                {isVerified
                                    ? 'Only verified applications appear in admin and coordinator lists, and yours has already been activated.'
                                    : 'Until you click the email link, this application draft stays hidden from admin and coordinator dashboards.'}
                            </AlertDescription>
                        </Alert>

                        {isRedirecting && (
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-50">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>
                                    Opening your application
                                </AlertTitle>
                                <AlertDescription>
                                    Your email was confirmed in another tab.
                                    We&apos;re taking you to your graduation
                                    application now.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-col items-center gap-2">
                            <Button
                                type="button"
                                className="w-full sm:w-auto"
                                onClick={resendEmail}
                                disabled={
                                    resendForm.processing ||
                                    (!isVerified && resendCooldown > 0)
                                }
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                {resendForm.processing
                                    ? 'Sending...'
                                    : isVerified
                                      ? 'Email a new access link'
                                      : resendCooldown > 0
                                        ? `Resend in ${formatCooldown(resendCooldown)}`
                                        : 'Resend verification email'}
                            </Button>

                            {!isVerified && (
                                <Button
                                    type="button"
                                    variant="link"
                                    className="h-auto px-0 py-1 text-muted-foreground"
                                    onClick={() =>
                                        setShowEmailForm((current) => !current)
                                    }
                                >
                                    Wrong email?
                                </Button>
                            )}

                            {isVerified && draft.access_url && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                        continueToPortal(draft.access_url)
                                    }
                                    disabled={isRedirecting}
                                >
                                    Open application
                                </Button>
                            )}
                        </div>

                        {!isVerified && showEmailForm && (
                            <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Change email address
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Enter the correct active email address.
                                        A fresh verification link will be sent
                                        after updating.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="change_email">
                                        Email address
                                    </Label>
                                    <Input
                                        id="change_email"
                                        type="email"
                                        value={changeEmailForm.data.email}
                                        onChange={(event) =>
                                            changeEmailForm.setData(
                                                'email',
                                                event.target.value,
                                            )
                                        }
                                        disabled={changeEmailForm.processing}
                                        className="bg-background/90"
                                    />
                                    <InputError
                                        message={changeEmailForm.errors.email}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowEmailForm(false)}
                                        disabled={changeEmailForm.processing}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            changeEmailForm.post(
                                                applyRoutes.pending.changeEmail(
                                                    draft.id,
                                                ).url,
                                            )
                                        }
                                        disabled={changeEmailForm.processing}
                                    >
                                        {changeEmailForm.processing
                                            ? 'Updating...'
                                            : 'Update email and resend'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Resending verification emails is rate-limited. If
                            you request too many links, wait a few minutes
                            before trying again.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </ApplyLayout>
    );
}
