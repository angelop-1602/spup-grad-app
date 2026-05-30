import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import coordinatorRoutes from '@/routes/coordinator';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, Search, ShieldQuestion } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Coordinator Dashboard',
        href: coordinatorRoutes.dashboard().url,
    },
    {
        title: 'Manual Verification',
        href: '/coordinator/manual-verification',
    },
];

interface ManualVerificationDraft {
    id: number;
    applicant_name: string;
    email: string;
    student_id: string;
    tracking_code: string;
    tracking_pin: string;
    window_title: string;
    department_id: number | null;
    application_number: string | null;
    created_at: string | null;
}

interface ManualVerificationProps {
    drafts: {
        data: ManualVerificationDraft[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters?: {
        search?: string;
    };
}

export default function CoordinatorManualVerificationIndex({
    drafts,
    filters,
}: ManualVerificationProps) {
    const { addToast } = useToast();
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [verifyingDraftId, setVerifyingDraftId] = useState<number | null>(
        null,
    );

    const updateFilters = (search: string, page = 1) => {
        router.get(
            '/coordinator/manual-verification',
            {
                search: search || undefined,
                page,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const verifyDraft = (draft: ManualVerificationDraft) => {
        setVerifyingDraftId(draft.id);
        router.post(
            `/coordinator/manual-verification/${draft.id}/verify`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setVerifyingDraftId(null),
                onSuccess: () =>
                    addToast({
                        variant: 'success',
                        title: 'Draft verified',
                        description: `${draft.applicant_name} was verified.`,
                        duration: 5000,
                    }),
            },
        );
    };

    const formatTimeAgo = (date: string | null) => {
        if (!date) {
            return 'Unknown';
        }

        const now = new Date();
        const then = new Date(date);
        const diffInSeconds = Math.floor(
            (now.getTime() - then.getTime()) / 1000,
        );

        if (diffInSeconds < 60) return 'Just now';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return then.toLocaleDateString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coordinator Manual Verification" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Manual Verification
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Guest drafts waiting for verification in your
                            assigned departments
                        </p>
                    </div>
                    <Badge variant={drafts.total ? 'outline' : 'secondary'}>
                        {drafts.total} pending
                    </Badge>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle>Pending Guest Drafts</CardTitle>
                                <CardDescription>
                                    Verify drafts when students cannot complete
                                    the email link flow.
                                </CardDescription>
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search email, ID, or tracking..."
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value);
                                        updateFilters(event.target.value);
                                    }}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {drafts.data.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Applicant
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Contact
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Tracking
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Window
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                    Created
                                                </th>
                                                <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                                                    Verify
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drafts.data.map((draft) => (
                                                <tr
                                                    key={draft.id}
                                                    className="border-b transition-colors hover:bg-muted/50"
                                                >
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium">
                                                            {
                                                                draft.applicant_name
                                                            }
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {draft.student_id}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {draft.email}
                                                    </td>
                                                    <td className="px-3 py-2 font-mono">
                                                        <p>
                                                            {
                                                                draft.tracking_code
                                                            }
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {draft.tracking_pin}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {draft.window_title}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {formatTimeAgo(
                                                            draft.created_at,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            onClick={() =>
                                                                verifyDraft(
                                                                    draft,
                                                                )
                                                            }
                                                            disabled={
                                                                verifyingDraftId ===
                                                                draft.id
                                                            }
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            {verifyingDraftId ===
                                                            draft.id
                                                                ? 'Verifying'
                                                                : 'Verify'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {drafts.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                                        <div>
                                            Showing{' '}
                                            {drafts.per_page *
                                                (drafts.current_page - 1) +
                                                1}{' '}
                                            -{' '}
                                            {Math.min(
                                                drafts.per_page *
                                                    drafts.current_page,
                                                drafts.total,
                                            )}{' '}
                                            of {drafts.total}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    drafts.current_page === 1
                                                }
                                                onClick={() =>
                                                    updateFilters(
                                                        searchQuery,
                                                        drafts.current_page - 1,
                                                    )
                                                }
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    drafts.current_page ===
                                                    drafts.last_page
                                                }
                                                onClick={() =>
                                                    updateFilters(
                                                        searchQuery,
                                                        drafts.current_page + 1,
                                                    )
                                                }
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-12 text-center">
                                <ShieldQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
                                <h3 className="mt-4 text-base font-semibold">
                                    No drafts to verify
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Your assigned departments have no pending
                                    guest drafts.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
