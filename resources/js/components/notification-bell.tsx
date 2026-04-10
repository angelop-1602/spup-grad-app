import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import adminRoutes from '@/routes/admin';
import coordinatorRoutes from '@/routes/coordinator';
import { type SharedData } from '@/types';
import { useInitials } from '@/hooks/use-initials';
import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';

interface Notification {
    id: string;
    student_name: string;
    student_avatar: string | null;
    requirement_label: string;
    application_number: string;
    upload_count?: number;
    created_at: string;
}

export function NotificationBell() {
    const { auth, notifications, unreadNotificationCount } = usePage<SharedData>().props;
    const isAdmin = !!auth.admin;
    const isCoordinator = !!auth.coordinator;
    const getInitials = useInitials();
    
    // Only show for admin or coordinator
    if (!isAdmin && !isCoordinator) {
        return null;
    }

    const notificationList = (notifications || []) as Notification[];
    const unreadCount = unreadNotificationCount || 0;

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const then = new Date(dateString);
        const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        }

        return then.toLocaleDateString();
    };

    const getApplicationRoute = (applicationNumber: string) => {
        if (isAdmin) {
            return adminRoutes.applications.show(applicationNumber).url;
        }
        return coordinatorRoutes.applications.show(applicationNumber).url;
    };

    const handleNotificationClick = (notificationId: string, applicationNumber: string) => {
        const route = isAdmin 
            ? adminRoutes.notifications.markAsRead({ notification: notificationId })
            : coordinatorRoutes.notifications.markAsRead({ notification: notificationId });
        
        // Mark as read and navigate
        router.post(route.url, {}, {
            preserveScroll: false,
            onSuccess: () => {
                // Navigate to the application page after marking as read
                router.visit(getApplicationRoute(applicationNumber));
            },
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {notificationList.length > 0 ? (
                        <div className="space-y-2">
                            {notificationList.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification.id, notification.application_number)}
                                    className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent cursor-pointer"
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage
                                                src={notification.student_avatar || undefined}
                                                alt={notification.student_name}
                                            />
                                            <AvatarFallback className="bg-muted text-muted-foreground">
                                                {getInitials(notification.student_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <p className="text-sm font-medium leading-tight">
                                                {notification.student_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {(notification.upload_count ?? 1) > 1
                                                    ? 'Uploaded files'
                                                    : 'Uploaded a file'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatTimeAgo(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

