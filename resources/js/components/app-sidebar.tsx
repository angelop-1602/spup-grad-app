import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';
import adminRoutes from '@/routes/admin';
import applyRoutes from '@/routes/apply';
import coordinatorRoutes from '@/routes/coordinator';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Calendar,
    FileText,
    LayoutGrid,
    School,
    UserCog,
} from 'lucide-react';

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: adminRoutes.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Application Windows',
        href: adminRoutes.windows.index(),
        icon: Calendar,
    },
    {
        title: 'Academic Structure',
        href: adminRoutes.departments.index(),
        icon: School,
    },
    {
        title: 'Coordinators',
        href: adminRoutes.coordinators.index(),
        icon: UserCog,
    },
    {
        title: 'Audit Trail',
        href: '/admin/audit-trail',
        icon: Activity,
    },
];

const coordinatorNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: coordinatorRoutes.dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Applications',
        href: coordinatorRoutes.applications.index(),
        icon: FileText,
    },
    {
        title: 'Audit Trail',
        href: '/coordinator/audit-trail',
        icon: Activity,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = !!auth.admin;
    const isCoordinator = !!auth.coordinator;

    let mainNavItems: NavItem[];
    let dashboardHref: string;

    if (isAdmin) {
        mainNavItems = adminNavItems;
        dashboardHref = adminRoutes.dashboard().url;
    } else if (isCoordinator) {
        mainNavItems = coordinatorNavItems;
        dashboardHref = coordinatorRoutes.dashboard().url;
    } else {
        mainNavItems = [];
        dashboardHref = applyRoutes.index().url;
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <Link
                    href={dashboardHref}
                    prefetch
                    className="block flex w-full items-center justify-center"
                >
                    <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                        <img
                            src="/SPUP-Logo-with-yellow.png"
                            alt="St. Paul University Philippines Logo"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <div className="ml-1 grid flex-1 text-left text-sm">
                        <span className="mb-0.5 truncate leading-tight font-semibold">
                            Graduation Application
                        </span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {mainNavItems.length > 0 ? (
                    <NavMain items={mainNavItems} />
                ) : null}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
