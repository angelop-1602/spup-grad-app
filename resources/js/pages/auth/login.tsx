import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
}

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);

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

                    return (
                        <>
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

        </AuthLayout>
    );
}
