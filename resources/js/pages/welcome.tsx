import { type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import { ArrowRight, AlertCircle, Info, Clock } from 'lucide-react';

import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type WindowStatus =
        | {
              status: 'upcoming' | 'active' | 'closed';
              name: string | null;
              opensAt: string | null;
              closesAt: string | null;
          }
    | null;

type TimeLeft =
    | {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }
    | null;

function formatIsoToReadable(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function CountdownInlineGlass({ timeLeft }: { timeLeft: NonNullable<TimeLeft> }) {
    const dd = String(timeLeft.days).padStart(2, '0');
    const hh = String(timeLeft.hours).padStart(2, '0');
    const mm = String(timeLeft.minutes).padStart(2, '0');
    const ss = String(timeLeft.seconds).padStart(2, '0');

    return (
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-white/90 ring-1 ring-white/20 backdrop-blur-xl shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
            <Clock className="size-4 text-white/80" />
            <span className="font-medium tabular-nums">
                {dd}d : {hh}h : {mm}m : {ss}s
            </span>
        </div>
    );
}

function CountdownTilesGlass({ timeLeft }: { timeLeft: NonNullable<TimeLeft> }) {
    const items = useMemo(
        () => [
            { value: timeLeft.days, label: 'Days' },
            { value: timeLeft.hours, label: 'Hours' },
            { value: timeLeft.minutes, label: 'Minutes' },
            { value: timeLeft.seconds, label: 'Seconds' },
        ],
        [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds]
    );

    return (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="relative overflow-hidden rounded-2xl bg-white/12 px-2 py-2 text-center ring-1 ring-white/20 backdrop-blur-xl shadow-[0_10px_26px_rgba(0,0,0,0.18)]"
                >
                    {/* subtle glossy highlight */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                    <div className="relative text-lg font-semibold text-white tabular-nums sm:text-xl lg:text-2xl">
                        {String(item.value).padStart(2, '0')}
                    </div>
                    <div className="relative mt-0.5 text-[10px] font-medium text-white/80 sm:text-xs lg:text-sm">
                        {item.label}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    // kept for parity with your original code
    const { auth } = usePage<SharedData>().props;
    const trackingForm = useForm({
        tracking_code: '',
        tracking_pin: '',
    });
    const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);

    const [windowStatus, setWindowStatus] = useState<WindowStatus>(null);
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(null);

    useEffect(() => {
        if (Object.keys(trackingForm.errors).length > 0) {
            setIsTrackingDialogOpen(true);
        }
    }, [trackingForm.errors]);

    useEffect(() => {
        if (windowStatus?.status !== 'active') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('track') === '1') {
            setIsTrackingDialogOpen(true);
        }
    }, [windowStatus?.status]);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const response = await fetch('/windows/current');
                if (!response.ok) return;

                const data = await response.json();
                if (!isMounted) return;

                if (!data.window) {
                    setWindowStatus({ status: 'closed', name: null, opensAt: null, closesAt: null });
                    return;
                }

                setWindowStatus({
                    status: data.status,
                    name: data.window.title,
                    opensAt: data.window.start_date,
                    closesAt: data.window.end_date,
                });
            } catch {
                // Silently ignore – countdown is a nice-to-have
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!windowStatus) {
            setTimeLeft(null);
            return;
        }

        const targetIso =
            windowStatus.status === 'upcoming'
                ? windowStatus.opensAt
                : windowStatus.status === 'active'
                    ? windowStatus.closesAt
                    : null;

        if (!targetIso) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date();
            const target = new Date(targetIso);
            const diffMs = target.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const totalSeconds = Math.floor(diffMs / 1000);
            const days = Math.floor(totalSeconds / (60 * 60 * 24));
            const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
            const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
            const seconds = totalSeconds % 60;

            setTimeLeft({ days, hours, minutes, seconds });
        };

        calculateTimeLeft();
        const interval = window.setInterval(calculateTimeLeft, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [windowStatus]);

    const statusLabel =
        windowStatus?.status === 'upcoming'
            ? 'Upcoming'
            : windowStatus?.status === 'active'
                ? 'Open'
                : 'Closed';

    const statusHint =
        windowStatus?.status === 'upcoming'
            ? 'Applications open in'
            : windowStatus?.status === 'active'
                ? 'Submit before'
                : 'Application period is currently closed';

    const opensAtReadable = formatIsoToReadable(windowStatus?.opensAt ?? null);
    const closesAtReadable = formatIsoToReadable(windowStatus?.closesAt ?? null);

    const isApplicationOpen = windowStatus?.status === 'active';
    const showCountdown = windowStatus?.status === 'upcoming' || windowStatus?.status === 'active';

    return (
        <>
            <Head title="Welcome" />

            <div className="relative min-h-[100dvh] overflow-x-hidden">
                {/* Background Image - mobile */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
                    style={{
                        backgroundSize: '170% auto',
                        backgroundPosition: 'center top',
                        backgroundImage: "url('/hero-image-mobile.jpg')",
                    }}
                />

                {/* Background Image - desktop */}
                <div
                    className="absolute inset-0 hidden bg-no-repeat md:block"
                    style={{
                        backgroundImage: "url('/hero-image-desktop.jpg')",
                        backgroundSize: 'auto 120%',
                        backgroundPosition: 'calc(100% + 120px) center',
                    }}
                />

                {/* Dark Green Overlay */}
                <div
                    className="absolute inset-0 md:hidden"
                    style={{
                        background: 'linear-gradient(180deg, rgba(3,102,53,0.2) 0%, rgba(3,102,53,1) 55%)',
                    }}
                />
                <div
                    className="absolute inset-0 hidden md:block"
                    style={{
                        background: 'linear-gradient(90deg, rgba(3,102,53,1) 25%, rgba(3,102,53,0) 100%)',
                    }}
                />

                {/* Content */}
                <div className="relative z-10 min-h-[100dvh]">
                    <div className="container mx-auto min-h-[100dvh] px-4 lg:px-8">
                        <div className="flex min-h-[100dvh] items-center py-8">
                            <div className="w-full max-w-2xl">
                                {/* Brand */}
                                <div className="flex flex-col items-center justify-start gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
                                    <AppLogoIcon className="h-14 w-14 object-contain sm:h-16 sm:w-16" />
                                    <div className="flex flex-col leading-tight">
                                        <span
                                            className="text-white text-base font-semibold sm:text-2xl"
                                            style={{ fontFamily: "'Old English Text MT', 'Old English', serif" }}
                                        >
                                            St. Paul University Philippines
                                        </span>
                                        <span
                                            className="text-white/90 text-xs font-medium sm:text-sm"
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                        >
                                            Tuguegarao City, Cagayan 3500
                                        </span>
                                    </div>
                                </div>

                                <Separator className="my-4 bg-white/15" />

                                {/* Status chips (compact) */}

                                {/* Headline */}
                                <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-4xl">
                                    Apply for graduation without an account
                                </h1>

                                {/* Description (kept compact to preserve one-page) */}
                                <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">
                                    Complete the full graduation application wizard first, verify your email after you submit, and keep managing requirements through secure links sent to your inbox.
                                </p>

                                {/* Guided steps + primary action */}
                                <div className="mt-4 space-y-4">
                                    <div className="grid gap-3 text-sm text-emerald-50 sm:grid-cols-3">
                                        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
                                                Step 1
                                            </div>
                                            <div className="mt-1 font-medium">Start your application</div>
                                            <p className="mt-1 text-xs text-emerald-100/80">
                                                Click &quot;Start applying&quot; and finish the graduation wizard.
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
                                                Step 2
                                            </div>
                                            <div className="mt-1 font-medium">Verify your email</div>
                                            <p className="mt-1 text-xs text-emerald-100/80">
                                                Open the link sent after submission to activate your application.
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100/80">
                                                Step 3
                                            </div>
                                            <div className="mt-1 font-medium">Track progress and reopen</div>
                                            <p className="mt-1 text-xs text-emerald-100/80">
                                                Use your tracking code and PIN from email to check status, reopen the portal, and request a fresh access link.
                                            </p>
                                        </div>
                                    </div>

                                    {isApplicationOpen ? (
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <Button asChild size="lg" className="w-full sm:w-auto">
                                                <Link href="/apply">
                                                    Start applying
                                                    <ArrowRight className="ml-2 size-4" />
                                                </Link>
                                            </Button>
                                            <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        size="lg"
                                                        variant="outline"
                                                        className="w-full border-white/20 bg-white/8 text-white backdrop-blur hover:bg-white/15 sm:w-auto"
                                                    >
                                                        Track existing application
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="border-emerald-900/30 bg-[#0d3d24] text-white sm:max-w-lg">
                                                    <DialogHeader>
                                                        <DialogTitle>Track an existing application</DialogTitle>
                                                        <DialogDescription className="text-emerald-100/80">
                                                            Enter the tracking code and 6-digit PIN from your email to reopen your application status.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="tracking_code" className="text-white/90">
                                                                Tracking code
                                                            </Label>
                                                            <Input
                                                                id="tracking_code"
                                                                value={trackingForm.data.tracking_code}
                                                                onChange={(event) => trackingForm.setData('tracking_code', event.target.value)}
                                                                placeholder="TRK-JUNE-2026-ABC123"
                                                                className="border-white/15 bg-black/20 text-white placeholder:text-emerald-100/40"
                                                            />
                                                            <InputError message={trackingForm.errors.tracking_code} />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="tracking_pin" className="text-white/90">
                                                                6-digit PIN
                                                            </Label>
                                                            <Input
                                                                id="tracking_pin"
                                                                inputMode="numeric"
                                                                maxLength={6}
                                                                value={trackingForm.data.tracking_pin}
                                                                onChange={(event) =>
                                                                    trackingForm.setData('tracking_pin', event.target.value.replace(/\D/g, '').slice(0, 6))
                                                                }
                                                                placeholder="123456"
                                                                className="border-white/15 bg-black/20 text-white placeholder:text-emerald-100/40"
                                                            />
                                                            <InputError message={trackingForm.errors.tracking_pin} />
                                                        </div>

                                                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="text-white hover:bg-white/10 hover:text-white"
                                                                onClick={() => setIsTrackingDialogOpen(false)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                onClick={() =>
                                                                    trackingForm.post('/apply/track', {
                                                                        preserveScroll: true,
                                                                        onSuccess: () => setIsTrackingDialogOpen(false),
                                                                        onError: () => setIsTrackingDialogOpen(true),
                                                                    })
                                                                }
                                                                disabled={trackingForm.processing}
                                                            >
                                                                {trackingForm.processing ? 'Checking...' : 'Track application'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Countdown (GLASS) */}
                                <div className="mt-4">
                                    {showCountdown ? (
                                        <div className="rounded-3xl bg-white/10 p-4 backdrop-blur-xl ring-1 ring-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
                                            <div className="flex items-center justify-between gap-3">


                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="border-white/25 bg-white/10 text-white/90 backdrop-blur">
                                                    <Clock className="mr-2 size-3.5" />
                                                    Status: {statusLabel}
                                                </Badge>

                                                {windowStatus?.name ? (
                                                    <Badge variant="outline" className="border-white/25 bg-white/5 text-white/90">
                                                        Window: {windowStatus.name}
                                                    </Badge>
                                                ) : null}

                                                {windowStatus?.status === 'upcoming' && opensAtReadable ? (
                                                    <Badge variant="outline" className="border-white/25 bg-white/5 text-white/90">
                                                        Opens: {opensAtReadable}
                                                    </Badge>
                                                ) : null}

                                                {windowStatus?.status === 'active' && closesAtReadable ? (
                                                    <Badge variant="outline" className="border-white/25 bg-white/5 text-white/90">
                                                        Closes: {closesAtReadable}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="text-[11px] font-medium uppercase tracking-wide text-white/80 mt-2">
                                                {statusHint}
                                            </div>
                                            {/* xs: compact inline */}
                                            <div className="mt-3 sm:hidden">
                                                {timeLeft ? <CountdownInlineGlass timeLeft={timeLeft} /> : null}
                                            </div>

                                            {/* sm+: glass tiles */}
                                            <div className="mt-3 hidden sm:block">
                                                {timeLeft ? <CountdownTilesGlass timeLeft={timeLeft} /> : null}
                                            </div>
                                             {/* Policy dialog (page stays one-screen; dialog can scroll) */}
                                <div className="mt-3">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="h-9 px-0 text-white/90 hover:bg-transparent hover:text-white"
                                            >
                                                <Info className="mr-2 size-4" />
                                                View Graduation Application Policy
                                            </Button>
                                        </DialogTrigger>

                                        <DialogContent className="!max-w-5xl max-h-[90vh] overflow-y-auto p-6">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <AlertCircle className="size-5 text-[#036635] dark:text-emerald-300" />
                                                    Graduation Application Policy
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Important information about the graduation application process
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4">
                                                {/* Policy Section */}
                                                <Alert className="border-[#036635]/25 bg-[#036635]/10 text-[#034f29] dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                                                    <AlertTitle>
                                                        Graduation Application Policy
                                                    </AlertTitle>
                                                    <AlertDescription>
                                                        The University strictly enforces the <strong>"No Application, No Graduation"</strong>{' '}
                                                        policy. Submission of an official graduation application is <strong>mandatory</strong>{' '}
                                                        as it serves as the primary basis for evaluating a student's academic record and
                                                        determining eligibility for graduation.
                                                        <br />
                                                        <br />
                                                        To avoid delays in processing and approval, students are strongly advised to submit
                                                        their application within the prescribed period.
                                                    </AlertDescription>
                                                </Alert>

                                                {/* Procedure Section */}
                                                <div className="space-y-4">
                                                    <h3 className="text-base font-semibold">Graduation Application Procedure</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        To ensure a smooth and efficient application process, please follow the steps
                                                        outlined below:
                                                    </p>

                                                    <div className="space-y-4">
                                                        {/* Step 1 */}
                                                        <div className="flex gap-4">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                                1
                                                            </div>
                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <h4 className="text-sm font-semibold">
                                                                    Complete the Online Graduation Wizard
                                                                </h4>
                                                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                                    <li>Access the Graduation Application Portal</li>
                                                                    <li>Fill out your personal, educational, and program details in one sitting</li>
                                                                    <li>Submit the full graduation application using your email and student ID</li>
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {/* Step 2 */}
                                                        <div className="flex gap-4">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                                2
                                                            </div>
                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <h4 className="text-sm font-semibold">Verify Your Email and Activate the Application</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Open the secure link sent to your inbox after submission. Only verified applications move forward to Registrar and coordinator review.
                                                                </p>
                                                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
                                                                    <li>
                                                                        If you entered the wrong email, update it from the pending screen and request a fresh verification link.
                                                                    </li>
                                                                    <li>
                                                                        Once verified, you can keep using the emailed guest portal links to review your application and upload requirements.
                                                                    </li>
                                                                </ul>
                                                                <div className="rounded-md bg-muted p-3 text-sm mt-2">
                                                                    <p className="font-medium mb-1">Important:</p>
                                                                    <p className="text-muted-foreground">
                                                                        Students residing outside the region should coordinate with their Adviser or
                                                                        Program Coordinator for assistance in completing the process.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Step 3 */}
                                                        <div className="flex gap-4">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                                3
                                                            </div>
                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <h4 className="text-sm font-semibold">Validation and Payment</h4>
                                                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                                    <li>Present your printed application form to the Dean's Office for validation</li>
                                                                    <li>Settle the required graduation fee at the Finance Office</li>
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {/* Step 4 */}
                                                        <div className="flex gap-4">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                                                                4
                                                            </div>
                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <h4 className="text-sm font-semibold">Submission of Application Form</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Submit the validated and signed application form to the Registrar's Office to
                                                                    finalize your graduation application.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Additional Guidelines */}
                                                <div className="rounded-md border bg-muted/50 p-4">
                                                    <h4 className="mb-2 text-sm font-semibold">Additional Guidelines</h4>
                                                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                                        <li>Ensure all required fields and documents are accurately completed</li>
                                                        <li>Monitor official announcements for application deadlines</li>
                                                        <li>
                                                            For inquiries or assistance, contact the Registrar's Office at{' '}
                                                            <strong>0915-564-8291</strong>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white shadow-sm backdrop-blur-sm ring-1 ring-white/15">
                                            <span className="mr-2 h-2 w-2 rounded-full bg-red-300" />
                                            {statusHint}
                                        </div>
                                    )}
                                    
                                </div>

                               
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
