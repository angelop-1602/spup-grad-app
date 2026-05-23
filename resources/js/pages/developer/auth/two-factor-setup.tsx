import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';

interface DeveloperTwoFactorSetupProps {
    qrCodeSvg: string;
    manualSetupKey: string;
    recoveryCodes: string[];
}

export default function DeveloperTwoFactorSetup({
    qrCodeSvg,
    manualSetupKey,
    recoveryCodes,
}: DeveloperTwoFactorSetupProps) {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    return (
        <AuthLayout
            title="Secure Developer Access"
            description="Scan the QR code, save your recovery codes, then confirm the 6-digit code."
        >
            <Head title="Developer Two-Factor Setup" />

            <div className="space-y-6">
                <div className="mx-auto flex aspect-square w-56 items-center justify-center rounded-lg border bg-white p-4">
                    <div
                        className="size-full [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="manualSetupKey">Manual setup key</Label>
                    <Input id="manualSetupKey" value={manualSetupKey} readOnly />
                </div>

                <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="mb-3 text-sm font-medium">Recovery codes</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {recoveryCodes.map((code) => (
                            <code
                                key={code}
                                className="rounded-md bg-background px-2 py-1 text-xs"
                            >
                                {code}
                            </code>
                        ))}
                    </div>
                </div>

                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        post('/developer/two-factor/setup', {
                            preserveScroll: true,
                        });
                    }}
                >
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

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? <Spinner /> : <ShieldCheck />}
                        Confirm and open diagnostics
                    </Button>
                </form>
            </div>
        </AuthLayout>
    );
}
