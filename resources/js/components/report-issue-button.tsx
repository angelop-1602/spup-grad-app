import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/toast-context';
import { safeSessionStorage } from '@/lib/browser-storage';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { BadgeAlert, Paperclip, Send } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

type ReportIssueForm = {
    category: string;
    priority: string;
    subject: string;
    description: string;
    reporter_name: string;
    reporter_email: string;
    page_url: string;
    screenshot: File | null;
};

const categories = [
    { value: 'technical', label: 'Technical problem' },
    { value: 'application', label: 'Application form' },
    { value: 'account_access', label: 'Access or verification' },
    { value: 'document_upload', label: 'Document upload' },
    { value: 'other', label: 'Other issue' },
];

const priorities = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'low', label: 'Low' },
];

const REPORT_ISSUE_TOAST_KEY = 'report-issue-screenshot-reminder-shown';

export default function ReportIssueButton() {
    const page = usePage<SharedData>();
    const { addToast } = useToast();
    const auth = page.props.auth;
    const path =
        typeof window === 'undefined' ? page.url : window.location.pathname;
    const isStaffRoute =
        path.startsWith('/developer') ||
        path.startsWith('/admin') ||
        path.startsWith('/coordinator');
    const isStaffSession = Boolean(
        auth?.developer || auth?.admin || auth?.coordinator,
    );
    const shouldShowReportIssue = !isStaffRoute && !isStaffSession;
    const user = auth?.user;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(false);
    const form = useForm<ReportIssueForm>({
        category: 'technical',
        priority: 'normal',
        subject: '',
        description: '',
        reporter_name: user?.name ?? '',
        reporter_email: user?.email ?? '',
        page_url: '',
        screenshot: null,
    });

    useEffect(() => {
        if (!shouldShowReportIssue || typeof window === 'undefined') {
            return;
        }

        if (safeSessionStorage.getItem(REPORT_ISSUE_TOAST_KEY)) {
            return;
        }

        const showIssueToast = () => {
            if (safeSessionStorage.getItem(REPORT_ISSUE_TOAST_KEY)) {
                return;
            }

            addToast({
                variant: 'info',
                title: 'Encountered an issue?',
                description:
                    'Take a screenshot first, then click Report issue so you can attach it to the report.',
                duration: 8000,
            });
            safeSessionStorage.setItem(REPORT_ISSUE_TOAST_KEY, 'true');
        };

        const handleError = () => showIssueToast();
        const handleUnhandledRejection = () => showIssueToast();

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener(
                'unhandledrejection',
                handleUnhandledRejection,
            );
        };
    }, [addToast, shouldShowReportIssue]);

    if (!shouldShowReportIssue) {
        return null;
    }

    const resetForm = () => {
        form.reset();
        form.clearErrors();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.setData('page_url', window.location.href);

        form.post('/support/issues', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                resetForm();
            },
        });
    };

    return (
        <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (nextOpen) {
                        form.setData('page_url', window.location.href);
                    }
                }}
            >
                <DialogTrigger asChild>
                    <Button
                        type="button"
                        size="lg"
                        className="h-12 rounded-full border border-amber-300 bg-amber-400 px-4 font-semibold text-amber-950 shadow-lg shadow-amber-900/20 hover:bg-amber-300 focus-visible:ring-amber-500 dark:border-amber-300/70 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
                        aria-label="Report an issue"
                    >
                        <BadgeAlert className="size-5" />
                        <span>Report issue</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Report an issue</DialogTitle>
                        <DialogDescription>
                            Send the developer team the issue details. If
                            possible, attach a screenshot that shows the issue.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Category</Label>
                                <Select
                                    value={form.data.category}
                                    onValueChange={(value) =>
                                        form.setData('category', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category.value}
                                                value={category.value}
                                            >
                                                {category.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.category} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Priority</Label>
                                <Select
                                    value={form.data.priority}
                                    onValueChange={(value) =>
                                        form.setData('priority', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorities.map((priority) => (
                                            <SelectItem
                                                key={priority.value}
                                                value={priority.value}
                                            >
                                                {priority.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.priority} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="issue-subject">Subject</Label>
                            <Input
                                id="issue-subject"
                                value={form.data.subject}
                                onChange={(event) =>
                                    form.setData('subject', event.target.value)
                                }
                                maxLength={160}
                                required
                            />
                            <InputError message={form.errors.subject} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="issue-description">
                                What happened?
                            </Label>
                            <Textarea
                                id="issue-description"
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                rows={5}
                                required
                            />
                            <InputError message={form.errors.description} />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="issue-name">Your name</Label>
                                <Input
                                    id="issue-name"
                                    value={form.data.reporter_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'reporter_name',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.reporter_name}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="issue-email">Email</Label>
                                <Input
                                    id="issue-email"
                                    type="email"
                                    value={form.data.reporter_email}
                                    onChange={(event) =>
                                        form.setData(
                                            'reporter_email',
                                            event.target.value,
                                        )
                                    }
                                />
                                <InputError
                                    message={form.errors.reporter_email}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="issue-screenshot">Screenshot</Label>
                            <Input
                                ref={fileInputRef}
                                id="issue-screenshot"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => {
                                    const file =
                                        event.target.files?.[0] ?? null;
                                    form.setData('screenshot', file);
                                }}
                            />
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Paperclip className="size-3.5" />
                                JPG, PNG, or WebP up to 10MB.
                            </p>
                            <InputError message={form.errors.screenshot} />
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setOpen(false);
                                    resetForm();
                                }}
                                disabled={form.processing}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Send className="size-4" />
                                {form.processing ? 'Sending...' : 'Send report'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
