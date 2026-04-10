import adminRoutes from '@/routes/admin';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminRoutes.dashboard().url,
    },
    {
        title: 'Application Windows',
        href: adminRoutes.windows.index().url,
    },
    {
        title: 'Create Window',
        href: adminRoutes.windows.create().url,
    },
];

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

export default function CreateWindow() {
    const currentYear = new Date().getFullYear();
    const [monthIndex, setMonthIndex] = useState<number | ''>('');
    const [year, setYear] = useState<string>(String(currentYear));
    const [startDateOnly, setStartDateOnly] = useState<string>('');
    const [endDateOnly, setEndDateOnly] = useState<string>('');

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
    });

    useEffect(() => {
        if (monthIndex !== '' && year) {
            const title = `${MONTHS[monthIndex]} ${year}`;
            setData('title', title);
        }
    }, [monthIndex, year, setData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(adminRoutes.windows.store().url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Application Window" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={adminRoutes.windows.index().url}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Create Application Window</h1>
                            <p className="text-muted-foreground">
                                Define a new application submission window
                            </p>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Window Details
                        </CardTitle>
                        <CardDescription>
                            Students can only submit applications during the active window period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Window Month and Year *</Label>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="month" className="text-xs text-muted-foreground">
                                            Month
                                        </Label>
                                        <select
                                            id="month"
                                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                            value={monthIndex === '' ? '' : monthIndex}
                                            onChange={(e) => {
                                                const value = e.target.value === '' ? '' : Number(e.target.value);
                                                setMonthIndex(value);
                                            }}
                                            required
                                        >
                                            <option value="">Select month</option>
                                            {MONTHS.map((label, index) => (
                                                <option key={label} value={index}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="year" className="text-xs text-muted-foreground">
                                            Year
                                        </Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            min={currentYear - 1}
                                            max={currentYear + 10}
                                            value={year}
                                            onChange={(e) => setYear(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                {errors.title && (
                                    <p className="text-sm text-red-600">{errors.title}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Optional description for this window"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">{errors.description}</p>
                                )}
                            </div>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Start of window *</Label>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor="start_date"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Date
                                            </Label>
                                            <Input
                                                id="start_date"
                                                type="date"
                                                value={startDateOnly}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setStartDateOnly(value);
                                                    setData(
                                                        'start_date',
                                                        value ? `${value}T00:00` : '',
                                                    );
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor="start_time"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Time
                                            </Label>
                                            <Input
                                                id="start_time"
                                                type="time"
                                                value={startDateOnly ? '00:00' : ''}
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                    {errors.start_date && (
                                        <p className="text-sm text-red-600">{errors.start_date}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>End of window *</Label>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor="end_date"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Date
                                            </Label>
                                            <Input
                                                id="end_date"
                                                type="date"
                                                value={endDateOnly}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setEndDateOnly(value);
                                                    setData(
                                                        'end_date',
                                                        value ? `${value}T23:59` : '',
                                                    );
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor="end_time"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Time
                                            </Label>
                                            <Input
                                                id="end_time"
                                                type="time"
                                                value={endDateOnly ? '23:59' : ''}
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                    {errors.end_date && (
                                        <p className="text-sm text-red-600">{errors.end_date}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Creating...' : 'Create Window'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link href={adminRoutes.windows.index().url}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

