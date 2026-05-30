import { ApplicationStatusBadge } from '@/components/application-status-badge';
import type { ApplicationStatus } from '@/components/application-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

export type PossibleDuplicateApplication = {
    id: number;
    application_number: string;
    applicant_name: string;
    student_id: string | null;
    email: string | null;
    window_title: string | null;
    department_code: string | null;
    course_name: string | null;
    status: string;
    created_at: string | null;
    show_url: string | null;
    edit_url: string | null;
    delete_url: string | null;
};

type PossibleDuplicateApplicationsProps = {
    duplicates: PossibleDuplicateApplication[];
    canDelete?: boolean;
};

export function PossibleDuplicateApplications({
    duplicates,
    canDelete = false,
}: PossibleDuplicateApplicationsProps) {
    if (duplicates.length === 0) {
        return null;
    }

    const openApplication = (duplicate: PossibleDuplicateApplication) => {
        const url = duplicate.show_url ?? duplicate.edit_url;
        if (url) {
            router.visit(url);
        }
    };

    const deleteApplication = (duplicate: PossibleDuplicateApplication) => {
        if (!duplicate.delete_url) {
            return;
        }

        const confirmed = window.confirm(
            `Delete application ${duplicate.application_number}? This cannot be undone.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(duplicate.delete_url, {
            preserveScroll: true,
        });
    };

    return (
        <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold">
                        Possible Duplicate Applications
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Same first and last name with a different application
                        record.
                    </p>
                </div>
                <Badge
                    variant="outline"
                    className="w-fit border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                >
                    {duplicates.length} possible match
                    {duplicates.length === 1 ? '' : 'es'}
                </Badge>
            </div>

            <div className="mt-3 overflow-x-auto rounded-md border bg-background/70">
                <table className="w-full min-w-[760px] text-xs">
                    <thead className="bg-muted/50 text-left">
                        <tr>
                            <th className="px-3 py-2 font-medium">
                                Applicant
                            </th>
                            <th className="px-3 py-2 font-medium">Window</th>
                            <th className="px-3 py-2 font-medium">
                                Program
                            </th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {duplicates.map((duplicate) => (
                            <tr
                                key={duplicate.id}
                                className="cursor-pointer border-t align-top hover:bg-muted/40"
                                onClick={() => openApplication(duplicate)}
                                role="link"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === 'Enter' ||
                                        event.key === ' '
                                    ) {
                                        event.preventDefault();
                                        openApplication(duplicate);
                                    }
                                }}
                            >
                                <td className="px-3 py-2">
                                    <p className="font-medium">
                                        {duplicate.applicant_name}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {duplicate.student_id ?? '-'} -{' '}
                                        {duplicate.application_number}
                                    </p>
                                    <p className="break-all text-muted-foreground">
                                        {duplicate.email ?? '-'}
                                    </p>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                    {duplicate.window_title ?? '-'}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                    <p>{duplicate.department_code ?? '-'}</p>
                                    <p>{duplicate.course_name ?? '-'}</p>
                                </td>
                                <td className="px-3 py-2">
                                    <ApplicationStatusBadge
                                        status={
                                            duplicate.status as ApplicationStatus
                                        }
                                        size="sm"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                        {duplicate.show_url ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    router.visit(
                                                        duplicate.show_url ?? '',
                                                    );
                                                }}
                                            >
                                                <Eye className="size-3.5" />
                                                Open
                                            </Button>
                                        ) : null}
                                        {duplicate.edit_url ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    router.visit(
                                                        duplicate.edit_url ?? '',
                                                    );
                                                }}
                                            >
                                                <Pencil className="size-3.5" />
                                                Edit
                                            </Button>
                                        ) : null}
                                        {canDelete && duplicate.delete_url ? (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteApplication(
                                                        duplicate,
                                                    );
                                                }}
                                            >
                                                <Trash2 className="size-3.5" />
                                                Delete
                                            </Button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
