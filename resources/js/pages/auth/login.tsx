import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
// import { send } from '@/routes/verification';
import { Form, Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
    show_verification_dialog?: boolean;
    user_email?: string;
    email_changed?: boolean;
    email_change_success?: string;
}

export default function Login({
    status,
    canResetPassword,
    canRegister,
    show_verification_dialog,
    user_email,
    email_changed,
    email_change_success,
}: LoginProps) {
    const { flash } = usePage().props as { flash?: { show_verification_dialog?: boolean; user_email?: string; email_changed?: boolean; email_change_success?: string } };
    const [showVerificationDialog, setShowVerificationDialog] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendProcessing, setResendProcessing] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [changeEmailProcessing, setChangeEmailProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Show dialog if redirected from unverified login attempt
    useEffect(() => {
        const shouldShow = show_verification_dialog || flash?.show_verification_dialog;
        if (shouldShow) {
            setShowVerificationDialog(true);
            setResendCooldown(60); // Start 1 minute cooldown
        }
    }, [show_verification_dialog, flash?.show_verification_dialog]);

    // Reset change email form when email is successfully changed
    useEffect(() => {
        if (email_changed || flash?.email_changed) {
            setShowChangeEmail(false);
            setNewEmail('');
            // Ensure dialog is shown and reset to first state
            setShowVerificationDialog(true);
            setResendCooldown(60); // Reset cooldown
        }
    }, [email_changed, flash?.email_changed]);

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResendEmail = () => {
        if (resendCooldown > 0 || resendProcessing) {
            return;
        }

        // Use the current email from props/flash (which will be updated after email change)
        // Don't use newEmail here as it's cleared after successful change
        const email = user_email || flash?.user_email;
        if (!email) {
            console.error('No email address available for resending verification email');
            return;
        }

        setResendProcessing(true);
        router.post('/email/verification/resend', { email }, {
            preserveScroll: true,
            onSuccess: () => {
                setResendCooldown(60); // 1 minute cooldown
                setResendProcessing(false);
            },
            onError: (errors) => {
                console.error('Failed to resend verification email:', errors);
                setResendProcessing(false);
            },
        });
    };

    const handleChangeEmail = () => {
        if (!newEmail || changeEmailProcessing) {
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return;
        }

        // Check if email is different from current
        const currentEmail = user_email || flash?.user_email;
        if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
            return;
        }

        setChangeEmailProcessing(true);
        router.post('/email/verification/change', { email: newEmail }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setChangeEmailProcessing(false);
                setShowChangeEmail(false);
                setNewEmail(''); // Clear the input
                setResendCooldown(60); // 1 minute cooldown
                // Force dialog to show and reset state
                setShowVerificationDialog(true);
                // Reload to get updated user_email from session
                setTimeout(() => {
                    router.reload({
                        only: ['user_email', 'email_changed', 'email_change_success'],
                    });
                }, 100);
            },
            onError: (errors) => {
                console.error('Failed to change email:', errors);
                setChangeEmailProcessing(false);
            },
        });
    };

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your student ID and password below to log in"
        >
            <Head title="Log in" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => {
                    // Helper function to extract error message (handles both string and array formats)
                    const getErrorMessage = (error: string | string[] | undefined): string | undefined => {
                        if (!error) {
                            return undefined;
                        }
                        if (Array.isArray(error)) {
                            return error[0] || undefined;
                        }
                        return typeof error === 'string' ? error : undefined;
                    };

                    // Get error messages for display - check both student_id and the username field
                    const studentIdError = getErrorMessage(errors.student_id) || getErrorMessage((errors as any).username);
                    const passwordError = getErrorMessage(errors.password);

                    // Handle both string and array error formats for verification check
                    const isVerificationError = studentIdError 
                        ? studentIdError.toLowerCase().includes('not verified') || studentIdError.toLowerCase().includes('verification')
                        : false;

                    return (
                        <>
                            {isVerificationError && (
                                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                    <p className="font-medium mb-2">Email Verification Required</p>
                                    <p className="mb-3">
                                        Your email address has not been verified. Please check your email inbox and click the verification link before logging in.
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        Didn't receive the email? Check your spam folder or contact support.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="student_id">Student ID</Label>
                                    <Input
                                        id="student_id"
                                        type="text"
                                        name="student_id"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="username"
                                        placeholder="Enter your student ID"
                                        pattern="[A-Za-z0-9-]*"
                                        className={studentIdError ? 'border-red-500 dark:border-red-500' : ''}
                                        onKeyPress={(e) => {
                                            // Only allow letters, numbers, and hyphens
                                            const char = String.fromCharCode(e.which);
                                            if (!/[A-Za-z0-9-]/.test(char)) {
                                                e.preventDefault();
                                            }
                                        }}
                                        onChange={(e) => {
                                            // Remove any characters that are not letters, numbers, or hyphens
                                            const value = e.target.value.replace(/[^A-Za-z0-9-]/g, '');
                                            e.target.value = value;
                                        }}
                                    />
                                    {studentIdError && (
                                        <InputError message={studentIdError} className="mt-1" />
                                    )}
                                </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className={`pr-10 ${passwordError ? 'border-red-500 dark:border-red-500' : ''}`}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {passwordError && (
                                    <InputError message={passwordError} className="mt-1" />
                                )}
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        {canRegister && (
                            <div className="text-center text-sm text-muted-foreground">
                                Don't have an account?{' '}
                                <TextLink href={register()} tabIndex={5}>
                                    Sign up
                                </TextLink>
                            </div>
                        )}
                        </>
                    );
                }}
            </Form>

            {status && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm font-medium text-green-800">
                    {status}
                </div>
            )}

            <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Check your email</DialogTitle>
                        <DialogDescription>
                            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {(email_change_success || flash?.email_change_success) && (
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-800">
                                    {email_change_success || flash?.email_change_success}
                                </p>
                            </div>
                        )}
                        <div className="rounded-lg border bg-muted/50 p-4">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Email address:</p>
                            <p className="text-sm font-semibold text-foreground">
                                {/* Show newEmail only when actively typing, otherwise show the current email from props/flash */}
                                {showChangeEmail && newEmail ? newEmail : (user_email || flash?.user_email || 'Not available')}
                            </p>
                        </div>

                        {!showChangeEmail ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Wrong email address?
                                    </p>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowChangeEmail(true)}
                                        className="h-auto p-0 text-sm"
                                    >
                                        Change email
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Didn't receive the email? Check your spam folder or click the button below to resend it.
                                </p>
                                <Button
                                    onClick={handleResendEmail}
                                    disabled={resendCooldown > 0 || resendProcessing || !(user_email || flash?.user_email)}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {resendProcessing && <Spinner />}
                                    {resendCooldown > 0
                                        ? `Resend email (${resendCooldown}s)`
                                        : 'Resend email'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="new_email">New email address</Label>
                                    <Input
                                        id="new_email"
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="Enter new email address"
                                        disabled={changeEmailProcessing}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowChangeEmail(false);
                                            setNewEmail(''); // Clear the input but keep the current email in display
                                        }}
                                        disabled={changeEmailProcessing}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleChangeEmail}
                                        disabled={changeEmailProcessing || !newEmail}
                                        className="flex-1"
                                    >
                                        {changeEmailProcessing && <Spinner />}
                                        Update & Send
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </AuthLayout>
    );
}
