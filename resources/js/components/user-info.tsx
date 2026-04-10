import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
}: {
    user: User;
    showEmail?: boolean;
}) {
    const getInitials = useInitials();
    const primaryLabel = (user as any).student_id ?? user.email ?? user.name;

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full border border-neutral-200 dark:border-neutral-700">
                <AvatarImage 
                    src={user.avatar} 
                    alt={primaryLabel}
                    className="object-cover"
                />
                <AvatarFallback className="rounded-full bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600">
                    {getInitials(primaryLabel)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-inherit">{primaryLabel}</span>
                {showEmail && (
                    <span className="truncate text-xs text-sidebar-foreground/70">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
