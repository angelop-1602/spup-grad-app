import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import applicationRoutes from '@/routes/applications/index';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Clock, FileText, XCircle, AlertCircle, GraduationCap, FileCheck, CreditCard, Send } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '#',
    },
];

interface Application {
    id: number;
    window: {
        id: number;
        title: string;
        start_date: string;
        end_date: string;
    };
    department: {
        id: number;
        name: string;
    };
    course: {
        id: number;
        name: string;
    };
    major: string;
    degree_title: string;
    presence: string;
    status: 'submitted' | 'pending' | 'approved' | 'incomplete';
    created_at: string;
    updated_at: string;
}

interface DashboardProps {
    currentApplication: Application | null;
    currentWindow: {
        id: number;
        title: string;
        start_date: string;
        end_date: string;
    } | null;
}

const statusConfig = {
    submitted: { label: 'Submitted', icon: FileText, color: 'text-blue-600' },
    pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600' },
    approved: { label: 'Approved', icon: CheckCircle2, color: 'text-green-600' },
    incomplete: { label: 'Incomplete', icon: AlertCircle, color: 'text-orange-600' },
};

export default function Dashboard({
    currentApplication,
    currentWindow,
}: DashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 md:gap-6 overflow-x-auto rounded-xl p-3 md:p-4">
                {/* Current Application Section */}
                {currentWindow && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg md:text-xl">Current Graduation Application Window: {currentWindow.title}</CardTitle>
                        </CardHeader>
                        <CardContent className=" md:p-6">
                            <div className="space-y-4 md:space-y-6">
                                    {/* Policy Notice */}
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 md:p-4 dark:border-amber-800 dark:bg-amber-900/20">
                                        <div className="flex items-start gap-2 md:gap-3">
                                            <AlertCircle className="mt-0.5 size-4 md:size-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <div className="flex-1 min-w-0 space-y-2">
                                                <h3 className="text-sm md:text-base font-semibold text-amber-900 dark:text-amber-100">
                                                    Graduation Application Policy
                                                </h3>
                                                <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
                                                    The University strictly enforces the <strong>"No Application, No Graduation"</strong> policy. Submission of an official graduation application is <strong>mandatory</strong> as it serves as the primary basis for evaluating a student's academic record and determining eligibility for graduation.
                                                </p>
                                                <p className="text-xs md:text-sm text-amber-800 dark:text-amber-200">
                                                    To avoid delays in processing and approval, students are strongly advised to submit their application within the prescribed period.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Graduation Application Procedure */}
                                    <div className="space-y-3 md:space-y-4">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap className="size-4 md:size-5 text-primary shrink-0" />
                                            <h3 className="text-base md:text-lg font-semibold">
                                                Graduation Application Procedure
                                            </h3>
                                        </div>
                                        <p className="text-xs md:text-sm text-muted-foreground">
                                            To ensure a smooth and efficient application process, please follow the steps outlined below:
                                        </p>

                                        <div className="space-y-3 md:space-y-4">
                                            {/* Step 1 */}
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-semibold">
                                                    1
                                                </div>
                                                <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <FileCheck className="size-3.5 md:size-4 text-primary shrink-0" />
                                                        <h4 className="text-sm md:text-base font-semibold">Create an Account and Initiate Your Application</h4>
                                                    </div>
                                                    <ul className="list-disc list-inside space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
                                                        <li>Access the Graduation Application Portal</li>
                                                        <li>Complete your Student Profile accurately</li>
                                                        <li>Create and submit your Graduation Application online</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Step 2 */}
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-semibold">
                                                    2
                                                </div>
                                                <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <Clock className="size-3.5 md:size-4 text-primary shrink-0" />
                                                        <h4 className="text-sm md:text-base font-semibold">Verification of Application</h4>
                                                    </div>
                                                    <p className="text-xs md:text-sm text-muted-foreground">
                                                        The Registrar's Office will review your submitted documents and application requirements.
                                                    </p>
                                                    <ul className="list-disc list-inside space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground ml-2">
                                                        <li>If your application is incomplete, you will be notified to upload the missing documents.</li>
                                                        <li>Once your application is approved, download and print the official application form.</li>
                                                    </ul>
                                                    <div className="rounded-md bg-muted p-2.5 md:p-3 text-xs md:text-sm mt-1.5">
                                                        <p className="font-medium mb-1">Important:</p>
                                                        <p className="text-muted-foreground">
                                                            Students residing outside the region should coordinate with their Adviser or Program Coordinator for assistance in completing the process.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Step 3 */}
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-semibold">
                                                    3
                                                </div>
                                                <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <CreditCard className="size-3.5 md:size-4 text-primary shrink-0" />
                                                        <h4 className="text-sm md:text-base font-semibold">Validation and Payment</h4>
                                                    </div>
                                                    <ul className="list-disc list-inside space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
                                                        <li>Present your printed application form to the Dean's Office for validation</li>
                                                        <li>Settle the required graduation fee at the Finance Office</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Step 4 */}
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex h-7 w-7 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs md:text-sm font-semibold">
                                                    4
                                                </div>
                                                <div className="flex-1 space-y-1.5 md:space-y-2 min-w-0">
                                                    <div className="flex items-center gap-1.5 md:gap-2">
                                                        <Send className="size-3.5 md:size-4 text-primary shrink-0" />
                                                        <h4 className="text-sm md:text-base font-semibold">Submission of Application Form</h4>
                                                    </div>
                                                    <p className="text-xs md:text-sm text-muted-foreground">
                                                        Submit the validated and signed application form to the Registrar's Office to finalize your graduation application.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Guidelines */}
                                        <div className="rounded-md border bg-muted/50 p-3 md:p-4">
                                            <h4 className="mb-1.5 md:mb-2 text-sm md:text-base font-semibold">Additional Guidelines</h4>
                                            <ul className="list-disc list-inside space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
                                                <li>Ensure all required fields and documents are accurately completed</li>
                                                <li>Monitor official announcements for application deadlines</li>
                                                <li>For inquiries or assistance, contact the Registrar's Office at <strong>0915-564-8291</strong></li>
                                            </ul>
                                        </div>

                                        {/* Call to Action */}
                                        {!currentApplication && (
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 md:p-4">
                                                <div className="flex-1">
                                                    <p className="text-sm md:text-base font-semibold">
                                                        🎓 You're one step closer to your graduation day—congratulations!
                                                    </p>
                                                </div>
                                                <Button asChild size="sm" className="w-full sm:w-auto">
                                                    <Link href={applicationRoutes.create().url}>
                                                        Create Application
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                        {currentApplication && (
                                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 md:p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                                <p className="text-xs md:text-sm text-blue-800 dark:text-blue-200">
                                                    <strong>Note:</strong> You already have an application for this window. You can find and manage it in the{' '}
                                                    <Link href={applicationRoutes.index().url} className="underline font-semibold">
                                                        Applications page
                                                    </Link>.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                        </CardContent>
                    </Card>
                )}

                {/* No Application Window Message */}
                {!currentWindow && (
                    <Card>
                        <CardHeader className="p-4 md:p-6">
                            <CardTitle className="text-lg md:text-xl">No Application Window Available</CardTitle>
                            <CardDescription className="text-xs md:text-sm">
                                There is currently no active application window
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                            <p className="text-xs md:text-sm text-muted-foreground">
                                Please check back later or contact the Registrar's Office for more information.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
