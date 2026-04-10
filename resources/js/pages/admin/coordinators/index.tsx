import adminRoutes from '@/routes/admin';
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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { UserCog, Plus, Edit, MoreVertical } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Coordinators',
        href: adminRoutes.coordinators.index().url,
    },
];

interface Coordinator {
    id: number;
    name: string;
    email: string;
    departments: Array<{
        id: number;
        name: string;
        code?: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface CoordinatorsIndexProps {
    coordinators: {
        data: Coordinator[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function CoordinatorsIndex({ coordinators }: CoordinatorsIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Coordinators" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Coordinators</h1>
                        <p className="text-muted-foreground">
                            Manage coordinator accounts and department assignments
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={adminRoutes.coordinators.create().url}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Coordinator
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Coordinators</CardTitle>
                        <CardDescription>
                            {coordinators.total} coordinator{coordinators.total !== 1 ? 's' : ''} total
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {coordinators.data.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Assigned Departments
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coordinators.data.map((coordinator) => (
                                            <tr
                                                key={coordinator.id}
                                                className="border-b transition-colors hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <UserCog className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium">{coordinator.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-muted-foreground">
                                                        {coordinator.email}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {coordinator.departments.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {coordinator.departments.map((dept) => (
                                                                <span
                                                                    key={dept.id}
                                                                    className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                                >
                                                                    {dept.code ?? dept.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">
                                                            No departments assigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <MoreVertical className="h-4 w-4" />
                                                                <span className="sr-only">Open menu</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link
                                                                    href={adminRoutes.coordinators.edit({ coordinator: coordinator.id }).url}
                                                                    className="flex items-center"
                                                                >
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit
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
                        ) : (
                            <div className="py-12 text-center">
                                <UserCog className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-semibold">No coordinators found</h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Get started by creating your first coordinator.
                                </p>
                                <Button asChild className="mt-4">
                                    <Link href={adminRoutes.coordinators.create().url}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Coordinator
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
