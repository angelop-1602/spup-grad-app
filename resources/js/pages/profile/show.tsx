import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { profilePhotoUrl } from '@/lib/profile-photo';
import * as profileRoutes from '@/routes/profile';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Edit } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile',
        href: profileRoutes.show().url,
    },
];

interface StudentProfile {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix?: string | null;
    date_of_birth: string;
    place_of_birth: string;
    sex: string;
    civil_status: string;
    religion: string | null;
    nationality: string;
    permanent_address: string;
    contact_number: string;
    photo_path: string | null;
    photo_url?: string | null;
    grade_school_name: string | null;
    grade_school_year_graduated: number | null;
    junior_high_school_name: string | null;
    junior_high_school_year_graduated: number | null;
    senior_high_school_name: string | null;
    senior_high_school_year_graduated: number | null;
    college_degree: string | null;
    college_school_name: string | null;
    college_year_graduated: number | null;
    college_transferee_note: string | null;
    graduate_school_degree: string | null;
    graduate_school_school_name: string | null;
    graduate_school_year_graduated: number | null;
}

interface ProfileShowProps {
    profile: StudentProfile | null;
}

export default function ProfileShow({ profile: profileData }: ProfileShowProps) {
    if (!profileData) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Profile" />
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Not Found</CardTitle>
                        <CardDescription>
                            Please complete your profile to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href={profileRoutes.edit().url}>
                                Create Profile
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </AppLayout>
        );
    }

    const fullName = [
        profileData.first_name,
        profileData.middle_name,
        profileData.last_name,
        profileData.suffix,
    ]
        .filter((part): part is string => Boolean(part))
        .join(' ');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>
                                    Your personal details and contact information
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href={profileRoutes.edit().url}>
                                    <Edit className="mr-2 size-4" />
                                    Edit Profile
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {profilePhotoUrl(profileData) && (
                            <div className="flex justify-center">
                                <img
                                    src={profilePhotoUrl(profileData) ?? ''}
                                    alt="Profile photo"
                                    className="h-48 w-48 rounded-lg border-2 border-border object-cover"
                                />
                            </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Full Name
                                </p>
                                <p className="text-sm md:text-base">{fullName}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Date of Birth
                                </p>
                                <p className="text-sm md:text-base">
                                    {new Date(
                                        profileData.date_of_birth,
                                    ).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Place of Birth
                                </p>
                                <p className="text-sm md:text-base">{profileData.place_of_birth}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Sex
                                </p>
                                <p className="text-sm md:text-base">{profileData.sex}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Civil Status
                                </p>
                                <p className="text-sm md:text-base">{profileData.civil_status}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Religion
                                </p>
                                <p className="text-sm md:text-base">{profileData.religion || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Nationality
                                </p>
                                <p className="text-sm md:text-base">{profileData.nationality}</p>
                            </div>
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Contact Number
                                </p>
                                <p className="text-sm md:text-base">{profileData.contact_number}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                Permanent Address
                            </p>
                            <p className="text-sm md:text-base">{profileData.permanent_address}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="text-lg md:text-xl">Educational Background</CardTitle>
                        <CardDescription className="text-xs md:text-sm">
                            Your academic history and qualifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
                        {profileData.grade_school_name && (
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Grade School
                                </p>
                                <p className="text-sm md:text-base">
                                    {profileData.grade_school_name}
                                    {profileData.grade_school_year_graduated &&
                                        ` (${profileData.grade_school_year_graduated})`}
                                </p>
                            </div>
                        )}
                        {profileData.junior_high_school_name && (
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Junior High School
                                </p>
                                <p className="text-sm md:text-base">
                                    {profileData.junior_high_school_name}
                                    {profileData.junior_high_school_year_graduated &&
                                        ` (${profileData.junior_high_school_year_graduated})`}
                                </p>
                            </div>
                        )}
                        {profileData.senior_high_school_name && (
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Senior High School
                                </p>
                                <p className="text-sm md:text-base">
                                    {profileData.senior_high_school_name}
                                    {profileData.senior_high_school_year_graduated &&
                                        ` (${profileData.senior_high_school_year_graduated})`}
                                </p>
                            </div>
                        )}
                        {profileData.college_school_name && (
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    College
                                </p>
                                <p className="text-sm md:text-base">
                                    {profileData.college_degree} -{' '}
                                    {profileData.college_school_name}
                                    {profileData.college_year_graduated &&
                                        ` (${profileData.college_year_graduated})`}
                                </p>
                                {profileData.college_transferee_note && (
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        {profileData.college_transferee_note}
                                    </p>
                                )}
                            </div>
                        )}
                        {profileData.graduate_school_school_name && (
                            <div>
                                <p className="text-xs md:text-sm font-medium text-muted-foreground">
                                    Graduate School
                                </p>
                                <p className="text-sm md:text-base">
                                    {profileData.graduate_school_degree} -{' '}
                                    {profileData.graduate_school_school_name}
                                    {profileData.graduate_school_year_graduated &&
                                        ` (${profileData.graduate_school_year_graduated})`}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
