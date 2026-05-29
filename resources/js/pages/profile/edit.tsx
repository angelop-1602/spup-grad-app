import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ValidationSummary from '@/components/validation-summary';
import { useToast } from '@/contexts/toast-context';
import AppLayout from '@/layouts/app-layout';
import { parseDateOnly, toDateOnlyString } from '@/lib/date-only';
import { profilePhotoUrl } from '@/lib/profile-photo';
import * as profileRoutes from '@/routes/profile';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Form, Head, router, usePage } from '@inertiajs/react';
import { Camera, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile',
        href: profileRoutes.show().url,
    },
    {
        title: 'Edit',
        href: profileRoutes.edit().url,
    },
];

const NATIONALITIES = [
    'Afghan',
    'Albanian',
    'Algerian',
    'American',
    'Andorran',
    'Angolan',
    'Argentine',
    'Armenian',
    'Australian',
    'Austrian',
    'Azerbaijani',
    'Bahamian',
    'Bahraini',
    'Bangladeshi',
    'Barbadian',
    'Belarusian',
    'Belgian',
    'Belizean',
    'Beninese',
    'Bhutanese',
    'Bolivian',
    'Bosnian',
    'Botswanan',
    'Brazilian',
    'British',
    'Bruneian',
    'Bulgarian',
    'Burkinabe',
    'Burmese',
    'Cambodian',
    'Cameroonian',
    'Canadian',
    'Cape Verdean',
    'Central African',
    'Chadian',
    'Chilean',
    'Chinese',
    'Colombian',
    'Comorian',
    'Congolese',
    'Costa Rican',
    'Croatian',
    'Cuban',
    'Cypriot',
    'Czech',
    'Danish',
    'Djiboutian',
    'Dominican',
    'Dutch',
    'Ecuadorian',
    'Egyptian',
    'Emirati',
    'Equatorial Guinean',
    'Eritrean',
    'Estonian',
    'Ethiopian',
    'Fijian',
    'Filipino',
    'Finnish',
    'French',
    'Gabonese',
    'Gambian',
    'Georgian',
    'German',
    'Ghanaian',
    'Greek',
    'Grenadian',
    'Guatemalan',
    'Guinean',
    'Guyanese',
    'Haitian',
    'Honduran',
    'Hungarian',
    'Icelandic',
    'Indian',
    'Indonesian',
    'Iranian',
    'Iraqi',
    'Irish',
    'Israeli',
    'Italian',
    'Ivorian',
    'Jamaican',
    'Japanese',
    'Jordanian',
    'Kazakh',
    'Kenyan',
    'Kuwaiti',
    'Kyrgyz',
    'Laotian',
    'Latvian',
    'Lebanese',
    'Liberian',
    'Libyan',
    'Lithuanian',
    'Luxembourgish',
    'Macedonian',
    'Malagasy',
    'Malawian',
    'Malaysian',
    'Maldivian',
    'Malian',
    'Maltese',
    'Mauritanian',
    'Mauritian',
    'Mexican',
    'Moldovan',
    'Mongolian',
    'Montenegrin',
    'Moroccan',
    'Mozambican',
    'Namibian',
    'Nepalese',
    'New Zealander',
    'Nicaraguan',
    'Nigerien',
    'Nigerian',
    'North Korean',
    'Norwegian',
    'Omani',
    'Pakistani',
    'Palestinian',
    'Panamanian',
    'Papua New Guinean',
    'Paraguayan',
    'Peruvian',
    'Polish',
    'Portuguese',
    'Qatari',
    'Romanian',
    'Russian',
    'Rwandan',
    'Saudi',
    'Scottish',
    'Senegalese',
    'Serbian',
    'Sierra Leonean',
    'Singaporean',
    'Slovak',
    'Slovenian',
    'Somali',
    'South African',
    'South Korean',
    'Spanish',
    'Sri Lankan',
    'Sudanese',
    'Swedish',
    'Swiss',
    'Syrian',
    'Taiwanese',
    'Tajik',
    'Tanzanian',
    'Thai',
    'Tunisian',
    'Turkish',
    'Ugandan',
    'Ukrainian',
    'Uruguayan',
    'Uzbek',
    'Venezuelan',
    'Vietnamese',
    'Welsh',
    'Yemeni',
    'Zambian',
    'Zimbabwean',
];

