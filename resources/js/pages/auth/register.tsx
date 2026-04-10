import { login } from '@/routes';
import { store } from '@/routes/register';
// import { send } from '@/routes/verification';
import { Form, Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AuthLayout from '@/layouts/auth-layout';
import { Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
    show_verification_dialog?: boolean;
}

export default function Register({ show_verification_dialog }: RegisterProps) {
    const { flash } = usePage().props as { flash?: { show_verification_dialog?: boolean } };
    // const [showVerificationDialog, setShowVerificationDialog] = useState(false);
    // const [resendCooldown, setResendCooldown] = useState(0);
    // const [resendProcessing, setResendProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [emailValue, setEmailValue] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);

    // Check for verification completion from email verification page
    // useEffect(() => {
    //     const checkVerification = () => {
    //         const verified = localStorage.getItem('email_verified');
    //         if (verified === 'true') {
    //             localStorage.removeItem('email_verified');
    //             // Auto-login by redirecting to continue endpoint
    //             const userId = localStorage.getItem('verified_user_id');
    //             if (userId) {
    //                 localStorage.removeItem('verified_user_id');
    //                 setShowVerificationDialog(false);
    //                 router.post('/email/verification/continue', {
    //                     user_id: userId,
    //                 }, {
    //                     preserveScroll: false,
    //                 });
    //             }
    //         }
    //     };

    //     // Check immediately
    //     checkVerification();

    //     // Listen for storage events (from other tabs/windows)
    //     const handleStorageChange = (e: StorageEvent) => {
    //         if (e.key === 'email_verified' && e.newValue === 'true') {
    //             checkVerification();
    //         }
    //     };

    //     window.addEventListener('storage', handleStorageChange);

    //     // Poll for verification (in case storage event doesn't fire or same tab)
    //     const interval = setInterval(checkVerification, 1000);

    //     return () => {
    //         window.removeEventListener('storage', handleStorageChange);
    //         clearInterval(interval);
    //     };
    // }, [router]);

    // Show dialog if redirected from successful registration
    // useEffect(() => {
    //     if (show_verification_dialog || flash?.show_verification_dialog) {
    //         setShowVerificationDialog(true);
    //         setResendCooldown(60); // Start 1 minute cooldown
    //     }
    // }, [show_verification_dialog, flash?.show_verification_dialog]);

    // Check if we're on the verification page and redirect back to register with dialog
    // useEffect(() => {
    //     if (window.location.pathname === '/email/verify') {
    //         router.replace('/register', {
    //             only: [],
    //             preserveState: false,
    //             preserveScroll: false,
    //             data: {
    //                 show_verification_dialog: true,
    //             },
    //         });
    //         setShowVerificationDialog(true);
    //         setResendCooldown(60);
    //     }
    // }, [router]);

    // Countdown timer for resend button
    // useEffect(() => {
    //     if (resendCooldown > 0) {
    //         const timer = setTimeout(() => {
    //             setResendCooldown(resendCooldown - 1);
    //         }, 1000);
    //         return () => clearTimeout(timer);
    //     }
    // }, [resendCooldown]);

    // const handleResendEmail = () => {
    //     if (resendCooldown > 0 || resendProcessing) {
    //         return;
    //     }

    //     setResendProcessing(true);
    //     router.post(send().url, {}, {
    //         preserveScroll: true,
    //         onSuccess: () => {
    //             setResendCooldown(60); // 1 minute cooldown
    //             setResendProcessing(false);
    //         },
    //         onError: () => {
    //             setResendProcessing(false);
    //         },
    //     });
    // };

    return (
        <AuthLayout
            title="Create an account"
            description="Enter your details below to create your account"
        >
            <Head title="Register" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
                // onSuccess={() => {
                //     // Show dialog after successful registration
                //     setShowVerificationDialog(true);
                //     setResendCooldown(60); // Start 1 minute cooldown
                // }}
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="student_id">Student ID</Label>
                                <Input
                                    id="student_id"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    name="student_id"
                                    placeholder="Enter your student ID"
                                    pattern="[A-Za-z0-9-]*"
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
                                {(() => {
                                    const studentIdError = errors.student_id;
                                    const isAccountExistsError = studentIdError && (
                                        Array.isArray(studentIdError)
                                            ? studentIdError.some(e => e.includes('already exists') || e.includes('log in'))
                                            : studentIdError.includes('already exists') || studentIdError.includes('log in')
                                    );
                                    // Only show error if it's NOT an "already exists" error
                                    return !isAccountExistsError ? (
                                <InputError
                                    message={errors.student_id}
                                    className="mt-2"
                                />
                                    ) : null;
                                })()}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <p className="text-xs text-muted-foreground">
                                    Please use your personal and active email address. This email will be used for important notifications and account recovery.
                                </p>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                    value={emailValue}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setEmailValue(value);
                                        // Check if email ends with @spup.edu.ph (case-insensitive)
                                        if (value.toLowerCase().endsWith('@spup.edu.ph')) {
                                            setEmailError('School email addresses (@spup.edu.ph) cannot be used. Please use your personal and active email address.');
                                        } else {
                                            setEmailError(null);
                                        }
                                    }}
                                    className={emailError ? 'border-destructive' : ''}
                                />
             
                                {emailError && (
                                    <p className="text-xs text-destructive font-medium">
                                        {emailError}
                                    </p>
                                )}
                                {(() => {
                                    const emailErrorMsg = errors.email;
                                    const isAccountExistsError = emailErrorMsg && (
                                        Array.isArray(emailErrorMsg)
                                            ? emailErrorMsg.some(e => e.includes('already exists') || e.includes('log in'))
                                            : emailErrorMsg.includes('already exists') || emailErrorMsg.includes('log in')
                                    );
                                    // Only show error if it's NOT an "already exists" error
                                    return !isAccountExistsError ? (
                                <InputError message={errors.email} />
                                    ) : null;
                                })()}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        tabIndex={3}
                                        autoComplete="new-password"
                                        name="password"
                                        placeholder="Password"
                                        className="pr-10"
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
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showPasswordConfirmation ? 'text' : 'password'}
                                        required
                                        tabIndex={4}
                                        autoComplete="new-password"
                                        name="password_confirmation"
                                        placeholder="Confirm password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                                        onClick={() =>
                                            setShowPasswordConfirmation((prev) => !prev)
                                        }
                                        tabIndex={-1}
                                        aria-label={
                                            showPasswordConfirmation
                                                ? 'Hide confirm password'
                                                : 'Show confirm password'
                                        }
                                    >
                                        {showPasswordConfirmation ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                tabIndex={5}
                                data-test="register-user-button"
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        </div>

                        {/* Display helpful message when account already exists */}
                        {(() => {
                            const studentIdError = errors.student_id;
                            const emailError = errors.email;
                            const isAccountExistsError = 
                                (studentIdError && (Array.isArray(studentIdError) 
                                    ? studentIdError.some(e => e.includes('already exists') || e.includes('log in'))
                                    : studentIdError.includes('already exists') || studentIdError.includes('log in'))) ||
                                (emailError && (Array.isArray(emailError)
                                    ? emailError.some(e => e.includes('already exists') || e.includes('log in'))
                                    : emailError.includes('already exists') || emailError.includes('log in')));
                            
                            return isAccountExistsError ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                    <p className="font-medium mb-2">Account Already Exists</p>
                                    <p className="text-sm mb-2">
                                        It looks like you already have an account with us. Please log in to your existing account instead of creating a new one.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="mt-2"
                                    >
                                        <TextLink href={login()}>
                                            Go to Login Page
                                        </TextLink>
                                    </Button>
                                </div>
                            ) : null;
                        })()}

                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href={login()} tabIndex={6}>
                                Log in
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>

            {/* <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Check your email</DialogTitle>
                        <DialogDescription>
                            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the email? You can resend it below.
                        </p>
                        <Button
                            onClick={handleResendEmail}
                            disabled={resendCooldown > 0 || resendProcessing}
                            variant="outline"
                            className="w-full"
                        >
                            {resendProcessing && <Spinner />}
                            {resendCooldown > 0
                                ? `Resend email (${resendCooldown}s)`
                                : 'Resend email'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog> */}
        </AuthLayout>
    );
}
