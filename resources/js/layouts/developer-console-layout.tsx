import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { type ReactNode } from 'react';

interface DeveloperConsoleLayoutProps {
    children: ReactNode;
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
}

export default function DeveloperConsoleLayout({
    children,
    title,
    description,
    breadcrumbs,
}: DeveloperConsoleLayoutProps) {
    const pageUrl = usePage().url;
    const layoutBreadcrumbs = breadcrumbs ?? [
        {
            title: 'Developer Console',
            href: '/developer/dashboard',
        },
        ...(title === 'Help Desk Dashboard'
            ? []
            : [
                  {
                      title,
                      href: pageUrl,
                  },
              ]),
    ];

    return (
        <AppLayout breadcrumbs={layoutBreadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <p className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                        <Activity className="size-3.5" />
                        Developer Console
                    </p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight">
                        {title}
                    </h1>
                    {description ? (
                        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {children}
            </div>
        </AppLayout>
    );
}