const RELIGIONS = [
    'Roman Catholic',
    'Christian (Non-Catholic)',
    'Protestant',
    'Evangelical / Born Again',
    'Iglesia ni Cristo',
    'Seventh-day Adventist',
    "Jehovah's Witness",
    'Jesus Is Lord (JIL)',
    'Baptist',
    'Methodist',
    'Pentecostal',
    'Anglican / Episcopal',
    'Orthodox Christian',
    'Islam',
    'Judaism',
    'Hinduism',
    'Buddhism',
    'Sikhism',
    'Taoism',
    'Confucianism',
    'Agnostic',
    'Atheist',
    'Spiritual but not religious',
    'Indigenous / Tribal Beliefs',
    'Other',
    'Prefer not to say',
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

interface StudentProfile {
    id?: number;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
    date_of_birth?: string | null;
    place_of_birth?: string | null;
    sex?: string | null;
    civil_status?: string | null;
    religion?: string | null;
    nationality?: string | null;
    permanent_address?: string | null;
    contact_number?: string | null;
    photo_path?: string | null;
    photo_url?: string | null;
    highest_education_level?:
        | 'elementary'
        | 'junior_high_school'
        | 'senior_high_school'
        | 'college'
        | 'masters'
        | 'doctor'
        | null;
    // Legacy fields
    grade_school_name?: string | null;
    grade_school_year_graduated?: number | null;
    junior_high_school_name?: string | null;
    junior_high_school_year_graduated?: number | null;
    senior_high_school_name?: string | null;
    senior_high_school_year_graduated?: number | null;
    college_degree?: string | null;
    college_school_name?: string | null;
    college_year_graduated?: number | null;
    college_transferee_note?: string | null;
    is_transferee?: boolean | null;
    graduate_school_degree?: string | null;
    graduate_school_school_name?: string | null;
    graduate_school_year_graduated?: number | null;
    // Grade School (Grade 1-6)
    grade_1_school?: string | null;
    grade_1_year?: number | null;
    grade_2_school?: string | null;
    grade_2_year?: number | null;
    grade_3_school?: string | null;
    grade_3_year?: number | null;
    grade_4_school?: string | null;
    grade_4_year?: number | null;
    grade_5_school?: string | null;
    grade_5_year?: number | null;
    grade_6_school?: string | null;
    grade_6_year?: number | null;
    // Junior High School (1st-4th Year)
    jhs_1_school?: string | null;
    jhs_1_year?: number | null;
    jhs_2_school?: string | null;
    jhs_2_year?: number | null;
    jhs_3_school?: string | null;
    jhs_3_year?: number | null;
    jhs_4_school?: string | null;
    jhs_4_year?: number | null;
    // Senior High School (Grade 11-12)
    shs_11_school?: string | null;
    shs_11_year?: number | null;
    shs_12_school?: string | null;
    shs_12_year?: number | null;
    // Graduate School
    grad_masteral_school?: string | null;
    grad_masteral_year?: number | null;
    grad_doctoral_school?: string | null;
    grad_doctoral_year?: number | null;
}

interface ProfileEditProps {
    profile: StudentProfile | null;
}

const COLLEGE_EXPORT_FIELD_LIMIT = 85;

type ProfileYearField =
    | 'grade_1_year'
    | 'grade_2_year'
    | 'grade_3_year'
    | 'grade_4_year'
    | 'grade_5_year'
    | 'grade_6_year'
    | 'jhs_1_year'
    | 'jhs_2_year'
    | 'jhs_3_year'
    | 'jhs_4_year'
    | 'shs_11_year'
    | 'shs_12_year'
    | 'college_year_graduated'
    | 'grad_masteral_year'
    | 'grad_doctoral_year';

export default function ProfileEdit({ profile }: ProfileEditProps) {
    const initial = profile ?? {};
    const pageProps = usePage<SharedData>().props;
    const flash = pageProps.flash as
        | { warning?: string; success?: string }
        | undefined;
    const validationErrors =
        (pageProps.errors as Record<string, string | string[] | undefined>) ??
        {};
    const user = pageProps.auth.user as { student_id?: string; email?: string };
    const [nationalityInput, setNationalityInput] = useState(
        initial.nationality ?? '',
    );
    const [showNationalitySuggestions, setShowNationalitySuggestions] =
        useState(false);
    const [religionInput, setReligionInput] = useState(initial.religion ?? '');
    const [showReligionSuggestions, setShowReligionSuggestions] =
        useState(false);
    const [highestEducationLevel, setHighestEducationLevel] = useState<
        | 'elementary'
        | 'junior_high_school'
        | 'senior_high_school'
        | 'college'
        | 'masters'
        | 'doctor'
        | ''
    >(initial.highest_education_level ?? '');
    const [isTransferee, setIsTransferee] = useState<boolean>(
        initial.is_transferee ?? false,
    );
    const [collegeDegreeInput, setCollegeDegreeInput] = useState(
        initial.college_degree ?? '',
    );
    const [collegeSchoolNameInput, setCollegeSchoolNameInput] = useState(
        initial.college_school_name ?? '',
    );
    // Check if student did NOT attend senior high school
    // Default to false (unchecked) - show inputs by default
    const [didNotAttendSeniorHigh, setDidNotAttendSeniorHigh] =
        useState<boolean>(false);
    const collegeSchoolNameRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        profilePhotoUrl(initial),
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Date of birth broken into day / month / year for easier selection
    const parsedDob = parseDateOnly(initial.date_of_birth);
    const [dobDay, setDobDay] = useState<number | ''>(
        parsedDob ? parsedDob.day : '',
    );
    const [dobMonth, setDobMonth] = useState<number | ''>(
        parsedDob ? parsedDob.month : '',
    );
    const [dobYear, setDobYear] = useState<number | ''>(
        parsedDob ? parsedDob.year : '',
    );
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from(
        { length: currentYear - 1900 + 1 },
        (_, index) => currentYear - index,
    );
    const { addToast } = useToast();

    // Educational background helpers
    const [useSingleGradeSchool, setUseSingleGradeSchool] = useState(false);
    const [singleGradeSchoolName, setSingleGradeSchoolName] = useState('');
    const [useSingleJhsSchool, setUseSingleJhsSchool] = useState(false);
    const [singleJhsSchoolName, setSingleJhsSchoolName] = useState('');
    const [useSingleShsSchool, setUseSingleShsSchool] = useState(false);
    const [singleShsSchoolName, setSingleShsSchoolName] = useState('');
    const profileYearFields = [
        'grade_1_year',
        'grade_2_year',
        'grade_3_year',
        'grade_4_year',
        'grade_5_year',
        'grade_6_year',
        'jhs_1_year',
        'jhs_2_year',
        'jhs_3_year',
        'jhs_4_year',
        'shs_11_year',
        'shs_12_year',
        'college_year_graduated',
        'grad_masteral_year',
        'grad_doctoral_year',
    ] as const satisfies ReadonlyArray<ProfileYearField>;
    const gradeSchoolYearFields = [
        'grade_1_year',
        'grade_2_year',
        'grade_3_year',
        'grade_4_year',
        'grade_5_year',
        'grade_6_year',
    ] as const satisfies ReadonlyArray<ProfileYearField>;
    const jhsYearFields = [
        'jhs_1_year',
        'jhs_2_year',
        'jhs_3_year',
        'jhs_4_year',
    ] as const satisfies ReadonlyArray<ProfileYearField>;
    const shsYearFields = [
        'shs_11_year',
        'shs_12_year',
    ] as const satisfies ReadonlyArray<ProfileYearField>;

    const visibleBasicYearFields = (
        highestLevel: typeof highestEducationLevel,
        includeSeniorHigh: boolean,
    ): ProfileYearField[] => {
        if (!highestLevel) {
            return [];
        }

        const fields: ProfileYearField[] = [...gradeSchoolYearFields];

        if (
            [
                'junior_high_school',
                'senior_high_school',
                'college',
                'masters',
                'doctor',
            ].includes(highestLevel)
        ) {
            fields.push(...jhsYearFields);
        }

        if (
            includeSeniorHigh &&
            ['senior_high_school', 'college', 'masters', 'doctor'].includes(
                highestLevel,
            )
        ) {
            fields.push(...shsYearFields);
        }

        return fields;
    };

    const normalizeYear = (value: number | string | null | undefined) => {
        const year =
            typeof value === 'string' && value !== '' ? Number(value) : value;

        return typeof year === 'number' &&
            Number.isInteger(year) &&
            year >= 1900 &&
            year <= currentYear
            ? year
            : '';
    };
    const [yearValues, setYearValues] = useState<
        Record<ProfileYearField, number | ''>
    >(() =>
        profileYearFields.reduce(
            (values, field) => ({
                ...values,
                [field]: normalizeYear(initial[field]),
            }),
            {} as Record<ProfileYearField, number | ''>,
        ),
    );

    const setYearField = (field: ProfileYearField, value: string) => {
        const selectedYear = value === '' ? '' : Number(value);

        setYearValues((currentValues) => ({
            ...currentValues,
            [field]: selectedYear,
        }));

        if (selectedYear === '') {
            return;
        }

        const fields = visibleBasicYearFields(
            highestEducationLevel,
            !didNotAttendSeniorHigh,
        );
        const changedIndex = fields.indexOf(field);

        if (changedIndex === -1) {
            return;
        }

        setYearValues((currentValues) => {
            const updatedValues = { ...currentValues };

            fields.slice(changedIndex + 1).forEach((nextField, offset) => {
                const nextYear = selectedYear + offset + 1;
                updatedValues[nextField] =
                    nextYear >= 1900 && nextYear <= currentYear
                        ? nextYear
                        : '';
            });

            return updatedValues;
        });
    };

    const YearSelect = ({
        id,
        name,
        value,
        required = false,
    }: {
        id: ProfileYearField;
        name: ProfileYearField;
        value: number | '';
        required?: boolean;
    }) => (
        <select
            id={id}
            name={name}
            value={value === '' ? '' : String(value)}
            onChange={(e) => setYearField(name, e.target.value)}
            required={required}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <option value="">Year Graduated</option>
            {yearOptions.map((year) => (
                <option key={year} value={year}>
                    {year}
                </option>
            ))}
        </select>
    );

    const handlePhotoChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) {
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                addToast({
                    variant: 'error',
                    title: 'Invalid file type',
                    description:
                        'Please select an image file (JPG, PNG, etc.).',
                });
                e.target.value = '';

                return;
            }

            // Validate file size (2MB)
            if (file.size > 2 * 1024 * 1024) {
                addToast({
                    variant: 'error',
                    title: 'Image too large',
                    description: 'Maximum allowed image size is 2MB.',
                });
                e.target.value = '';

                return;
            }

            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        },
        [addToast],
    );

    const handleRemovePhoto = useCallback(() => {
        setPhotoFile(null);
        setPhotoPreview(null);
        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit profile" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-3 md:gap-6 md:p-4">
                <div className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border bg-card p-3 shadow-sm md:space-y-8 md:p-6">
                    <div>
                        <h1 className="text-xl font-semibold md:text-2xl lg:text-3xl">
                            Student profile
                        </h1>
                        <p className="mt-1.5 text-xs text-muted-foreground md:mt-2 md:text-sm">
                            This information is saved once and reused for each
                            graduation application. You can update it anytime.
                        </p>
                    </div>

                    {flash?.success && (
                        <div className="mb-4">
                            <ValidationSummary
                                errors={{ success: flash.success }}
                                title="Profile updated successfully."
                            />
                        </div>
                    )}

                    {flash?.warning && (
                        <div className="mb-4">
                            <ValidationSummary
                                errors={{ warning: flash.warning }}
                                title="Please review your profile information:"
                            />
                        </div>
                    )}

                    <ValidationSummary errors={validationErrors} />

                    <Form
                        action="/profile"
                        method="post"
                        encType="multipart/form-data"
                        className="space-y-8"
                        data-test="student-profile-form"
                        onSubmit={(e) => {
                            console.log('Save profile button clicked');
                            const form = e.currentTarget;
                            form.classList.add('was-validated');

                            // Mark invalid fields and log them for debugging
                            const elements = Array.from(
                                form.querySelectorAll<
                                    | HTMLInputElement
                                    | HTMLSelectElement
                                    | HTMLTextAreaElement
                                >('[data-slot="input"], select, textarea'),
                            );

                            console.log(
                                'Profile validation - total elements found:',
                                elements.length,
                            );
                            const requiredElements = elements.filter(
                                (el) => el.required,
                            );
                            console.log(
                                'Profile validation - required elements:',
                                requiredElements.length,
                                requiredElements.map((el) => el.name || el.id),
                            );

                            const invalidFields: string[] = [];

                            elements.forEach((el) => {
                                if (el.required && !el.checkValidity()) {
                                    el.setAttribute('aria-invalid', 'true');
                                    el.setAttribute(
                                        'title',
                                        'Please fill out this field.',
                                    );
                                    const nameOrId =
                                        el.name || el.id || '(no name)';
                                    invalidFields.push(nameOrId);
                                    console.log(
                                        `Profile validation - invalid field: ${nameOrId}, value: "${el.value}", validity:`,
                                        el.validity,
                                    );
                                } else {
                                    el.removeAttribute('aria-invalid');
                                    el.removeAttribute('title');
                                }
                            });

                            if (invalidFields.length > 0) {
                                console.log(
                                    'Profile invalid fields:',
                                    invalidFields,
                                );
                            } else {
                                console.log(
                                    'Profile form passed client-side required validation',
                                );
                            }

                            // Run browser validation before submitting to the server
                            if (!form.reportValidity()) {
                                e.preventDefault();
                            }
                        }}
                        onSuccess={() => {
                            addToast({
                                variant: 'success',
                                title: 'Profile updated',
                                description:
                                    'Your profile has been successfully updated.',
                            });
                            // Redirect immediately to prevent flash
                            router.visit('/dashboard', {
                                only: [],
                                preserveState: false,
                                preserveScroll: false,
                            });
                        }}
                        onError={(errors) => {
                            console.log('Profile save errors:', errors);
                        }}
                        transform={(data) => {
                            // Convert empty strings to null for year fields
                            const transformed = { ...data };
                            profileYearFields.forEach((field) => {
                                const value = transformed[field];
                                if (
                                    value === '' ||
                                    value === undefined ||
                                    value === null
                                ) {
                                    transformed[field] = null;
                                } else if (typeof value === 'string') {
                                    // Convert string to integer, or null if invalid
                                    const numValue = parseInt(value, 10);
                                    transformed[field] = isNaN(numValue)
                                        ? null
                                        : numValue;
                                }
                                // If it's already a number, keep it as is
                            });

                            return transformed;
                        }}
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="_method"
                                    value="put"
                                />
                                <section className="space-y-4">
                                    {/* 2x2 Photo Upload */}
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="photo">
                                                2x2 ID Photo with Name Tag
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Upload a 2x2 ID photo with white
                                                background and name tag. Maximum
                                                file size: 2MB
                                            </p>
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex justify-center">
                                                    {photoPreview ? (
                                                        <div className="relative">
                                                            <img
                                                                src={
                                                                    photoPreview
                                                                }
                                                                alt="Profile photo preview"
                                                                className="h-32 w-32 rounded-lg border-2 border-border object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    handleRemovePhoto
                                                                }
                                                                aria-label="Remove photo"
                                                                title="Remove photo"
                                                                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                                                            <Camera className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-full">
                                                    <Input
                                                        id="photo"
                                                        name="photo"
                                                        type="file"
                                                        accept="image/jpeg,image/jpg,image/png"
                                                        onChange={
                                                            handlePhotoChange
                                                        }
                                                        ref={photoInputRef}
                                                        className="cursor-pointer"
                                                    />
                                                    <InputError
                                                        message={errors.photo}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                                {/* System information (read-only) */}
                                <section className="space-y-4">
                                    <h2 className="text-base font-semibold text-muted-foreground">
                                        Student account
                                    </h2>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="student_id">
                                                Student ID number
                                            </Label>
                                            <Input
                                                id="student_id"
                                                value={user.student_id ?? ''}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Email address
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={user.email ?? ''}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Personal Information */}
                                <section className="space-y-4">
                                    <h2 className="text-base font-semibold text-muted-foreground">
                                        Personal information
                                    </h2>
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <div className="grid gap-2 md:col-span-1">
                                            <Label htmlFor="first_name">
                                                First name
                                            </Label>
                                            <Input
                                                id="first_name"
                                                name="first_name"
                                                defaultValue={
                                                    initial.first_name ?? ''
                                                }
                                                required
                                            />
                                            <InputError
                                                message={errors.first_name}
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-1">
                                            <Label htmlFor="middle_name">
                                                Middle name
                                            </Label>
                                            <Input
                                                id="middle_name"
                                                name="middle_name"
                                                defaultValue={
                                                    initial.middle_name ?? ''
                                                }
                                                placeholder="Enter full middle name"
                                            />
                                            <InputError
                                                message={errors.middle_name}
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-1">
                                            <Label htmlFor="last_name">
                                                Last name
                                            </Label>
                                            <Input
                                                id="last_name"
                                                name="last_name"
                                                defaultValue={
                                                    initial.last_name ?? ''
                                                }
                                                required
                                            />
                                            <InputError
                                                message={errors.last_name}
                                            />
                                        </div>
                                        <div className="grid gap-2 md:col-span-1">
                                            <Label htmlFor="suffix">
                                                Suffix (Optional)
                                            </Label>
                                            <Input
                                                id="suffix"
                                                name="suffix"
                                                defaultValue={
                                                    initial.suffix ?? ''
                                                }
                                                placeholder="Jr., Sr., III"
                                            />
                                            <InputError
                                                message={errors.suffix}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="date_of_birth">
                                                Date of birth
                                            </Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <select
                                                    id="dob_month"
                                                    aria-label="Birth month"
                                                    value={
                                                        dobMonth === ''
                                                            ? ''
                                                            : dobMonth
                                                    }
                                                    onChange={(e) =>
                                                        setDobMonth(
                                                            e.target.value
                                                                ? Number(
                                                                      e.target
                                                                          .value,
                                                                  )
                                                                : '',
                                                        )
                                                    }
                                                    className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                                    required
                                                >
                                                    <option value="">
                                                        Month
                                                    </option>
                                                    {MONTHS.map((m, index) => (
                                                        <option
                                                            key={m}
                                                            value={index + 1}
                                                        >
                                                            {m}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    id="dob_day"
                                                    aria-label="Birth day"
                                                    value={
                                                        dobDay === ''
                                                            ? ''
                                                            : dobDay
                                                    }
                                                    onChange={(e) =>
                                                        setDobDay(
                                                            e.target.value
                                                                ? Number(
                                                                      e.target
                                                                          .value,
                                                                  )
                                                                : '',
                                                        )
                                                    }
                                                    className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                                    required
                                                >
                                                    <option value="">
                                                        Day
                                                    </option>
                                                    {Array.from(
                                                        { length: 31 },
                                                        (_, i) => i + 1,
                                                    ).map((day) => (
                                                        <option
                                                            key={day}
                                                            value={day}
                                                        >
                                                            {day}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    id="dob_year"
                                                    aria-label="Birth year"
                                                    value={
                                                        dobYear === ''
                                                            ? ''
                                                            : dobYear
                                                    }
                                                    onChange={(e) =>
                                                        setDobYear(
                                                            e.target.value
                                                                ? Number(
                                                                      e.target
                                                                          .value,
                                                                  )
                                                                : '',
                                                        )
                                                    }
                                                    className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                                    required
                                                >
                                                    <option value="">
                                                        Year
                                                    </option>
                                                    {yearOptions.map((year) => (
                                                        <option
                                                            key={year}
                                                            value={year}
                                                        >
                                                            {year}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <input
                                                type="hidden"
                                                name="date_of_birth"
                                                value={
                                                    dobYear &&
                                                    dobMonth &&
                                                    dobDay
                                                        ? toDateOnlyString(
                                                              dobYear,
                                                              dobMonth,
                                                              dobDay,
                                                          )
                                                        : ''
                                                }
                                            />
                                            <InputError
                                                message={errors.date_of_birth}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="place_of_birth">
                                                Place of birth
                                            </Label>
                                            <Input
                                                id="place_of_birth"
                                                name="place_of_birth"
                                                defaultValue={
                                                    initial.place_of_birth ?? ''
                                                }
                                                required
                                            />
                                            <InputError
                                                message={errors.place_of_birth}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="sex">Sex</Label>
                                            <select
                                                id="sex"
                                                name="sex"
                                                aria-label="Sex"
                                                defaultValue={initial.sex ?? ''}
                                                required
                                                className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                            >
                                                <option value="" disabled>
                                                    Select sex
                                                </option>
                                                <option value="Male">
                                                    Male
                                                </option>
                                                <option value="Female">
                                                    Female
                                                </option>
                                                <option value="Prefer not to say">
                                                    Prefer not to say
                                                </option>
                                            </select>
                                            <InputError message={errors.sex} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="civil_status">
                                                Civil status
                                            </Label>
                                            <select
                                                id="civil_status"
                                                name="civil_status"
                                                aria-label="Civil status"
                                                defaultValue={
                                                    initial.civil_status ?? ''
                                                }
                                                required
                                                className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                            >
                                                <option value="" disabled>
                                                    Select civil status
                                                </option>
                                                <option value="Single">
                                                    Single
                                                </option>
                                                <option value="Married">
                                                    Married
                                                </option>
                                                <option value="Divorced">
                                                    Divorced
                                                </option>
                                                <option value="Separated">
                                                    Separated
                                                </option>
                                                <option value="Widowed">
                                                    Widowed
                                                </option>
                                            </select>
                                            <InputError
                                                message={errors.civil_status}
                                            />
                                        </div>
                                        <div className="relative grid gap-2">
                                            <Label htmlFor="religion">
                                                Religion
                                            </Label>
                                            <Input
                                                id="religion"
                                                name="religion"
                                                value={religionInput}
                                                onChange={(e) => {
                                                    setReligionInput(
                                                        e.target.value,
                                                    );
                                                    setShowReligionSuggestions(
                                                        true,
                                                    );
                                                }}
                                                onFocus={() => {
                                                    if (
                                                        religionInput.trim() !==
                                                        ''
                                                    ) {
                                                        setShowReligionSuggestions(
                                                            true,
                                                        );
                                                    }
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setShowReligionSuggestions(
                                                            false,
                                                        );
                                                    }, 200);
                                                }}
                                                placeholder="Start typing to search religions"
                                                autoComplete="off"
                                            />
                                            {showReligionSuggestions &&
                                                religionInput.trim() !== '' && (
                                                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm text-popover-foreground shadow-md">
                                                        {RELIGIONS.filter((r) =>
                                                            r
                                                                .toLowerCase()
                                                                .includes(
                                                                    religionInput
                                                                        .toLowerCase()
                                                                        .trim(),
                                                                ),
                                                        )
                                                            .slice(0, 8)
                                                            .map((r) => (
                                                                <button
                                                                    key={r}
                                                                    type="button"
                                                                    className="flex w-full cursor-pointer items-center px-2 py-1 text-left hover:bg-muted"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        setReligionInput(
                                                                            r,
                                                                        );
                                                                        setShowReligionSuggestions(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    {r}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            <InputError
                                                message={errors.religion}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="relative grid gap-2">
                                            <Label htmlFor="nationality">
                                                Nationality
                                            </Label>
                                            <Input
                                                id="nationality"
                                                name="nationality"
                                                value={nationalityInput}
                                                onChange={(e) => {
                                                    setNationalityInput(
                                                        e.target.value,
                                                    );
                                                    setShowNationalitySuggestions(
                                                        true,
                                                    );
                                                }}
                                                onFocus={() => {
                                                    if (
                                                        nationalityInput.trim() !==
                                                        ''
                                                    ) {
                                                        setShowNationalitySuggestions(
                                                            true,
                                                        );
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Delay hiding to allow click on suggestion
                                                    setTimeout(() => {
                                                        setShowNationalitySuggestions(
                                                            false,
                                                        );
                                                    }, 200);
                                                }}
                                                placeholder="Start typing to search nationalities"
                                                required
                                                autoComplete="off"
                                            />
                                            {showNationalitySuggestions &&
                                                nationalityInput.trim() !==
                                                    '' && (
                                                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm text-popover-foreground shadow-md">
                                                        {NATIONALITIES.filter(
                                                            (n) =>
                                                                n
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        nationalityInput
                                                                            .toLowerCase()
                                                                            .trim(),
                                                                    ),
                                                        )
                                                            .slice(0, 8)
                                                            .map((n) => (
                                                                <button
                                                                    key={n}
                                                                    type="button"
                                                                    className="flex w-full cursor-pointer items-center px-2 py-1 text-left hover:bg-muted"
                                                                    onMouseDown={(
                                                                        e,
                                                                    ) => {
                                                                        e.preventDefault();
                                                                        setNationalityInput(
                                                                            n,
                                                                        );
                                                                        setShowNationalitySuggestions(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    {n}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            <InputError
                                                message={errors.nationality}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="contact_number">
                                                Contact number
                                            </Label>
                                            <Input
                                                id="contact_number"
                                                name="contact_number"
                                                defaultValue={
                                                    initial.contact_number ?? ''
                                                }
                                                placeholder="Enter Contact Number"
                                                required
                                            />
                                            <InputError
                                                message={errors.contact_number}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="permanent_address">
                                            Permanent address
                                        </Label>
                                        <Textarea
                                            id="permanent_address"
                                            name="permanent_address"
                                            defaultValue={
                                                initial.permanent_address ?? ''
                                            }
                                            required
                                            rows={3}
                                        />
                                        <InputError
                                            message={errors.permanent_address}
                                        />
                                    </div>
                                </section>

                                {/* Educational Background */}
                                <section className="space-y-6">
                                    <h2 className="text-base font-semibold text-muted-foreground">
                                        Educational background
                                    </h2>

                                    {/* Highest Education Level Selection */}
                                    <div className="space-y-3 rounded-md border bg-muted/40 p-3 sm:p-4">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="highest_education_level"
                                                className="text-sm sm:text-base"
                                            >
                                                Highest education level
                                                completed *
                                            </Label>
                                            <select
                                                id="highest_education_level"
                                                name="highest_education_level"
                                                aria-label="Highest education level completed"
                                                value={highestEducationLevel}
                                                onChange={(e) =>
                                                    setHighestEducationLevel(
                                                        e.target.value as
                                                            | 'elementary'
                                                            | 'junior_high_school'
                                                            | 'senior_high_school'
                                                            | 'college'
                                                            | 'masters'
                                                            | 'doctor'
                                                            | '',
                                                    )
                                                }
                                                required
                                                className="w-full rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                            >
                                                <option value="" disabled>
                                                    Select highest education
                                                    level
                                                </option>
                                                <option value="elementary">
                                                    Elementary (Grade School)
                                                </option>
                                                <option value="junior_high_school">
                                                    Junior High School
                                                </option>
                                                <option value="senior_high_school">
                                                    Senior High School
                                                </option>
                                                <option value="college">
                                                    College
                                                </option>
                                                <option value="masters">
                                                    Masters
                                                </option>
                                                <option value="doctor">
                                                    Doctor
                                                </option>
                                            </select>
                                            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                                <strong>Note:</strong> This
                                                refers to your highest completed
                                                education level,{' '}
                                                <strong>NOT</strong> your
                                                current enrolled program. For
                                                example, if you are currently
                                                enrolled in a Master's program
                                                (which you are applying to
                                                graduate from), select "College"
                                                as your highest completed
                                                education level. If you are
                                                currently enrolled in a Doctoral
                                                program, select "Masters" as
                                                your highest completed education
                                                level.
                                            </p>
                                            <InputError
                                                message={
                                                    errors.highest_education_level
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Grade school: Grade 1–6 */}
                                    {highestEducationLevel && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        Grade school
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Provide the name of
                                                        school and year
                                                        graduated for each grade
                                                        level (Grade 1–6).
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-3 sm:items-end">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id="same_grade_school"
                                                            checked={
                                                                useSingleGradeSchool
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) => {
                                                                const enabled =
                                                                    checked ===
                                                                    true;
                                                                setUseSingleGradeSchool(
                                                                    enabled,
                                                                );
                                                                if (
                                                                    enabled &&
                                                                    !singleGradeSchoolName
                                                                ) {
                                                                    const firstSchool =
                                                                        (initial[
                                                                            'grade_1_school' as keyof typeof initial
                                                                        ] as
                                                                            | string
                                                                            | undefined) ??
                                                                        '';
                                                                    setSingleGradeSchoolName(
                                                                        firstSchool,
                                                                    );
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor="same_grade_school"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            Same school for all
                                                            grades (1-6) - enter
                                                            school name once
                                                        </Label>
                                                    </div>
                                                </div>
                                            </div>

                                            {useSingleGradeSchool && (
                                                <div className="space-y-2">
                                                    <Label
                                                        htmlFor="grade_school_all"
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        School name (Grades 1–6)
                                                    </Label>
                                                    <Input
                                                        id="grade_school_all"
                                                        placeholder="Name of School"
                                                        value={
                                                            singleGradeSchoolName
                                                        }
                                                        onChange={(e) =>
                                                            setSingleGradeSchoolName(
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {[1, 2, 3, 4, 5, 6].map(
                                                    (grade) => (
                                                        <div
                                                            key={grade}
                                                            className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto,1fr,1fr]"
                                                        >
                                                            <Label
                                                                htmlFor={`grade_${grade}_school`}
                                                                className="w-auto text-sm font-medium sm:w-20"
                                                            >
                                                                GRADE {grade}:
                                                            </Label>

                                                            {/* School input or hidden when using single school */}
                                                            {useSingleGradeSchool ? (
                                                                <>
                                                                    <input
                                                                        type="hidden"
                                                                        id={`grade_${grade}_school`}
                                                                        name={`grade_${grade}_school`}
                                                                        value={
                                                                            singleGradeSchoolName
                                                                        }
                                                                    />
                                                                    <div className="text-xs text-muted-foreground italic">
                                                                        {singleGradeSchoolName ||
                                                                            'Same as above'}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <Input
                                                                    id={`grade_${grade}_school`}
                                                                    name={`grade_${grade}_school`}
                                                                    placeholder="Name of School"
                                                                    defaultValue={String(
                                                                        initial[
                                                                            `grade_${grade}_school` as keyof typeof initial
                                                                        ] ?? '',
                                                                    )}
                                                                    required
                                                                />
                                                            )}

                                                            <YearSelect
                                                                id={
                                                                    `grade_${grade}_year` as ProfileYearField
                                                                }
                                                                name={
                                                                    `grade_${grade}_year` as ProfileYearField
                                                                }
                                                                value={
                                                                    yearValues[
                                                                        `grade_${grade}_year` as ProfileYearField
                                                                    ]
                                                                }
                                                                required
                                                            />
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Junior high school: 1st–4th Year */}
                                    {highestEducationLevel &&
                                        (highestEducationLevel ===
                                            'junior_high_school' ||
                                            highestEducationLevel ===
                                                'senior_high_school' ||
                                            highestEducationLevel ===
                                                'college' ||
                                            highestEducationLevel ===
                                                'masters' ||
                                            highestEducationLevel ===
                                                'doctor') && (
                                            <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">
                                                            Junior high school
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Provide the name of
                                                            school and year
                                                            graduated for each
                                                            year level (1st–4th
                                                            Year).
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col gap-3 sm:items-end">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                id="same_jhs_school"
                                                                checked={
                                                                    useSingleJhsSchool
                                                                }
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) => {
                                                                    const enabled =
                                                                        checked ===
                                                                        true;
                                                                    setUseSingleJhsSchool(
                                                                        enabled,
                                                                    );
                                                                    if (
                                                                        enabled &&
                                                                        !singleJhsSchoolName
                                                                    ) {
                                                                        const firstSchool =
                                                                            (initial[
                                                                                'jhs_1_school' as keyof typeof initial
                                                                            ] as
                                                                                | string
                                                                                | undefined) ??
                                                                            '';
                                                                        setSingleJhsSchoolName(
                                                                            firstSchool,
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <Label
                                                                htmlFor="same_jhs_school"
                                                                className="text-xs text-muted-foreground"
                                                            >
                                                                Same school for
                                                                all JHS years
                                                                (1st-4th) -
                                                                enter school
                                                                name once
                                                            </Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {useSingleJhsSchool && (
                                                    <div className="space-y-2">
                                                        <Label
                                                            htmlFor="jhs_school_all"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            School name (1st–4th
                                                            Year)
                                                        </Label>
                                                        <Input
                                                            id="jhs_school_all"
                                                            placeholder="Name of School"
                                                            value={
                                                                singleJhsSchoolName
                                                            }
                                                            onChange={(e) =>
                                                                setSingleJhsSchoolName(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    {[
                                                        {
                                                            num: 1,
                                                            label: '1ST YEAR',
                                                        },
                                                        {
                                                            num: 2,
                                                            label: '2ND YEAR',
                                                        },
                                                        {
                                                            num: 3,
                                                            label: '3RD YEAR',
                                                        },
                                                        {
                                                            num: 4,
                                                            label: '4TH YEAR',
                                                        },
                                                    ].map(({ num, label }) => (
                                                        <div
                                                            key={num}
                                                            className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto,1fr,1fr]"
                                                        >
                                                            <Label
                                                                htmlFor={`jhs_${num}_school`}
                                                                className="w-auto text-sm font-medium sm:w-24"
                                                            >
                                                                {label}:
                                                            </Label>

                                                            {useSingleJhsSchool ? (
                                                                <>
                                                                    <input
                                                                        type="hidden"
                                                                        id={`jhs_${num}_school`}
                                                                        name={`jhs_${num}_school`}
                                                                        value={
                                                                            singleJhsSchoolName
                                                                        }
                                                                    />
                                                                    <div className="text-xs text-muted-foreground italic">
                                                                        {singleJhsSchoolName ||
                                                                            'Same as above'}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <Input
                                                                    id={`jhs_${num}_school`}
                                                                    name={`jhs_${num}_school`}
                                                                    placeholder="Name of School"
                                                                    defaultValue={String(
                                                                        initial[
                                                                            `jhs_${num}_school` as keyof typeof initial
                                                                        ] ?? '',
                                                                    )}
                                                                    required={
                                                                        highestEducationLevel ===
                                                                            'junior_high_school' ||
                                                                        highestEducationLevel ===
                                                                            'senior_high_school' ||
                                                                        highestEducationLevel ===
                                                                            'college' ||
                                                                        highestEducationLevel ===
                                                                            'masters' ||
                                                                        highestEducationLevel ===
                                                                            'doctor'
                                                                    }
                                                                />
                                                            )}

                                                            <YearSelect
                                                                id={
                                                                    `jhs_${num}_year` as ProfileYearField
                                                                }
                                                                name={
                                                                    `jhs_${num}_year` as ProfileYearField
                                                                }
                                                                value={
                                                                    yearValues[
                                                                        `jhs_${num}_year` as ProfileYearField
                                                                    ]
                                                                }
                                                                required={
                                                                    highestEducationLevel ===
                                                                        'junior_high_school' ||
                                                                    highestEducationLevel ===
                                                                        'senior_high_school' ||
                                                                    highestEducationLevel ===
                                                                        'college' ||
                                                                    highestEducationLevel ===
                                                                        'masters' ||
                                                                    highestEducationLevel ===
                                                                        'doctor'
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    {/* Senior high school: Grade 11–12 */}
                                    {highestEducationLevel &&
                                        (highestEducationLevel ===
                                            'senior_high_school' ||
                                            highestEducationLevel ===
                                                'college' ||
                                            highestEducationLevel ===
                                                'masters' ||
                                            highestEducationLevel ===
                                                'doctor') && (
                                            <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                                {/* Checkbox to indicate if student did NOT attend senior high */}
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="did_not_attend_senior_high"
                                                        checked={
                                                            didNotAttendSeniorHigh
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) => {
                                                            const enabled =
                                                                checked ===
                                                                true;
                                                            setDidNotAttendSeniorHigh(
                                                                enabled,
                                                            );
                                                            if (enabled) {
                                                                // Clear SHS fields when checked (didn't attend)
                                                                setUseSingleShsSchool(
                                                                    false,
                                                                );
                                                                setSingleShsSchoolName(
                                                                    '',
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="did_not_attend_senior_high"
                                                        className={`cursor-pointer font-normal ${didNotAttendSeniorHigh ? 'text-base font-semibold' : 'text-sm'}`}
                                                    >
                                                        I didn't attend senior
                                                        high school
                                                    </Label>
                                                </div>

                                                {!didNotAttendSeniorHigh && (
                                                    <>
                                                        <div className="flex flex-col gap-4 border-t pt-2 lg:flex-row lg:items-end lg:justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    Senior high
                                                                    school
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Provide the
                                                                    name of
                                                                    school and
                                                                    year
                                                                    graduated
                                                                    for each
                                                                    grade level
                                                                    (Grade
                                                                    11–12).
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col gap-3 sm:items-end">
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        id="same_shs_school"
                                                                        checked={
                                                                            useSingleShsSchool
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) => {
                                                                            const enabled =
                                                                                checked ===
                                                                                true;
                                                                            setUseSingleShsSchool(
                                                                                enabled,
                                                                            );
                                                                            if (
                                                                                enabled &&
                                                                                !singleShsSchoolName
                                                                            ) {
                                                                                const firstSchool =
                                                                                    (initial[
                                                                                        'shs_11_school' as keyof typeof initial
                                                                                    ] as
                                                                                        | string
                                                                                        | undefined) ??
                                                                                    '';
                                                                                setSingleShsSchoolName(
                                                                                    firstSchool,
                                                                                );
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Label
                                                                        htmlFor="same_shs_school"
                                                                        className="text-xs text-muted-foreground"
                                                                    >
                                                                        Same
                                                                        school
                                                                        for
                                                                        Grades
                                                                        11-12 -
                                                                        enter
                                                                        school
                                                                        name
                                                                        once
                                                                    </Label>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {useSingleShsSchool && (
                                                            <div className="space-y-2">
                                                                <Label
                                                                    htmlFor="shs_school_all"
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    School name
                                                                    (Grades
                                                                    11–12)
                                                                </Label>
                                                                <Input
                                                                    id="shs_school_all"
                                                                    placeholder="Name of School"
                                                                    value={
                                                                        singleShsSchoolName
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setSingleShsSchoolName(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="space-y-3">
                                                            {[11, 12].map(
                                                                (grade) => (
                                                                    <div
                                                                        key={
                                                                            grade
                                                                        }
                                                                        className="grid grid-cols-[auto,1fr,1fr] items-center gap-3"
                                                                    >
                                                                        <Label
                                                                            htmlFor={`shs_${grade}_school`}
                                                                            className="w-24 text-sm font-medium"
                                                                        >
                                                                            GRADE{' '}
                                                                            {
                                                                                grade
                                                                            }
                                                                            :
                                                                        </Label>

                                                                        {useSingleShsSchool ? (
                                                                            <>
                                                                                <input
                                                                                    type="hidden"
                                                                                    id={`shs_${grade}_school`}
                                                                                    name={`shs_${grade}_school`}
                                                                                    value={
                                                                                        singleShsSchoolName
                                                                                    }
                                                                                />
                                                                                <div className="text-xs text-muted-foreground italic">
                                                                                    {singleShsSchoolName ||
                                                                                        'Same as above'}
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <Input
                                                                                id={`shs_${grade}_school`}
                                                                                name={`shs_${grade}_school`}
                                                                                placeholder="Name of School"
                                                                                defaultValue={String(
                                                                                    initial[
                                                                                        `shs_${grade}_school` as keyof typeof initial
                                                                                    ] ??
                                                                                        '',
                                                                                )}
                                                                                required
                                                                            />
                                                                        )}

                                                                        <YearSelect
                                                                            id={
                                                                                `shs_${grade}_year` as ProfileYearField
                                                                            }
                                                                            name={
                                                                                `shs_${grade}_year` as ProfileYearField
                                                                            }
                                                                            value={
                                                                                yearValues[
                                                                                    `shs_${grade}_year` as ProfileYearField
                                                                                ]
                                                                            }
                                                                            required
                                                                        />
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </>
                                                )}

                                                {/* Hidden inputs to clear SHS fields when didn't attend */}
                                                {didNotAttendSeniorHigh && (
                                                    <>
                                                        <input
                                                            type="hidden"
                                                            name="shs_11_school"
                                                            value=""
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="shs_11_year"
                                                            value=""
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="shs_12_school"
                                                            value=""
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name="shs_12_year"
                                                            value=""
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        )}

                                    {/* College */}
                                    {highestEducationLevel &&
                                        (highestEducationLevel === 'college' ||
                                            highestEducationLevel ===
                                                'masters' ||
                                            highestEducationLevel ===
                                                'doctor') && (
                                            <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        College
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Provide your college
                                                        degree and year
                                                        graduated. If you
                                                        graduated in SPUP, check
                                                        the box below.
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="is_transferee"
                                                        checked={isTransferee}
                                                        onCheckedChange={(
                                                            checked,
                                                        ) => {
                                                            setIsTransferee(
                                                                checked ===
                                                                    true,
                                                            );
                                                            if (
                                                                checked &&
                                                                collegeSchoolNameRef.current
                                                            ) {
                                                                // Clear college/university name when checked (graduated from St. Paul)
                                                                setCollegeSchoolNameInput(
                                                                    '',
                                                                );
                                                                collegeSchoolNameRef.current.value =
                                                                    '';
                                                            }
                                                        }}
                                                    />
                                                    <input
                                                        type="hidden"
                                                        name="is_transferee"
                                                        value={
                                                            isTransferee
                                                                ? '1'
                                                                : '0'
                                                        }
                                                    />
                                                    <Label
                                                        htmlFor="is_transferee"
                                                        className="cursor-pointer text-sm font-normal"
                                                    >
                                                        I graduated in St. Paul
                                                        University Philippines
                                                    </Label>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="college_degree">
                                                            Degree / course
                                                        </Label>
                                                        <Input
                                                            id="college_degree"
                                                            name="college_degree"
                                                            placeholder="Degree / course"
                                                            value={
                                                                collegeDegreeInput
                                                            }
                                                            maxLength={
                                                                COLLEGE_EXPORT_FIELD_LIMIT
                                                            }
                                                            onChange={(e) =>
                                                                setCollegeDegreeInput(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.college_degree
                                                            }
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                collegeDegreeInput.length
                                                            }
                                                            /
                                                            {
                                                                COLLEGE_EXPORT_FIELD_LIMIT
                                                            }{' '}
                                                            characters
                                                        </p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="college_year_graduated">
                                                            Year graduated
                                                        </Label>
                                                        <YearSelect
                                                            id="college_year_graduated"
                                                            name="college_year_graduated"
                                                            value={
                                                                yearValues.college_year_graduated
                                                            }
                                                            required
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.college_year_graduated
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                {!isTransferee && (
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="college_school_name">
                                                            College / university
                                                        </Label>
                                                        <Input
                                                            ref={
                                                                collegeSchoolNameRef
                                                            }
                                                            id="college_school_name"
                                                            name="college_school_name"
                                                            placeholder="College / university name"
                                                            value={
                                                                collegeSchoolNameInput
                                                            }
                                                            maxLength={
                                                                COLLEGE_EXPORT_FIELD_LIMIT
                                                            }
                                                            onChange={(e) =>
                                                                setCollegeSchoolNameInput(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            required={
                                                                !isTransferee
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.college_school_name
                                                            }
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            {
                                                                collegeSchoolNameInput.length
                                                            }
                                                            /
                                                            {
                                                                COLLEGE_EXPORT_FIELD_LIMIT
                                                            }{' '}
                                                            characters
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                    {/* Masters */}
                                    {highestEducationLevel === 'masters' && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Graduate school
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Provide the name of school
                                                    and year graduated for your
                                                    Master's degree.
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-3">
                                                <Label
                                                    htmlFor="grad_masteral_school"
                                                    className="w-28 text-sm font-medium"
                                                >
                                                    MASTER&apos;S:
                                                </Label>
                                                <Input
                                                    id="grad_masteral_school"
                                                    name="grad_masteral_school"
                                                    placeholder="Name of School"
                                                    defaultValue={
                                                        initial.grad_masteral_school ??
                                                        ''
                                                    }
                                                    required
                                                />
                                                <YearSelect
                                                    id="grad_masteral_year"
                                                    name="grad_masteral_year"
                                                    value={
                                                        yearValues.grad_masteral_year
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Graduate school (Doctoral) */}
                                    {highestEducationLevel === 'doctor' && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Graduate school
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Provide the name of school
                                                    and year graduated for your
                                                    Doctoral degree.
                                                </p>
                                            </div>
                                            <div className="space-y-3">
                                                {/* Masters section for Doctor level */}
                                                <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-3">
                                                    <Label
                                                        htmlFor="grad_masteral_school"
                                                        className="w-28 text-sm font-medium"
                                                    >
                                                        MASTER&apos;S:
                                                    </Label>
                                                    <Input
                                                        id="grad_masteral_school"
                                                        name="grad_masteral_school"
                                                        placeholder="Name of School"
                                                        defaultValue={
                                                            initial.grad_masteral_school ??
                                                            ''
                                                        }
                                                        required
                                                    />
                                                    <YearSelect
                                                        id="grad_masteral_year"
                                                        name="grad_masteral_year"
                                                        value={
                                                            yearValues.grad_masteral_year
                                                        }
                                                        required
                                                    />
                                                </div>
                                                {/* Doctoral section */}
                                                <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-3">
                                                    <Label
                                                        htmlFor="grad_doctoral_school"
                                                        className="w-28 text-sm font-medium"
                                                    >
                                                        DOCTORAL:
                                                    </Label>
                                                    <Input
                                                        id="grad_doctoral_school"
                                                        name="grad_doctoral_school"
                                                        placeholder="Name of School"
                                                        defaultValue={
                                                            initial.grad_doctoral_school ??
                                                            ''
                                                        }
                                                        required
                                                    />
                                                    <YearSelect
                                                        id="grad_doctoral_year"
                                                        name="grad_doctoral_year"
                                                        value={
                                                            yearValues.grad_doctoral_year
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="save-profile-button"
                                    >
                                        {processing
                                            ? 'Saving…'
                                            : 'Save profile'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </AppLayout>
    );
}
