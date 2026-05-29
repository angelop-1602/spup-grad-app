import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInitials } from '@/hooks/use-initials';
import adminRoutes from '@/routes/admin';
import coordinatorRoutes from '@/routes/coordinator';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const EMPTY_NOTIFICATIONS: Notification[] = [];
const NOTIFICATION_POLL_INTERVAL = 5000;
const NOTIFICATION_SOUND_URL = '/notification-sound.mp3';

interface Notification {
    id: string;
    type?: string;
    student_name: string;
    student_avatar: string | null;
    student_id?: string;
    requirement_label: string;
    application_number: string;
    upload_count?: number;
    course_name?: string;
    department_name?: string;
    created_at: string;
    read_at?: string | null;
}

interface NotificationPayload {
    notifications: Notification[];
    unreadNotificationCount: number;
}

function xsrfToken() {
    const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));

    return token ? decodeURIComponent(token.slice('XSRF-TOKEN='.length)) : null;
}

export function NotificationBell() {
    const { auth, notifications, unreadNotificationCount } =
        usePage<SharedData>().props;
    const isAdmin = !!auth.admin;
    const isCoordinator = !!auth.coordinator;
    const getInitials = useInitials();

    const pageNotifications = (notifications ??
        EMPTY_NOTIFICATIONS) as Notification[];
    const [notificationList, setNotificationList] =
        useState<Notification[]>(pageNotifications);
    const [unreadCount, setUnreadCount] = useState(
        unreadNotificationCount ?? 0,
    );
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const soundTimeoutsRef = useRef<number[]>([]);
    const hasSyncedInitialPayloadRef = useRef(false);
    const seenNotificationIdsRef = useRef(
        new Set(pageNotifications.map((notification) => notification.id)),
    );

    const canUseNotifications = isAdmin || isCoordinator;
    const notificationBasePath = isAdmin
        ? '/admin/notifications'
        : '/coordinator/notifications';

    const formatTimeAgo = (dateString: string) => {
        const now = new Date();
        const then = new Date(dateString);
        const diffInSeconds = Math.floor(
            (now.getTime() - then.getTime()) / 1000,
        );

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

    const notificationRequest = useCallback(
        async (url: string, method: 'GET' | 'POST' = 'GET') => {
            const headers: Record<string, string> = {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            };

            const token = xsrfToken();

            if (method !== 'GET') {
                headers['Content-Type'] = 'application/json';

                if (token) {
                    headers['X-XSRF-TOKEN'] = token;
                }
            }

            const response = await fetch(url, {
                method,
                headers,
                credentials: 'same-origin',
                body: method === 'GET' ? undefined : JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(
                    `Notification request failed: ${response.status}`,
                );
            }

            return (await response.json()) as NotificationPayload;
        },
        [],
    );

    const playNotificationSound = useCallback((count: number) => {
        for (let index = 0; index < count; index += 1) {
            const timeoutId = window.setTimeout(() => {
                const audio =
                    audioRef.current ?? new Audio(NOTIFICATION_SOUND_URL);

                audioRef.current = audio;
                audio.preload = 'auto';
                audio.currentTime = 0;

                void audio.play().catch(() => undefined);
            }, index * 450);

            soundTimeoutsRef.current.push(timeoutId);
        }
    }, []);

    const syncNotifications = useCallback(
        (
            payload: NotificationPayload,
            options: { playSound?: boolean } = {},
        ) => {
            const nextNotifications = payload.notifications ?? [];
            const nextIds = new Set(
                nextNotifications.map((notification) => notification.id),
            );

            if (!hasSyncedInitialPayloadRef.current) {
                seenNotificationIdsRef.current = nextIds;
                hasSyncedInitialPayloadRef.current = true;
            } else {
                const newNotificationCount = nextNotifications.filter(
                    (notification) =>
                        !seenNotificationIdsRef.current.has(notification.id),
                ).length;

                if ((options.playSound ?? true) && newNotificationCount > 0) {
                    playNotificationSound(newNotificationCount);
                }

                nextNotifications.forEach((notification) => {
                    seenNotificationIdsRef.current.add(notification.id);
                });
            }

            setNotificationList(nextNotifications);
            setUnreadCount(
                payload.unreadNotificationCount ?? nextNotifications.length,
            );
        },
        [playNotificationSound],
    );

    const refreshNotifications = useCallback(
        async (playSound = true) => {
            if (!canUseNotifications) {
                return;
            }

            try {
                const payload = await notificationRequest(notificationBasePath);
                syncNotifications(payload, { playSound });
            } catch {
                // Keep the current UI state if a background poll fails.
            }
        },
        [
            canUseNotifications,
            notificationBasePath,
            notificationRequest,
            syncNotifications,
        ],
    );

    useEffect(() => {
        syncNotifications(
            {
                notifications: pageNotifications,
                unreadNotificationCount: unreadNotificationCount ?? 0,
            },
            { playSound: false },
        );
    }, [pageNotifications, syncNotifications, unreadNotificationCount]);

    useEffect(() => {
        if (!canUseNotifications) {
            return;
        }

        audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        audioRef.current.preload = 'auto';

        const unlockAudio = () => {
            const audio = audioRef.current ?? new Audio(NOTIFICATION_SOUND_URL);

            audioRef.current = audio;
            audio.muted = true;

            void audio
                .play()
                .then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.muted = false;
                })
                .catch(() => {
                    audio.muted = false;
                });

            window.removeEventListener('pointerdown', unlockAudio, true);
            window.removeEventListener('keydown', unlockAudio, true);
        };

        window.addEventListener('pointerdown', unlockAudio, true);
        window.addEventListener('keydown', unlockAudio, true);

        return () => {
            window.removeEventListener('pointerdown', unlockAudio, true);
            window.removeEventListener('keydown', unlockAudio, true);
        };
    }, [canUseNotifications]);

    useEffect(() => {
        if (!canUseNotifications) {
            return;
        }

        void refreshNotifications();

        const intervalId = window.setInterval(() => {
            void refreshNotifications();
        }, NOTIFICATION_POLL_INTERVAL);

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                void refreshNotifications();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [canUseNotifications, refreshNotifications]);

    useEffect(() => {
        return () => {
            soundTimeoutsRef.current.forEach((timeoutId) => {
                window.clearTimeout(timeoutId);
            });
        };
    }, []);

    const getApplicationRoute = (applicationNumber: string) => {
        if (isAdmin) {
            return adminRoutes.applications.show(applicationNumber).url;
        }
        return coordinatorRoutes.applications.show(applicationNumber).url;
    };

    const handleNotificationClick = async (notification: Notification) => {
        setNotificationList((current) =>
            current.filter((item) => item.id !== notification.id),
        );
        setUnreadCount((current) => Math.max(current - 1, 0));

        try {
            const payload = await notificationRequest(
                `${notificationBasePath}/${notification.id}/mark-as-read`,
                'POST',
            );
            syncNotifications(payload, { playSound: false });
        } catch {
            await refreshNotifications(false);
        } finally {
            router.visit(getApplicationRoute(notification.application_number));
        }
    };

    const handleMarkAllAsRead = async (
        event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();

        if (isMarkingAll || unreadCount === 0) {
            return;
        }

        setIsMarkingAll(true);

        try {
            const payload = await notificationRequest(
                `${notificationBasePath}/mark-all-as-read`,
                'POST',
            );
            syncNotifications(payload, { playSound: false });
            router.reload({
                only: ['notifications', 'unreadNotificationCount'],
            });
        } catch {
            await refreshNotifications(false);
        } finally {
            setIsMarkingAll(false);
        }
    };

    // Only show for admin or coordinator
    if (!canUseNotifications) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <div className="min-w-0">
                        <span className="text-sm font-semibold">
                            Notifications
                        </span>
                        {unreadCount > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1 px-2 text-xs"
                            onClick={handleMarkAllAsRead}
                            disabled={isMarkingAll}
                        >
                            {isMarkingAll ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <CheckCheck className="h-3.5 w-3.5" />
                            )}
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {notificationList.length > 0 ? (
                        <div className="space-y-2">
                            {notificationList.map((notification) => (
                                <button
                                    type="button"
                                    key={notification.id}
                                    onClick={() =>
                                        void handleNotificationClick(
                                            notification,
                                        )
                                    }
                                    className="block w-full cursor-pointer rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage
                                                src={
                                                    notification.student_avatar ||
                                                    undefined
                                                }
                                                alt={notification.student_name}
                                            />
                                            <AvatarFallback className="bg-muted text-muted-foreground">
                                                {getInitials(
                                                    notification.student_name,
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="text-sm leading-tight font-medium">
                                                {notification.student_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {(notification.upload_count ??
                                                    1) > 1
                                                    ? `Uploaded ${notification.upload_count} files`
                                                    : 'Uploaded a file'}
                                                {' - '}
                                                {notification.requirement_label}
                                            </p>
                                            {notification.course_name && (
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {notification.course_name}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {formatTimeAgo(
                                                    notification.created_at,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </button>
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
