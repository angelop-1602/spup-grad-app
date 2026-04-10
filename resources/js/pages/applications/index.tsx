import { ApplicationApplicantCell } from '@/components/application-applicant-cell';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import applicationRoutes from '@/routes/applications/index';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FileText, Eye, Edit, Calendar, MoreVertical, Download, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Applications',
        href: applicationRoutes.index().url,
    },
];

interface Application {
    id: number;
    application_number: string;
    user: {
        id: number;
        name: string;
        email: string;
        student_id: string;
        profile: {
            first_name: string;
            last_name: string;
            middle_name: string | null;
            suffix?: string | null;
            photo_path?: string | null;
        } | null;
    };
    window: {
        id: number;
        title: string;
        start_date: string;
        end_date: string;
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

interface ApplicationsIndexProps {
    currentApplications: Application[];
    pastApplications: Application[];
    currentWindow: {
        id: number;
        title: string;
        start_date: string;
        end_date: string;
    } | null;
}

const statusConfig = {
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    incomplete: { label: 'Incomplete', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

export default function ApplicationsIndex({
    currentApplications,
    pastApplications,
    currentWindow,
}: ApplicationsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Applications" />
            <div className="flex h-full flex-1 flex-col gap-4 md:gap-6 overflow-x-auto rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight">My Applications</h1>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            View and manage your graduation applications
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="current" className="w-full">
                    <TabsList>
                        <TabsTrigger value="current" className="text-xs md:text-sm">
                            Current Window
                            {currentApplications.length > 0 && (
                                <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 md:px-2 text-[10px] md:text-xs text-primary-foreground">
                                    {currentApplications.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="past" className="text-xs md:text-sm">
                            Past Windows
                            {pastApplications.length > 0 && (
                                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 md:px-2 text-[10px] md:text-xs">
                                    {pastApplications.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="current" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                        {currentWindow ? (
                            <>
                                <div className="mb-3 md:mb-4">
                                    <h2 className="text-sm md:text-base font-semibold">Current Application Window</h2>
                                    <p className="text-xs md:text-sm text-muted-foreground">{currentWindow.title}</p>
                                </div>
                                {currentApplications.length > 0 ? (
                                    <>
                                        {/* Mobile Card View */}
                                        <div className=" md:hidden">
                                            {currentApplications.map((application) => (
                                                <Card key={application.id} className="border">
                                                    <CardHeader>
                                                        <CardTitle className="grid grid-cols-[1fr_auto] gap-2 items-start">
                                                            <div className="min-w-0 space-y-3">
                                                                <ApplicationApplicantCell
                                                                    name={application.user.name}
                                                                    studentId={application.user.student_id}
                                                                    profile={application.user.profile}
                                                                    compact
                                                                />
                                                                <p className="text-sm font-semibold">
                                                                    {application.course.name}
                                                                </p>
                                                                {application.major && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {application.major}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-end">
                                                                <span
                                                                    className={`rounded-full px-2 py-1 text-xs font-medium shrink-0 ${statusConfig[
                                                                            application.status
                                                                        ].color
                                                                        }`}
                                                                >
                                                                    {
                                                                        statusConfig[
                                                                            application.status
                                                                        ].label
                                                                    }
                                                                </span>
                                                            </div>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm font-semibold">Application Number: </span>
                                                                <span className="text-sm font-semibold">
                                                                    {application.application_number}
                                                                </span>
                                                            </div>

                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>
                                                                Submitted: {new Date(
                                                                    application.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 pt-2 border-t">
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    asChild
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="flex-1 min-w-[90px]"
                                                                >
                                                                    <Link
                                                                        href={applicationRoutes.show(
                                                                            application.application_number,
                                                                        ).url}
                                                                    >
                                                                        <Eye className="mr-2 h-3.5 w-3.5" />
                                                                        View
                                                                    </Link>
                                                                </Button>
                                                                {(application.status === 'submitted' || 
                                                                  application.status === 'incomplete' || 
                                                                  application.status === 'approved') && (
                                                                    <Button
                                                                        asChild
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="flex-1 min-w-[90px]"
                                                                    >
                                                                        <Link
                                                                            href={applicationRoutes.edit(
                                                                                application.application_number,
                                                                            ).url}
                                                                        >
                                                                            <Edit className="mr-2 h-3.5 w-3.5" />
                                                                            Edit
                                                                        </Link>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            {application.status === 'approved' && (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="w-full"
                                                                >
                                                                    <a
                                                                        href={applicationRoutes.download(
                                                                            application.application_number,
                                                                        ).url}
                                                                    >
                                                                        <Download className="mr-2 h-3.5 w-3.5" />
                                                                        Download DOCX
                                                                    </a>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* Desktop Table View */}
                                        <Card className="hidden md:block">
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[600px]">
                                                        <thead>
                                                            <tr className="border-b">
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                                    Application ID
                                                                </th>
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                                    Profile
                                                                </th>
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                                    Application Details
                                                                </th>
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                                    Status
                                                                </th>
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">
                                                                    Submitted
                                                                </th>
                                                                <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                                    Actions
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {currentApplications.map((application) => (
                                                                <tr
                                                                    key={application.id}
                                                                    className="border-b transition-colors hover:bg-muted/50"
                                                                >
                                                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                                                        <span className="text-xs md:text-sm font-mono text-muted-foreground">
                                                                            {application.application_number}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                                                        <ApplicationApplicantCell
                                                                            name={application.user.name}
                                                                            studentId={application.user.student_id}
                                                                            profile={application.user.profile}
                                                                            compact
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                                                        <div>
                                                                            <p className="text-xs md:text-sm font-medium">
                                                                                {application.course.name}
                                                                            </p>
                                                                            {application.major && (
                                                                                <p className="text-[10px] md:text-sm text-muted-foreground">
                                                                                    {application.major}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                                                        <span
                                                                            className={`rounded-full px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-medium ${statusConfig[
                                                                                    application.status
                                                                                ].color
                                                                                }`}
                                                                        >
                                                                            {
                                                                                statusConfig[
                                                                                    application.status
                                                                                ].label
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell">
                                                                        <span className="text-xs md:text-sm text-muted-foreground">
                                                                            {new Date(
                                                                                application.created_at,
                                                                            ).toLocaleDateString()}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 md:px-4 py-2 md:py-3">
                                                                        <DropdownMenu>
                                                                            <DropdownMenuTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="h-8 w-8 p-0"
                                                                                >
                                                                                    <MoreVertical className="h-4 w-4" />
                                                                                </Button>
                                                                            </DropdownMenuTrigger>
                                                                            <DropdownMenuContent align="end">
                                                                                <DropdownMenuItem asChild>
                                                                                    <Link
                                                                                        href={applicationRoutes.show(
                                                                                            application.application_number,
                                                                                        ).url}
                                                                                    >
                                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                                        View Details
                                                                                    </Link>
                                                                                </DropdownMenuItem>
                                                                                {application.status === 'approved' && (
                                                                                    <DropdownMenuItem asChild>
                                                                                        <a
                                                                                            href={applicationRoutes.download(
                                                                                                application.application_number,
                                                                                            ).url}
                                                                                        >
                                                                                            <Download className="mr-2 h-4 w-4" />
                                                                                            Download DOCX
                                                                                        </a>
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                                {(application.status ===
                                                                                    'submitted' || application.status === 'incomplete') && (
                                                                                        <DropdownMenuItem asChild>
                                                                                            <Link
                                                                                                href={applicationRoutes.edit(
                                                                                                    application.application_number,
                                                                                                ).url}
                                                                                            >
                                                                                                <Edit className="mr-2 h-4 w-4" />
                                                                                                Edit
                                                                                            </Link>
                                                                                        </DropdownMenuItem>
                                                                                    )}
                                                                            </DropdownMenuContent>
                                                                        </DropdownMenu>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                ) : (
                                    <div className="py-6 md:py-8 text-center">
                                        <FileText className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
                                        <p className="mt-3 md:mt-4 text-xs md:text-sm text-muted-foreground">
                                            No applications for the current window.
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Card>
                                <CardHeader className="p-4 md:p-6">
                                    <CardTitle className="text-lg md:text-xl">No Current Application Window</CardTitle>
                                    <CardDescription className="text-xs md:text-sm">
                                        There is currently no active application window
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 md:p-6">
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Please check back later or contact the Registrar's Office
                                        for more information.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="past" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
                        {pastApplications.length > 0 ? (
                            <>
                                <div className="mb-3 md:mb-4">
                                    <h2 className="text-sm md:text-base font-semibold">Past Applications</h2>
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Applications from previous application windows
                                    </p>
                                </div>
                                {/* Mobile Card View */}
                                <div className="space-y-3 md:hidden">
                                    {pastApplications.map((application) => (
                                        <Card key={application.id} className="border">
                                            <CardHeader className="pb-2">
                                                <div className="space-y-2">
                                                    <CardTitle className="text-xs font-mono text-muted-foreground">
                                                        {application.application_number}
                                                    </CardTitle>
                                                    <ApplicationApplicantCell
                                                        name={application.user.name}
                                                        studentId={application.user.student_id}
                                                        profile={application.user.profile}
                                                        compact
                                                    />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>{application.window.title}</span>
                                                </div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold">
                                                            {application.degree_title}
                                                        </p>
                                                        {application.major && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {application.major}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs font-medium shrink-0 ${statusConfig[
                                                                application.status
                                                            ].color
                                                            }`}
                                                    >
                                                        {
                                                            statusConfig[
                                                                application.status
                                                            ].label
                                                        }
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>
                                                        Submitted: {new Date(
                                                            application.created_at,
                                                        ).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1"
                                                    >
                                                        <Link
                                                            href={applicationRoutes.show(
                                                                application.application_number,
                                                            ).url}
                                                        >
                                                            <Eye className="mr-2 h-3.5 w-3.5" />
                                                            View Details
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <Card className="hidden md:block">
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[600px]">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Application ID
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Profile
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Window
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Application Details
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Status
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold hidden sm:table-cell">
                                                            Submitted
                                                        </th>
                                                        <th className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pastApplications.map((application) => (
                                                        <tr
                                                            key={application.id}
                                                            className="border-b transition-colors hover:bg-muted/50"
                                                        >
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span className="text-xs md:text-sm font-mono text-muted-foreground">
                                                                    {application.application_number}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <ApplicationApplicantCell
                                                                    name={application.user.name}
                                                                    studentId={application.user.student_id}
                                                                    profile={application.user.profile}
                                                                    compact
                                                                />
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <div className="flex items-center gap-1.5 md:gap-2">
                                                                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                                                                    <span className="text-xs md:text-sm">
                                                                        {application.window.title}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <div>
                                                                    <p className="text-xs md:text-sm font-medium">
                                                                        {application.degree_title}
                                                                    </p>
                                                                    {application.major && (
                                                                        <p className="text-[10px] md:text-sm text-muted-foreground">
                                                                            {application.major}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <span
                                                                    className={`rounded-full px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-medium ${statusConfig[
                                                                            application.status
                                                                        ].color
                                                                        }`}
                                                                >
                                                                    {
                                                                        statusConfig[
                                                                            application.status
                                                                        ].label
                                                                    }
                                                                </span>
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3 hidden sm:table-cell">
                                                                <span className="text-xs md:text-sm text-muted-foreground">
                                                                    {new Date(
                                                                        application.created_at,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            </td>
                                                            <td className="px-2 md:px-4 py-2 md:py-3">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 w-7 md:h-8 md:w-8 p-0"
                                                                        >
                                                                            <MoreVertical className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem asChild>
                                                                            <Link
                                                                                href={applicationRoutes.show(
                                                                                    application.application_number,
                                                                                ).url}
                                                                            >
                                                                                <Eye className="mr-2 h-4 w-4" />
                                                                                View Details
                                                                            </Link>
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <CardHeader className="p-4 md:p-6">
                                    <CardTitle className="text-lg md:text-xl">No Past Applications</CardTitle>
                                    <CardDescription className="text-xs md:text-sm">
                                        You haven't submitted any applications in previous
                                        windows
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 md:p-6">
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Your past applications will appear here once you submit
                                        them.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}

