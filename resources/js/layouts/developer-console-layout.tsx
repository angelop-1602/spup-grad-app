import FlashToastHandler from '@/components/flash-toast-handler';
import { Button } from '@/components/ui/button';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    CheckCircle2,
    ClipboardList,
    HeartPulse,
    LayoutDashboard,
    ListChecks,
    LogOut,
} from 'lucide-react';
import { type ReactNode } from 'react';

const navItems = [
    { title: 'Dashboard', href: '/developer/dashboard', icon: LayoutDashboard },
    { title: 'Tickets', href: '/developer/tickets', icon: ClipboardList },
    {
        title: 'Manual Verification',
        href: '/developer/manual-verification',
        icon: CheckCircle2,
    },
    { title: 'Audit Trail', href: '/developer/events', icon: ListChecks },
    { title: 'System Health', href: '/developer/health', icon: HeartPulse },
];

interface DeveloperConsoleLayoutProps {
    children: ReactNode;
    title: string;
    description?: string;
}

export default function DeveloperConsoleLayout({
    children,
    title,
    description,
}: DeveloperConsoleLayoutProps) {
    const { auth, url } = usePage().props as {
        auth?: { developer?: { name?: string; email?: string } | null };
        url?: string;
    };
    const pageUrl = usePage().url || url || '';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <FlashToastHandler />
            <header className="border-b bg-card/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                <Activity className="size-3.5" />
                                Developer Console
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold">
                                {title}
                            </h1>
                            {description ? (
                                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden text-right text-sm sm:block">
                                <p className="font-medium">
                                    {auth?.developer?.name ?? 'Developer'}
                                </p>
                                <p className="text-muted-foreground">
                                    {auth?.developer?.email}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.post('/developer/logout', undefined, {
                                        preserveScroll: true,
                                    })
                                }
                            >
                                <LogOut className="size-4" />
                                Logout
                            </Button>
                        </div>
                    </div>
                    <nav className="flex gap-2 overflow-x-auto pb-1">
                        {navItems.map((item) => {
                            const isActive =
                                pageUrl === item.href ||
                                pageUrl.startsWith(`${item.href}?`) ||
                                (item.href !== '/developer/dashboard' &&
                                    pageUrl.startsWith(`${item.href}/`));

                            return (
                                <Button
                                    key={item.href}
                                    asChild
                                    size="sm"
                                    variant={isActive ? 'default' : 'outline'}
                                    className="shrink-0"
                                >
                                    <Link href={item.href}>
                                        <item.icon className="size-4" />
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
