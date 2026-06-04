import { HistoryBackButton } from '@/components/history-back-button';
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
import adminRoutes from '@/routes/admin';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
        title: 'Edit Window',
        href: '#',
    },
];

interface ApplicationWindow {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
}

interface EditWindowProps {
    window: ApplicationWindow;
}

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

export default function EditWindow({ window }: EditWindowProps) {
    const parsed = useMemo(() => {
        const monthPattern = MONTHS.join('|');
        const match = window.title.match(
            new RegExp(`^(${monthPattern})\\s+(\\d{4})$`),
        );
        if (!match) {
            return { monthIndex: '', year: '' } as {
                monthIndex: number | '';
                year: string;
            };
        }
        const monthIndex = MONTHS.indexOf(match[1]);
        return {
            monthIndex: monthIndex >= 0 ? monthIndex : ('' as const),
            year: match[2],
        };
    }, [window.title]);

    const [monthIndex, setMonthIndex] = useState<number | ''>(
        parsed.monthIndex,
    );
    const [year, setYear] = useState<string>(
        parsed.year || String(new Date(window.start_date).getFullYear()),
    );

    const initialStartDate = new Date(window.start_date)
        .toISOString()
        .slice(0, 10);
    const initialEndDate = new Date(window.end_date).toISOString().slice(0, 10);

    const [startDateOnly, setStartDateOnly] =
        useState<string>(initialStartDate);
    const [endDateOnly, setEndDateOnly] = useState<string>(initialEndDate);

    const { data, setData, put, processing, errors } = useForm({
        title: window.title,
        description: window.description || '',
        start_date: `${initialStartDate}T00:00`,
        end_date: `${initialEndDate}T23:59`,
    });

    useEffect(() => {
        if (monthIndex !== '' && year) {
            const title = `${MONTHS[monthIndex]} ${year}`;
            setData('title', title);
        }
    }, [monthIndex, year, setData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(adminRoutes.windows.update({ window: window.id }).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Application Window" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HistoryBackButton
                            variant="ghost"
                            size="icon"
                            iconOnly
                            fallbackHref={adminRoutes.windows.index().url}
                            label="Back to application windows"
                        />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Edit Application Window
                            </h1>
                            <p className="text-muted-foreground">
                                Update window details
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
                            Students can only submit applications during the
                            active window period
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Window Month and Year *</Label>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="month"
                                            className="text-xs text-muted-foreground"
                                        >
                                            Month
                                        </Label>
                                        <select
                                            id="month"
                                            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                            value={
                                                monthIndex === ''
                                                    ? ''
                                                    : monthIndex
                                            }
                                            onChange={(e) => {
                                                const value =
                                                    e.target.value === ''
                                                        ? ''
                                                        : Number(
                                                              e.target.value,
                                                          );
                                                setMonthIndex(value);
                                            }}
                                            required
                                        >
                                            <option value="">
                                                Select month
                                            </option>
                                            {MONTHS.map((label, index) => (
                                                <option
                                                    key={label}
                                                    value={index}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="year"
                                            className="text-xs text-muted-foreground"
                                        >
                                            Year
                                        </Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            value={year}
                                            onChange={(e) =>
                                                setYear(e.target.value)
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                                {errors.title && (
                                    <p className="text-sm text-red-600">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Optional description for this window"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600">
                                        {errors.description}
                                    </p>
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
                                                    const value =
                                                        e.target.value;
                                                    setStartDateOnly(value);
                                                    setData(
                                                        'start_date',
                                                        value
                                                            ? `${value}T00:00`
                                                            : '',
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
                                                value={
                                                    startDateOnly ? '00:00' : ''
                                                }
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                    {errors.start_date && (
                                        <p className="text-sm text-red-600">
                                            {errors.start_date}
                                        </p>
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
                                                    const value =
                                                        e.target.value;
                                                    setEndDateOnly(value);
                                                    setData(
                                                        'end_date',
                                                        value
                                                            ? `${value}T23:59`
                                                            : '',
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
                                                value={
                                                    endDateOnly ? '23:59' : ''
                                                }
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
                                        </div>
                                    </div>
                                    {errors.end_date && (
                                        <p className="text-sm text-red-600">
                                            {errors.end_date}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? 'Updating...'
                                        : 'Update Window'}
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <Link
                                        href={adminRoutes.windows.index().url}
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
