import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatName } from '@/utils/format-name';

interface ApplicantProfile {
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    suffix?: string | null;
    photo_path?: string | null;
}

interface ApplicationApplicantCellProps {
    name?: string | null;
    studentId?: string | null;
    email?: string | null;
    profile?: ApplicantProfile | null;
    compact?: boolean;
}

export function ApplicationApplicantCell({
    name,
    studentId,
    email,
    profile,
    compact = false,
}: ApplicationApplicantCellProps) {
    const displayName = profile
        ? formatName(profile.first_name, profile.last_name, profile.middle_name, profile.suffix)
        : name || 'N/A';

    const initials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'AP';

    return (
        <div className="flex items-center gap-3">
            <Avatar className={compact ? 'h-9 w-9 rounded-xl' : 'h-11 w-11 rounded-xl'}>
                {profile?.photo_path ? (
                    <AvatarImage
                        src={`/storage/${profile.photo_path}`}
                        alt={`${displayName} profile`}
                        className="rounded-xl object-cover"
                    />
                ) : null}
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate text-sm font-medium">{displayName}</p>
                {studentId ? (
                    <p className="truncate text-xs text-muted-foreground">{studentId}</p>
                ) : email ? (
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                ) : null}
            </div>
        </div>
    );
}
