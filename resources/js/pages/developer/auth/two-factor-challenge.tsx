import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function DeveloperTwoFactorChallenge() {
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        code: '',
        recovery_code: '',
    });

    return (
        <AuthLayout
            title={
                useRecoveryCode ? 'Developer Recovery Code' : 'Developer 2FA'
            }
            description="Confirm developer access before opening diagnostics."
        >
            <Head title="Developer Two-Factor Challenge" />

            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    post('/developer/two-factor/challenge', {
                        preserveScroll: true,
                    });
                }}
            >
                {useRecoveryCode ? (
                    <div className="grid gap-2">
                        <Label htmlFor="recovery_code">Recovery code</Label>
                        <Input
                            id="recovery_code"
                            value={data.recovery_code}
                            onChange={(event) =>
                                setData('recovery_code', event.target.value)
                            }
                            required
                            autoFocus
                            placeholder="Recovery code"
                        />
                        <InputError message={errors.recovery_code} />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="code">Authentication code</Label>
                        <Input
                            id="code"
                            inputMode="numeric"
                            maxLength={6}
                            value={data.code}
                            onChange={(event) =>
                                setData(
                                    'code',
                                    event.target.value.replace(/\D/g, ''),
                                )
                            }
                            required
                            autoFocus
                            placeholder="000000"
                        />
                        <InputError message={errors.code} />
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing && <Spinner />}
                    Continue
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                    <button
                        type="button"
                        className="underline underline-offset-4"
                        onClick={() => {
                            clearErrors();
                            setUseRecoveryCode((current) => !current);
                        }}
                    >
                        {useRecoveryCode
                            ? 'Use authentication code'
                            : 'Use recovery code'}
                    </button>
                </div>
            </form>
        </AuthLayout>
    );
}
