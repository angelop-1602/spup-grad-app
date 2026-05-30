import {
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import adminRoutes from '@/routes/admin';
import coordinatorRoutes from '@/routes/coordinator';
import developerRoutes from '@/routes/developer';
import { type SharedData, type User } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { auth } = usePage<SharedData>().props;
    const isAdmin = !!auth.admin;
    const isCoordinator = !!auth.coordinator;
    const isDeveloper = !!auth.developer;

    // Determine logout route based on user type
    let logoutRoute = logout();
    if (isAdmin) {
        logoutRoute = adminRoutes.logout();
    } else if (isCoordinator) {
        logoutRoute = coordinatorRoutes.logout();
    } else if (isDeveloper) {
        logoutRoute = developerRoutes.logout();
    }

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full"
                    href={logoutRoute}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
