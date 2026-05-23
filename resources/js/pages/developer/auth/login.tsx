import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';

export default function DeveloperLogin() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    return (
        <AuthLayout
            title="Developer Login"
            description="Developer-only diagnostics and system health access"
        >
            <Head title="Developer Login" />

            <form
                className="flex flex-col gap-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    post('/developer/login', { preserveScroll: true });
                }}
            >
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(event) =>
                                setData('email', event.target.value)
                            }
                            required
                            autoFocus
                            autoComplete="email"
                            placeholder="developer@example.com"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(event) =>
                                setData('password', event.target.value)
                            }
                            required
                            autoComplete="current-password"
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            checked={data.remember}
                            onCheckedChange={(checked) =>
                                setData('remember', checked === true)
                            }
                        />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <Spinner />}
                        Continue
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
