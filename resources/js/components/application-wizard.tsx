import InputError from '@/components/input-error';
import ValidationSummary from '@/components/validation-summary';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MONTHS, NATIONALITIES, RELIGIONS } from '@/lib/profile-form-options';
import { type SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import applicationRoutes from '@/routes/applications/index';
import applyRoutes from '@/routes/apply';
import { Camera, CheckCircle2, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import { useToast } from '@/contexts/toast-context';

export interface Department {
    id: number;
    name: string;
    courses: Array<{
        id: number;
        name: string;
        majors: Array<{
            id: number;
            name: string;
        }>;
    }>;
}

export interface ApplicationWindow {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
}

export interface StudentProfile {
    id: number;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    suffix?: string | null;
    date_of_birth: string;
    place_of_birth: string;
    sex: string;
    civil_status: string;
    religion: string | null;
    nationality: string;
    permanent_address: string;
    contact_number: string;
    photo_path?: string | null;
    highest_education_level: string | null;
    // Educational background fields
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
    jhs_1_school?: string | null;
    jhs_1_year?: number | null;
    jhs_2_school?: string | null;
    jhs_2_year?: number | null;
    jhs_3_school?: string | null;
    jhs_3_year?: number | null;
    jhs_4_school?: string | null;
    jhs_4_year?: number | null;
    shs_11_school?: string | null;
    shs_11_year?: number | null;
    shs_12_school?: string | null;
    shs_12_year?: number | null;
    college_degree?: string | null;
    college_school_name?: string | null;
    college_year_graduated?: number | null;
    college_transferee_note?: string | null;
    is_transferee?: boolean | null;
    grad_masteral_school?: string | null;
    grad_masteral_year?: number | null;
    grad_doctoral_school?: string | null;
    grad_doctoral_year?: number | null;
}

interface SubjectEnrollment {
    id?: number;
    subject_name: string;
    units: number;
    order?: number;
}

export interface ExistingApplication {
    id: number;
    application_number: string;
    window: ApplicationWindow;
    user?: {
        student_id?: string | null;
    };
    department_id: number;
    course_id: number;
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
    subject_code: string | null;
    subject_title: string | null;
    units: number | null;
    thesis_dissertation_title: string | null;
    thesis_dissertation_adviser: string | null;
    subject_enrollments: SubjectEnrollment[];
}

type WizardMode = 'create' | 'edit' | 'guest';
type PortalMode = 'student' | 'guest';

interface ApplicationWizardData {
    window_id: number;
    email: string;
    student_id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    date_of_birth: string;
    place_of_birth: string;
    sex: string;
    civil_status: string;
    religion: string;
    nationality: string;
    permanent_address: string;
    contact_number: string;
    photo: File | null;
    highest_education_level: string;
    grade_1_school: string;
    grade_1_year: number | '';
    grade_2_school: string;
    grade_2_year: number | '';
    grade_3_school: string;
    grade_3_year: number | '';
    grade_4_school: string;
    grade_4_year: number | '';
    grade_5_school: string;
    grade_5_year: number | '';
    grade_6_school: string;
    grade_6_year: number | '';
    jhs_1_school: string;
    jhs_1_year: number | '';
    jhs_2_school: string;
    jhs_2_year: number | '';
    jhs_3_school: string;
    jhs_3_year: number | '';
    jhs_4_school: string;
    jhs_4_year: number | '';
    shs_11_school: string;
    shs_11_year: number | '';
    shs_12_school: string;
    shs_12_year: number | '';
    college_degree: string;
    college_school_name: string;
    college_year_graduated: number | '';
    is_transferee: boolean;
    grad_masteral_school: string;
    grad_masteral_year: number | '';
    grad_doctoral_school: string;
    grad_doctoral_year: number | '';
    department_id: string;
    course_id: string;
    major: string;
    degree_title: string;
    presence: 'attending' | 'not attending';
    graduate_subjects: Array<{
        subject_code: string;
        subject_title: string;
        units: number | null;
    }>;
    thesis_dissertation_title: string;
    thesis_dissertation_adviser: string;
    subject_enrollments: Array<{ subject_name: string; units: number }>;
}

export interface ApplicationWizardProps {
    window: ApplicationWindow;
    profile: StudentProfile | null;
    departments: Department[];
    mode: WizardMode;
    application?: ExistingApplication;
    portalMode?: PortalMode;
    isApproved?: boolean;
}

type Step = 'personal' | 'educational' | 'application';

export function ApplicationWizard({
    window,
    profile,
    departments,
    mode,
    application,
    portalMode = 'student',
    isApproved = false,
}: ApplicationWizardProps) {
    const page = usePage<SharedData>();
    const user = page.props.auth?.user;
    const isGuestMode = mode === 'guest';
    const isEditMode = mode === 'edit';
    const activeApplication = application;
    const [currentStep, setCurrentStep] = useState<Step>('personal');
    const [confirmedSteps, setConfirmedSteps] = useState<Set<Step>>(new Set());
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>(
        activeApplication?.department_id ?? '',
    );
    const [selectedCourseId, setSelectedCourseId] = useState<number | ''>(
        activeApplication?.course_id ?? '',
    );
    const [selectedMajorId, setSelectedMajorId] = useState<number | ''>('');
    const [agreedToRequirements, setAgreedToRequirements] = useState(false);
    const [studentIdConfirmation, setStudentIdConfirmation] = useState('');
    const [emailConfirmation, setEmailConfirmation] = useState('');
    const [noThesisRequired, setNoThesisRequired] = useState(false);
    // Check if student did NOT attend senior high school
    // Default to false (unchecked) - show inputs by default
    const [didNotAttendSeniorHigh, setDidNotAttendSeniorHigh] = useState<boolean>(false);
    const [useSingleGradeSchool, setUseSingleGradeSchool] = useState(false);
    const [singleGradeSchoolName, setSingleGradeSchoolName] = useState('');
    const [useSingleJhsSchool, setUseSingleJhsSchool] = useState(false);
    const [singleJhsSchoolName, setSingleJhsSchoolName] = useState('');
    const [useSingleShsSchool, setUseSingleShsSchool] = useState(false);
    const [singleShsSchoolName, setSingleShsSchoolName] = useState('');
    const [religionInput, setReligionInput] = useState(profile?.religion || '');
    const [showReligionSuggestions, setShowReligionSuggestions] = useState(false);
    const [nationalityInput, setNationalityInput] = useState(profile?.nationality || '');
    const [showNationalitySuggestions, setShowNationalitySuggestions] = useState(false);
    const existingPhotoPreview = profile?.photo_path ? `/storage/${profile.photo_path}` : null;
    const [photoPreview, setPhotoPreview] = useState<string | null>(existingPhotoPreview);

    // Date of birth state (month/day/year dropdowns)
    const parsedDob = profile?.date_of_birth
        ? (() => {
            try {
                const date = new Date(profile.date_of_birth);
                return isNaN(date.getTime()) ? null : date;
            } catch {
                return null;
            }
        })()
        : null;
    const currentYear = new Date().getFullYear();
    const [dobMonth, setDobMonth] = useState<number | ''>(
        parsedDob ? parsedDob.getMonth() + 1 : '',
    );
    const [dobDay, setDobDay] = useState<number | ''>(
        parsedDob ? parsedDob.getDate() : '',
    );
    const [dobYear, setDobYear] = useState<number | ''>(
        parsedDob ? parsedDob.getFullYear() : '',
    );

    const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId);
    const selectedCourse = selectedDepartment?.courses.find((c) => c.id === selectedCourseId);
    const isGraduateProgram =
        selectedDepartment?.name.toLowerCase().includes('graduate') ?? false;

    const { addToast } = useToast();
    const formRef = useRef<HTMLFormElement | null>(null);
    const photoInputRef = useRef<HTMLInputElement | null>(null);

    const existingGraduateSubjects = activeApplication && isGraduateProgram && activeApplication.subject_enrollments.length > 0
        ? activeApplication.subject_enrollments.map((subjectEnrollment) => {
            const parts = (subjectEnrollment.subject_name || '').split(' - ');

            return {
                subject_code: parts[0] || '',
                subject_title: parts[1] || subjectEnrollment.subject_name,
                units: subjectEnrollment.units,
            };
        })
        : [];

    const existingSubjectEnrollments = activeApplication && !isGraduateProgram
        ? activeApplication.subject_enrollments.map((subjectEnrollment) => ({
            subject_name: subjectEnrollment.subject_name,
            units: subjectEnrollment.units,
        }))
        : [];

    // Initialize form data from profile
    const { data, setData, post, put, processing, errors } = useForm<ApplicationWizardData>({
        window_id: window.id,
        email: '',
        student_id: user?.student_id
            ? String(user.student_id)
            : activeApplication?.user?.student_id
                ? String(activeApplication.user.student_id)
                : '',
        // Personal Information (editable)
        first_name: profile?.first_name || '',
        middle_name: profile?.middle_name || '',
        last_name: profile?.last_name || '',
        suffix: profile?.suffix || '',
        date_of_birth: profile?.date_of_birth || '',
        place_of_birth: profile?.place_of_birth || '',
        sex: profile?.sex || '',
        civil_status: profile?.civil_status || '',
        religion: profile?.religion || '',
        nationality: profile?.nationality || '',
        permanent_address: profile?.permanent_address || '',
        contact_number: profile?.contact_number || '',
        photo: null,
        // Educational Background (editable)
        highest_education_level: profile?.highest_education_level || '',
        // Grade School
        grade_1_school: profile?.grade_1_school || '',
        grade_1_year: profile?.grade_1_year || '',
        grade_2_school: profile?.grade_2_school || '',
        grade_2_year: profile?.grade_2_year || '',
        grade_3_school: profile?.grade_3_school || '',
        grade_3_year: profile?.grade_3_year || '',
        grade_4_school: profile?.grade_4_school || '',
        grade_4_year: profile?.grade_4_year || '',
        grade_5_school: profile?.grade_5_school || '',
        grade_5_year: profile?.grade_5_year || '',
        grade_6_school: profile?.grade_6_school || '',
        grade_6_year: profile?.grade_6_year || '',
        // Junior High School
        jhs_1_school: profile?.jhs_1_school || '',
        jhs_1_year: profile?.jhs_1_year || '',
        jhs_2_school: profile?.jhs_2_school || '',
        jhs_2_year: profile?.jhs_2_year || '',
        jhs_3_school: profile?.jhs_3_school || '',
        jhs_3_year: profile?.jhs_3_year || '',
        jhs_4_school: profile?.jhs_4_school || '',
        jhs_4_year: profile?.jhs_4_year || '',
        // Senior High School
        shs_11_school: profile?.shs_11_school || '',
        shs_11_year: profile?.shs_11_year || '',
        shs_12_school: profile?.shs_12_school || '',
        shs_12_year: profile?.shs_12_year || '',
        // College
        college_degree: profile?.college_degree || '',
        college_school_name: profile?.college_school_name || '',
        college_year_graduated: profile?.college_year_graduated || '',
        is_transferee: profile?.is_transferee || false,
        // Graduate School
        grad_masteral_school: profile?.grad_masteral_school || '',
        grad_masteral_year: profile?.grad_masteral_year || '',
        grad_doctoral_school: profile?.grad_doctoral_school || '',
        grad_doctoral_year: profile?.grad_doctoral_year || '',
        // Application Details
        department_id: activeApplication ? String(activeApplication.department_id) : '',
        course_id: activeApplication ? String(activeApplication.course_id) : '',
        major: activeApplication?.major || '',
        degree_title: activeApplication?.degree_title || '',
        presence: (activeApplication?.presence as 'attending' | 'not attending') || 'attending',
        // Graduate program fields (start with 1, can add more)
        graduate_subjects: existingGraduateSubjects.length > 0
            ? existingGraduateSubjects
            : [{ subject_code: '', subject_title: '', units: 0 }],
        thesis_dissertation_title: activeApplication?.thesis_dissertation_title || '',
        thesis_dissertation_adviser: activeApplication?.thesis_dissertation_adviser || '',
        // Undergraduate subject enrollments
        subject_enrollments: existingSubjectEnrollments,
    });

    // Initialize date_of_birth from dropdowns on mount
    useEffect(() => {
        if (dobYear && dobMonth && dobDay && !data.date_of_birth) {
            setData(
                'date_of_birth',
                `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Auto-fill degree_title when department, course, or major changes
    useEffect(() => {
        if (selectedDepartment && selectedCourse) {
            let degreeTitle = selectedCourse.name;
            if (selectedMajorId && selectedCourse.majors.length > 0) {
                const major = selectedCourse.majors.find((m) => m.id === selectedMajorId);
                if (major) {
                    degreeTitle = `${selectedCourse.name} - ${major.name}`;
                }
            }
            // Always auto-fill when selections change
            setData('degree_title', degreeTitle);
        }
    }, [selectedDepartment, selectedCourse, selectedMajorId]);

    useEffect(() => {
        if (! activeApplication?.major || ! selectedCourse || selectedMajorId !== '') {
            return;
        }

        const matchingMajor = selectedCourse.majors.find(
            (major) => major.name === activeApplication.major,
        );

        if (matchingMajor) {
            setSelectedMajorId(matchingMajor.id);
        }
    }, [activeApplication?.major, selectedCourse, selectedMajorId]);

    useEffect(() => {
        if (! profile) {
            return;
        }

        const noSeniorHighData = ! profile.shs_11_school && ! profile.shs_12_school
            && ! profile.shs_11_year && ! profile.shs_12_year;

        setDidNotAttendSeniorHigh(noSeniorHighData);
    }, [profile]);

    useEffect(() => {
        if (! activeApplication) {
            return;
        }

        setNoThesisRequired(
            ! activeApplication.thesis_dissertation_title
            && ! activeApplication.thesis_dissertation_adviser,
        );
    }, [activeApplication]);

    useEffect(() => {
        if (! formRef.current) {
            return;
        }

        formRef.current.classList.remove('was-validated');

        const elements = formRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            '[data-slot="input"], select, textarea',
        );

        elements.forEach((element) => {
            element.removeAttribute('aria-invalid');
            element.removeAttribute('title');
        });
    }, [currentStep]);

    const gradeSchoolFields = [
        'grade_1_school',
        'grade_2_school',
        'grade_3_school',
        'grade_4_school',
        'grade_5_school',
        'grade_6_school',
    ] as const;
    const jhsSchoolFields = [
        'jhs_1_school',
        'jhs_2_school',
        'jhs_3_school',
        'jhs_4_school',
    ] as const;
    const shsSchoolFields = ['shs_11_school', 'shs_12_school'] as const;

    const syncSchoolGroup = (
        fields: ReadonlyArray<typeof gradeSchoolFields[number] | typeof jhsSchoolFields[number] | typeof shsSchoolFields[number]>,
        schoolName: string,
    ) => {
        setData((currentData) => {
            const updatedData = { ...currentData };

            fields.forEach((field) => {
                updatedData[field] = schoolName;
            });

            return updatedData;
        });
    };

    const resolveErrorStep = (field: string): Step => {
        if (
            field === 'highest_education_level'
            || field === 'is_transferee'
            || field.startsWith('grade_')
            || field.startsWith('jhs_')
            || field.startsWith('shs_')
            || field.startsWith('college_')
            || field.startsWith('grad_')
        ) {
            return 'educational';
        }

        if (
            field === 'window_id'
            || field === 'department_id'
            || field === 'course_id'
            || field === 'major'
            || field === 'degree_title'
            || field === 'presence'
            || field.startsWith('graduate_subjects')
            || field.startsWith('subject_enrollments')
            || field.startsWith('thesis_')
        ) {
            return 'application';
        }

        return 'personal';
    };

    const handlePhotoChange = (file: File | null, input: HTMLInputElement) => {
        if (! file) {
            return;
        }

        if (! file.type.startsWith('image/')) {
            addToast({
                variant: 'error',
                title: 'Invalid file type',
                description: 'Please select an image file (JPG or PNG).',
            });
            input.value = '';

            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            addToast({
                variant: 'error',
                title: 'Image too large',
                description: 'Maximum allowed image size is 2MB.',
            });
            input.value = '';

            return;
        }

        setData('photo', file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setData('photo', null);
        setPhotoPreview(existingPhotoPreview);

        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        form.classList.add('was-validated');

        if (! form.reportValidity()) {
            return;
        }

        const onError = (formErrors: Record<string, string | string[] | undefined>) => {
            const [firstField, firstMessage] = Object.entries(formErrors).find(([, message]) => {
                if (Array.isArray(message)) {
                    return message.length > 0;
                }

                return Boolean(message);
            }) ?? [];

            if (firstField) {
                setCurrentStep(resolveErrorStep(firstField));
            }

            addToast({
                variant: 'error',
                title: isEditMode ? 'Update Failed' : 'Submission Failed',
                description: Array.isArray(firstMessage)
                    ? firstMessage[0]
                    : firstMessage || 'Please check the form for errors and try again.',
                duration: 7000,
            });
        };

        if (isEditMode && activeApplication) {
            const updateRoute = portalMode === 'guest'
                ? applyRoutes.portal.update(activeApplication.application_number).url
                : applicationRoutes.update(activeApplication.application_number).url;

            put(updateRoute, { forceFormData: true, onError });

            return;
        }

        const storeRoute = isGuestMode
            ? applyRoutes.store().url
            : applicationRoutes.store().url;

        post(storeRoute, { forceFormData: true, onError });
    };

    const confirmStep = () => {
        if (formRef.current) {
            const form = formRef.current;
            // Only highlight invalid required fields after the user clicks Confirm
            form.classList.add('was-validated');

            // Mark invalid fields and log them for debugging
            const elements = Array.from(
                form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[data-slot="input"], select, textarea'),
            );

            const invalidFields: string[] = [];

            elements.forEach((el) => {
                if (el.required && !el.checkValidity()) {
                    el.setAttribute('aria-invalid', 'true');
                    el.setAttribute('title', 'Please fill out this field.');
                    const nameOrId = el.name || el.id || '(no name)';
                    invalidFields.push(nameOrId);
                } else {
                    el.removeAttribute('aria-invalid');
                    el.removeAttribute('title');
                }
            });

            if (invalidFields.length > 0) {
                console.log(`Application ${mode} - invalid fields in step`, currentStep, ':', invalidFields);
            } else {
                console.log(`Application ${mode} - current step passed client-side required validation`);
            }

            // Validate visible required fields in the current step before continuing
            const isValid = form.reportValidity();
            if (!isValid) {
                addToast({
                    variant: 'error',
                    title: 'Missing required information',
                    description: 'Please fill in all required fields in this step before continuing.',
                    duration: 6000,
                });

                return;
            }
        }

        const newConfirmed = new Set(confirmedSteps);
        newConfirmed.add(currentStep);
        setConfirmedSteps(newConfirmed);

        // Move to next step
        if (currentStep === 'personal') {
            setCurrentStep('educational');
        } else if (currentStep === 'educational') {
            setCurrentStep('application');
        }
    };

    const goToStep = (step: Step) => {
        if (confirmedSteps.has(step) || step === 'personal') {
            setCurrentStep(step);
        }
    };

    const addGraduateSubject = () => {
        setData('graduate_subjects', [
            ...data.graduate_subjects,
            { subject_code: '', subject_title: '', units: 0 },
        ]);
    };

    const removeGraduateSubject = (index: number) => {
        setData(
            'graduate_subjects',
            data.graduate_subjects.filter((_, i) => i !== index),
        );
    };

    const updateGraduateSubject = (
        index: number,
        field: 'subject_code' | 'subject_title' | 'units',
        value: string | number | null,
    ) => {
        const updated = [...data.graduate_subjects];
        updated[index] = { ...updated[index], [field]: value };
        setData('graduate_subjects', updated);
    };

    const addSubjectEnrollment = () => {
        if (data.subject_enrollments.length < 6) {
            setData('subject_enrollments', [
                ...data.subject_enrollments,
                { subject_name: '', units: 0 },
            ]);
        }
    };

    const removeSubjectEnrollment = (index: number) => {
        setData(
            'subject_enrollments',
            data.subject_enrollments.filter((_, i) => i !== index),
        );
    };

    const updateSubjectEnrollment = (
        index: number,
        field: 'subject_name' | 'units',
        value: string | number,
    ) => {
        const updated = [...data.subject_enrollments];
        updated[index] = { ...updated[index], [field]: value };
        setData('subject_enrollments', updated);
    };

    if (!profile && !isGuestMode) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Profile Required</CardTitle>
                    <CardDescription>
                        Please complete your profile before submitting an application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/profile/edit">Complete Profile</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const steps: Array<{ id: Step; label: string; description: string }> = [
        {
            id: 'personal',
            label: isGuestMode ? 'Contact & Personal Info' : 'Personal Information',
            description: isGuestMode
                ? 'Tell us how to reach you and review your personal details'
                : 'Review and edit your personal details',
        },
        { id: 'educational', label: 'Educational Background', description: 'Review and edit your educational history' },
        { id: 'application', label: 'Application Details', description: 'Complete your graduation application' },
    ];

    const pageTitle = isGuestMode ? 'Apply for Graduation' : 'Graduation Application';
    const introText = isGuestMode
        ? 'Complete the full graduation wizard now. We will email a verification link after you submit.'
        : 'Complete your graduation application details.';
    const expectedStudentId = String(
        data.student_id ||
        user?.student_id ||
        activeApplication?.user?.student_id ||
        '',
    ).trim();
    const confirmationMatches = isGuestMode
        ? data.email.trim().toLowerCase() !== '' && emailConfirmation.trim().toLowerCase() === data.email.trim().toLowerCase()
        : expectedStudentId !== '' && studentIdConfirmation.trim() === expectedStudentId;
    const submitLabel = isEditMode ? 'Update Application' : isGuestMode ? 'Submit & Verify by Email' : 'Submit Application';
    const cancelHref = isEditMode && activeApplication
        ? (
            portalMode === 'guest'
                ? applyRoutes.portal.show(activeApplication.application_number).url
                : applicationRoutes.show(activeApplication.application_number).url
        )
        : null;

    return (
            <div className="flex h-full flex-1 flex-col gap-4 md:gap-6 overflow-x-auto rounded-xl">
                <div className="mx-auto w-full max-w-4xl space-y-4 md:space-y-8">
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">
                            {pageTitle}
                        </h1>
                        <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-muted-foreground">
                            Application Window: {window.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{introText}</p>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <button
                                    type="button"
                                    onClick={() => goToStep(step.id)}
                                    className={`flex flex-col items-center gap-2 ${currentStep === step.id
                                            ? 'text-primary'
                                            : confirmedSteps.has(step.id)
                                                ? 'text-muted-foreground'
                                                : 'text-muted-foreground opacity-50'
                                        } ${confirmedSteps.has(step.id) || step.id === 'personal' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                >
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${currentStep === step.id
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : confirmedSteps.has(step.id)
                                                    ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-muted-foreground bg-background'
                                            }`}
                                    >
                                        {confirmedSteps.has(step.id) ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium">{step.label}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {step.description}
                                        </p>
                                    </div>
                                </button>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`mx-2 h-0.5 flex-1 ${confirmedSteps.has(step.id)
                                                ? 'bg-green-500'
                                                : 'bg-muted-foreground'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
                        <ValidationSummary
                            errors={errors as Record<string, string | string[] | undefined>}
                            title="Please fix the following issues before submitting your application:"
                        />

                        {/* Step 1: Personal Information */}
                        {currentStep === 'personal' && (
                            <>

                                <Card>
                                <CardHeader>
                                    <CardTitle>Step 1: Personal Information</CardTitle>
                                    <CardDescription>
                                        {isGuestMode
                                            ? 'Enter your email, student ID, and personal details. You can finish the whole wizard before verifying your email.'
                                            : 'Review and edit your personal details. You can override any information from your profile if needed.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {isGuestMode && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    Contact & Identity
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    We will send your verification and guest portal links to this email address.
                                                </p>
                                            </div>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="email">Email Address *</Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        type="email"
                                                        value={data.email}
                                                        onChange={(e) => setData('email', e.target.value)}
                                                        autoComplete="email"
                                                        required
                                                    />
                                                    <InputError message={errors.email} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="student_id">Student ID *</Label>
                                                    <Input
                                                        id="student_id"
                                                        name="student_id"
                                                        value={data.student_id}
                                                        onChange={(e) => setData('student_id', e.target.value)}
                                                        autoComplete="off"
                                                        required
                                                    />
                                                    <InputError message={errors.student_id} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                2x2 ID Photo with Name Tag
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                Upload a JPG or PNG with a white background. Maximum file size: 2MB.
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="flex justify-center">
                                                {photoPreview ? (
                                                    <div className="relative">
                                                        <img
                                                            src={photoPreview}
                                                            alt="Profile photo preview"
                                                            className="h-32 w-32 rounded-lg border-2 border-border object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleRemovePhoto}
                                                            aria-label="Remove photo"
                                                            title="Remove photo"
                                                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
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
                                                    ref={photoInputRef}
                                                    className="cursor-pointer"
                                                    onChange={(e) =>
                                                        handlePhotoChange(
                                                            e.target.files?.[0] ?? null,
                                                            e.currentTarget,
                                                        )
                                                    }
                                                />
                                                <InputError message={errors.photo} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name Section */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Name
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="first_name">First Name *</Label>
                                                <Input
                                                    id="first_name"
                                                    name="first_name"
                                                    value={data.first_name}
                                                    onChange={(e) =>
                                                        setData('first_name', e.target.value)
                                                    }
                                                    required
                                                />
                                                <InputError message={errors.first_name} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="middle_name">
                                                    Middle Name
                                                </Label>
                                                <Input
                                                    id="middle_name"
                                                    name="middle_name"
                                                    value={data.middle_name || ''}
                                                    onChange={(e) =>
                                                        setData('middle_name', e.target.value)
                                                    }
                                                    placeholder="Enter full middle name"
                                                />
                                                <InputError message={errors.middle_name} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="last_name">Last Name *</Label>
                                                <Input
                                                    id="last_name"
                                                    name="last_name"
                                                    value={data.last_name}
                                                    onChange={(e) =>
                                                        setData('last_name', e.target.value)
                                                    }
                                                    required
                                                />
                                                <InputError message={errors.last_name} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="suffix">Suffix (Optional)</Label>
                                                <Input
                                                    id="suffix"
                                                    name="suffix"
                                                    value={data.suffix}
                                                    onChange={(e) =>
                                                        setData('suffix', e.target.value)
                                                    }
                                                    placeholder="Jr., Sr., III"
                                                />
                                                <InputError message={errors.suffix} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Birth Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Birth Information
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="date_of_birth">
                                                    Date of Birth *
                                                </Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <select
                                                        id="dob_month"
                                                        aria-label="Birth month"
                                                        value={dobMonth === '' ? '' : dobMonth}
                                                        onChange={(e) => {
                                                            const month = e.target.value
                                                                ? Number(e.target.value)
                                                                : '';
                                                            setDobMonth(month);
                                                            if (month && dobDay && dobYear) {
                                                                setData(
                                                                    'date_of_birth',
                                                                    `${dobYear}-${String(month).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
                                                                );
                                                            }
                                                        }}
                                                        className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                                        required
                                                    >
                                                        <option value="">Month</option>
                                                        {MONTHS.map((m, index) => (
                                                            <option key={m} value={index + 1}>
                                                                {m}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        id="dob_day"
                                                        aria-label="Birth day"
                                                        value={dobDay === '' ? '' : dobDay}
                                                        onChange={(e) => {
                                                            const day = e.target.value
                                                                ? Number(e.target.value)
                                                                : '';
                                                            setDobDay(day);
                                                            if (dobMonth && day && dobYear) {
                                                                setData(
                                                                    'date_of_birth',
                                                                    `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                                                                );
                                                            }
                                                        }}
                                                        className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                                        required
                                                    >
                                                        <option value="">Day</option>
                                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                                                            (day) => (
                                                                <option key={day} value={day}>
                                                                    {day}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <select
                                                        id="dob_year"
                                                        aria-label="Birth year"
                                                        value={dobYear === '' ? '' : dobYear}
                                                        onChange={(e) => {
                                                            const year = e.target.value
                                                                ? Number(e.target.value)
                                                                : '';
                                                            setDobYear(year);
                                                            if (dobMonth && dobDay && year) {
                                                                setData(
                                                                    'date_of_birth',
                                                                    `${year}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`,
                                                                );
                                                            }
                                                        }}
                                                        className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                                        required
                                                    >
                                                        <option value="">Year</option>
                                                        {Array.from(
                                                            { length: 100 },
                                                            (_, i) => currentYear - i,
                                                        ).map((year) => (
                                                            <option key={year} value={year}>
                                                                {year}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <input
                                                    type="hidden"
                                                    name="date_of_birth"
                                                    value={
                                                        dobYear && dobMonth && dobDay
                                                            ? `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`
                                                            : ''
                                                    }
                                                />
                                                <InputError message={errors.date_of_birth} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="place_of_birth">
                                                    Place of Birth *
                                                </Label>
                                                <Input
                                                    id="place_of_birth"
                                                    name="place_of_birth"
                                                    value={data.place_of_birth}
                                                    onChange={(e) =>
                                                        setData('place_of_birth', e.target.value)
                                                    }
                                                    required
                                                />
                                                <InputError message={errors.place_of_birth} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Details */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Personal Details
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="sex">Sex *</Label>
                                                <select
                                                    id="sex"
                                                    name="sex"
                                                    aria-label="Sex"
                                                    value={data.sex}
                                                    onChange={(e) => setData('sex', e.target.value)}
                                                    required
                                                    className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                                >
                                                    <option value="">Select sex</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Prefer not to say">
                                                        Prefer not to say
                                                    </option>
                                                </select>
                                                <InputError message={errors.sex} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="civil_status">
                                                    Civil Status *
                                                </Label>
                                                <select
                                                    id="civil_status"
                                                    name="civil_status"
                                                    aria-label="Civil status"
                                                    value={data.civil_status}
                                                    onChange={(e) =>
                                                        setData('civil_status', e.target.value)
                                                    }
                                                    required
                                                    className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                                >
                                                    <option value="">Select civil status</option>
                                                    <option value="Single">Single</option>
                                                    <option value="Married">Married</option>
                                                    <option value="Divorced">Divorced</option>
                                                    <option value="Separated">Separated</option>
                                                    <option value="Widowed">Widowed</option>
                                                </select>
                                                <InputError message={errors.civil_status} />
                                            </div>
                                            <div className="grid gap-2 relative">
                                                <Label htmlFor="religion">Religion</Label>
                                                <Input
                                                    id="religion"
                                                    name="religion"
                                                    value={religionInput}
                                                    onChange={(e) => {
                                                        setReligionInput(e.target.value);
                                                        setData('religion', e.target.value);
                                                        setShowReligionSuggestions(true);
                                                    }}
                                                    onFocus={() => {
                                                        if (religionInput.trim() !== '') {
                                                            setShowReligionSuggestions(true);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowReligionSuggestions(false);
                                                        }, 200);
                                                    }}
                                                    placeholder="Start typing to search religions"
                                                    autoComplete="off"
                                                />
                                                {showReligionSuggestions && religionInput.trim() !== '' && (
                                                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm text-popover-foreground shadow-md">
                                                        {RELIGIONS.filter((religion) =>
                                                            religion
                                                                .toLowerCase()
                                                                .includes(religionInput.toLowerCase().trim()),
                                                        )
                                                            .slice(0, 8)
                                                            .map((religion) => (
                                                                <button
                                                                    key={religion}
                                                                    type="button"
                                                                    className="flex w-full cursor-pointer items-center px-2 py-1 text-left hover:bg-muted"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setReligionInput(religion);
                                                                        setData('religion', religion);
                                                                        setShowReligionSuggestions(false);
                                                                    }}
                                                                >
                                                                    {religion}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                                <InputError message={errors.religion} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Information */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            Contact Information
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2 relative">
                                                <Label htmlFor="nationality">Nationality *</Label>
                                                <Input
                                                    id="nationality"
                                                    name="nationality"
                                                    value={nationalityInput}
                                                    onChange={(e) => {
                                                        setNationalityInput(e.target.value);
                                                        setData('nationality', e.target.value);
                                                        setShowNationalitySuggestions(true);
                                                    }}
                                                    onFocus={() => {
                                                        if (nationalityInput.trim() !== '') {
                                                            setShowNationalitySuggestions(true);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowNationalitySuggestions(false);
                                                        }, 200);
                                                    }}
                                                    placeholder="Start typing to search nationalities"
                                                    required
                                                    autoComplete="off"
                                                />
                                                {showNationalitySuggestions && nationalityInput.trim() !== '' && (
                                                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm text-popover-foreground shadow-md">
                                                        {NATIONALITIES.filter((nationality) =>
                                                            nationality
                                                                .toLowerCase()
                                                                .includes(nationalityInput.toLowerCase().trim()),
                                                        )
                                                            .slice(0, 8)
                                                            .map((nationality) => (
                                                                <button
                                                                    key={nationality}
                                                                    type="button"
                                                                    className="flex w-full cursor-pointer items-center px-2 py-1 text-left hover:bg-muted"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setNationalityInput(nationality);
                                                                        setData('nationality', nationality);
                                                                        setShowNationalitySuggestions(false);
                                                                    }}
                                                                >
                                                                    {nationality}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                                <InputError message={errors.nationality} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="contact_number">
                                                    Contact Number *
                                                </Label>
                                                <Input
                                                    id="contact_number"
                                                    name="contact_number"
                                                    value={data.contact_number}
                                                    onChange={(e) =>
                                                        setData('contact_number', e.target.value)
                                                    }
                                                    placeholder="Enter Contact Number"
                                                    required
                                                />
                                                <InputError message={errors.contact_number} />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="permanent_address">
                                                Permanent Address *
                                            </Label>
                                            <Textarea
                                                id="permanent_address"
                                                name="permanent_address"
                                                value={data.permanent_address}
                                                onChange={(e) =>
                                                    setData('permanent_address', e.target.value)
                                                }
                                                required
                                                rows={3}
                                            />
                                            <InputError message={errors.permanent_address} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            {cancelHref ? (
                                                <Button asChild type="button" variant="ghost">
                                                    <Link href={cancelHref}>Cancel</Link>
                                                </Button>
                                            ) : null}
                                        </div>
                                        <Button type="button" onClick={confirmStep}>
                                            Confirm & Continue
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                            </>
                        )}

                        {/* Step 2: Educational Background */}
                        {currentStep === 'educational' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Step 2: Educational Background</CardTitle>
                                    <CardDescription>
                                        Review and edit your educational history. You can override
                                        any information from your profile if needed.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Highest Education Level */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="highest_education_level">
                                            Highest Education Level Completed *
                                        </Label>
                                        <select
                                            id="highest_education_level"
                                            name="highest_education_level"
                                            aria-label="Highest education level completed"
                                            value={data.highest_education_level || ''}
                                            onChange={(e) =>
                                                setData('highest_education_level', e.target.value)
                                            }
                                            required
                                            className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                        >
                                            <option value="">Select highest education level</option>
                                            <option value="elementary">
                                                Elementary (Grade School)
                                            </option>
                                            <option value="junior_high_school">
                                                Junior High School
                                            </option>
                                            <option value="senior_high_school">
                                                Senior High School
                                            </option>
                                            <option value="college">College</option>
                                            <option value="masters">Masters</option>
                                            <option value="doctor">Doctor</option>
                                        </select>
                                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                            <strong>Note:</strong> This refers to your highest
                                            completed education level, <strong>not</strong> your
                                            current enrolled program. For example, if you are
                                            currently enrolled in a master&apos;s program that you
                                            are applying to graduate from, select
                                            {' '}<strong>College</strong> as your highest completed
                                            education level.
                                        </p>
                                        <InputError message={errors.highest_education_level} />
                                    </div>

                                    {/* Grade School */}
                                    {data.highest_education_level && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground">
                                                        Grade School
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Provide the name of school and year graduated for each grade level (Grade 1-6).
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="same_grade_school"
                                                        checked={useSingleGradeSchool}
                                                        onCheckedChange={(checked) => {
                                                            const enabled = checked === true;
                                                            const schoolName = singleGradeSchoolName || data.grade_1_school || '';
                                                            setUseSingleGradeSchool(enabled);
                                                            if (enabled) {
                                                                setSingleGradeSchoolName(schoolName);
                                                                syncSchoolGroup(gradeSchoolFields, schoolName);
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="same_grade_school"
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        Same school for all grades (1-6) - enter school name once
                                                    </Label>
                                                </div>
                                            </div>

                                            {useSingleGradeSchool && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="grade_school_all" className="text-xs text-muted-foreground">
                                                        School name (Grades 1-6)
                                                    </Label>
                                                    <Input
                                                        id="grade_school_all"
                                                        placeholder="Name of School"
                                                        value={singleGradeSchoolName}
                                                        onChange={(e) => {
                                                            const schoolName = e.target.value;
                                                            setSingleGradeSchoolName(schoolName);
                                                            syncSchoolGroup(gradeSchoolFields, schoolName);
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {[1, 2, 3, 4, 5, 6].map((grade) => (
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

                                                        {useSingleGradeSchool ? (
                                                            <div className="text-xs italic text-muted-foreground">
                                                                {singleGradeSchoolName || 'Same as above'}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                id={`grade_${grade}_school`}
                                                                name={`grade_${grade}_school`}
                                                                value={
                                                                    (data[
                                                                        `grade_${grade}_school` as keyof typeof data
                                                                    ] as string) || ''
                                                                }
                                                                onChange={(e) =>
                                                                    setData(
                                                                        `grade_${grade}_school` as any,
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                placeholder="Name of School"
                                                                required
                                                            />
                                                        )}

                                                        <Input
                                                            id={`grade_${grade}_year`}
                                                            name={`grade_${grade}_year`}
                                                            type="number"
                                                            value={
                                                                (data[
                                                                    `grade_${grade}_year` as keyof typeof data
                                                                ] as number) || ''
                                                            }
                                                            onChange={(e) =>
                                                                setData(
                                                                    `grade_${grade}_year` as any,
                                                                    e.target.value ? Number(e.target.value) : '',
                                                                )
                                                            }
                                                            placeholder="Year Graduated"
                                                            min={1900}
                                                            max={new Date().getFullYear()}
                                                            required
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Junior High School */}
                                    {data.highest_education_level &&
                                        (data.highest_education_level === 'junior_high_school' ||
                                            data.highest_education_level === 'senior_high_school' ||
                                            data.highest_education_level === 'college' ||
                                            data.highest_education_level === 'masters' ||
                                            data.highest_education_level === 'doctor') && (
                                            <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-foreground">
                                                            Junior High School
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            Provide the name of school and year graduated for each year level (1st-4th Year).
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id="same_jhs_school"
                                                            checked={useSingleJhsSchool}
                                                            onCheckedChange={(checked) => {
                                                                const enabled = checked === true;
                                                                const schoolName = singleJhsSchoolName || data.jhs_1_school || '';
                                                                setUseSingleJhsSchool(enabled);
                                                                if (enabled) {
                                                                    setSingleJhsSchoolName(schoolName);
                                                                    syncSchoolGroup(jhsSchoolFields, schoolName);
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor="same_jhs_school"
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            Same school for all JHS years (1st-4th) - enter school name once
                                                        </Label>
                                                    </div>
                                                </div>

                                                {useSingleJhsSchool && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="jhs_school_all" className="text-xs text-muted-foreground">
                                                            School name (1st-4th Year)
                                                        </Label>
                                                        <Input
                                                            id="jhs_school_all"
                                                            placeholder="Name of School"
                                                            value={singleJhsSchoolName}
                                                            onChange={(e) => {
                                                                const schoolName = e.target.value;
                                                                setSingleJhsSchoolName(schoolName);
                                                                syncSchoolGroup(jhsSchoolFields, schoolName);
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-3">
                                                    {[
                                                        { num: 1, label: '1ST YEAR' },
                                                        { num: 2, label: '2ND YEAR' },
                                                        { num: 3, label: '3RD YEAR' },
                                                        { num: 4, label: '4TH YEAR' },
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
                                                                <div className="text-xs italic text-muted-foreground">
                                                                    {singleJhsSchoolName || 'Same as above'}
                                                                </div>
                                                            ) : (
                                                                <Input
                                                                    id={`jhs_${num}_school`}
                                                                    name={`jhs_${num}_school`}
                                                                    value={
                                                                        (data[
                                                                            `jhs_${num}_school` as keyof typeof data
                                                                        ] as string) || ''
                                                                    }
                                                                    onChange={(e) =>
                                                                        setData(
                                                                            `jhs_${num}_school` as any,
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder="Name of School"
                                                                    required
                                                                />
                                                            )}

                                                            <Input
                                                                id={`jhs_${num}_year`}
                                                                name={`jhs_${num}_year`}
                                                                type="number"
                                                                value={
                                                                    (data[
                                                                        `jhs_${num}_year` as keyof typeof data
                                                                    ] as number) || ''
                                                                }
                                                                onChange={(e) =>
                                                                    setData(
                                                                        `jhs_${num}_year` as any,
                                                                        e.target.value ? Number(e.target.value) : '',
                                                                    )
                                                                }
                                                                placeholder="Year Graduated"
                                                                min={1900}
                                                                max={new Date().getFullYear()}
                                                                required
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    {/* Senior High School */}
                                    {data.highest_education_level &&
                                        (data.highest_education_level === 'senior_high_school' ||
                                            data.highest_education_level === 'college' ||
                                            data.highest_education_level === 'masters' ||
                                            data.highest_education_level === 'doctor') && (
                                            <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="did_not_attend_senior_high"
                                                        checked={didNotAttendSeniorHigh}
                                                        onCheckedChange={(checked) => {
                                                            const enabled = checked === true;
                                                            setDidNotAttendSeniorHigh(enabled);
                                                            if (enabled) {
                                                                setUseSingleShsSchool(false);
                                                                setSingleShsSchoolName('');
                                                                setData('shs_11_school', '');
                                                                setData('shs_11_year', '');
                                                                setData('shs_12_school', '');
                                                                setData('shs_12_year', '');
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="did_not_attend_senior_high"
                                                        className={`font-normal cursor-pointer ${didNotAttendSeniorHigh ? 'text-base font-semibold' : 'text-sm'}`}
                                                    >
                                                        I didn't attend senior high school
                                                    </Label>
                                                </div>

                                                {!didNotAttendSeniorHigh && (
                                                    <>
                                                        <div className="flex flex-col gap-4 border-t pt-2 lg:flex-row lg:items-end lg:justify-between">
                                                            <div>
                                                                <h3 className="mb-1 text-sm font-semibold text-foreground">
                                                                    Senior High School
                                                                </h3>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Provide the name of school and year graduated for each grade level (Grade 11-12).
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Checkbox
                                                                    id="same_shs_school"
                                                                    checked={useSingleShsSchool}
                                                                    onCheckedChange={(checked) => {
                                                                        const enabled = checked === true;
                                                                        const schoolName = singleShsSchoolName || data.shs_11_school || '';
                                                                        setUseSingleShsSchool(enabled);
                                                                        if (enabled) {
                                                                            setSingleShsSchoolName(schoolName);
                                                                            syncSchoolGroup(shsSchoolFields, schoolName);
                                                                        }
                                                                    }}
                                                                />
                                                                <Label
                                                                    htmlFor="same_shs_school"
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    Same school for Grades 11-12 - enter school name once
                                                                </Label>
                                                            </div>
                                                        </div>

                                                        {useSingleShsSchool && (
                                                            <div className="space-y-2">
                                                                <Label htmlFor="shs_school_all" className="text-xs text-muted-foreground">
                                                                    School name (Grades 11-12)
                                                                </Label>
                                                                <Input
                                                                    id="shs_school_all"
                                                                    placeholder="Name of School"
                                                                    value={singleShsSchoolName}
                                                                    onChange={(e) => {
                                                                        const schoolName = e.target.value;
                                                                        setSingleShsSchoolName(schoolName);
                                                                        syncSchoolGroup(shsSchoolFields, schoolName);
                                                                    }}
                                                                    required
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="space-y-3">
                                                            {[11, 12].map((grade) => (
                                                                <div
                                                                    key={grade}
                                                                    className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto,1fr,1fr]"
                                                                >
                                                                    <Label
                                                                        htmlFor={`shs_${grade}_school`}
                                                                        className="w-auto text-sm font-medium sm:w-24"
                                                                    >
                                                                        GRADE {grade}:
                                                                    </Label>

                                                                    {useSingleShsSchool ? (
                                                                        <div className="text-xs italic text-muted-foreground">
                                                                            {singleShsSchoolName || 'Same as above'}
                                                                        </div>
                                                                    ) : (
                                                                        <Input
                                                                            id={`shs_${grade}_school`}
                                                                            name={`shs_${grade}_school`}
                                                                            value={
                                                                                (data[
                                                                                    `shs_${grade}_school` as keyof typeof data
                                                                                ] as string) || ''
                                                                            }
                                                                            onChange={(e) =>
                                                                                setData(
                                                                                    `shs_${grade}_school` as any,
                                                                                    e.target.value,
                                                                                )
                                                                            }
                                                                            placeholder="Name of School"
                                                                            required
                                                                        />
                                                                    )}

                                                                    <Input
                                                                        id={`shs_${grade}_year`}
                                                                        name={`shs_${grade}_year`}
                                                                        type="number"
                                                                        value={
                                                                            (data[
                                                                                `shs_${grade}_year` as keyof typeof data
                                                                            ] as number) || ''
                                                                        }
                                                                        onChange={(e) =>
                                                                            setData(
                                                                                `shs_${grade}_year` as any,
                                                                                e.target.value ? Number(e.target.value) : '',
                                                                            )
                                                                        }
                                                                        placeholder="Year Graduated"
                                                                        min={0}
                                                                        max={new Date().getFullYear()}
                                                                        required
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    {/* College */}
                                    {data.highest_education_level &&
                                        (data.highest_education_level === 'college' ||
                                            data.highest_education_level === 'masters' ||
                                            data.highest_education_level === 'doctor') && (
                                            <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                                                <div>
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    College
                                                </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Provide your college degree and year graduated. If you graduated in SPUP, you don&apos;t need to enter the college/university name.
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="is_transferee"
                                                        checked={data.is_transferee || false}
                                                        onCheckedChange={(checked) => {
                                                            setData('is_transferee', checked === true);
                                                            if (checked) {
                                                                // Clear college/university name when checked (graduated from St. Paul)
                                                                setData('college_school_name', '');
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="is_transferee"
                                                        className="text-sm font-normal cursor-pointer"
                                                    >
                                                        I graduated in St. Paul University Philippines
                                                    </Label>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="college_degree">
                                                            Degree / course *
                                                        </Label>
                                                        <Input
                                                            id="college_degree"
                                                            name="college_degree"
                                                            value={data.college_degree || ''}
                                                            onChange={(e) =>
                                                                setData(
                                                                    'college_degree',
                                                                    e.target.value,
                                                                )
                                                            }
                                                            required={
                                                                data.highest_education_level === 'college' ||
                                                                data.highest_education_level === 'masters' ||
                                                                data.highest_education_level === 'doctor'
                                                            }
                                                        />
                                                        <InputError
                                                            message={errors.college_degree}
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="college_year_graduated">
                                                            Year graduated *
                                                        </Label>
                                                        <Input
                                                            id="college_year_graduated"
                                                            name="college_year_graduated"
                                                            type="number"
                                                            value={data.college_year_graduated || ''}
                                                            onChange={(e) =>
                                                                setData(
                                                                    'college_year_graduated',
                                                                    e.target.value
                                                                        ? Number(e.target.value)
                                                                        : '',
                                                                )
                                                            }
                                                            min={1900}
                                                            max={new Date().getFullYear()}
                                                            required={
                                                                data.highest_education_level === 'college' ||
                                                                data.highest_education_level === 'masters' ||
                                                                data.highest_education_level === 'doctor'
                                                            }
                                                        />
                                                        <InputError
                                                            message={errors.college_year_graduated}
                                                        />
                                                    </div>
                                                </div>
                                                {!data.is_transferee && (
                                                <div className="grid gap-2">
                                                    <Label htmlFor="college_school_name">
                                                        College / university *
                                                    </Label>
                                                    <Input
                                                        id="college_school_name"
                                                        name="college_school_name"
                                                        value={data.college_school_name || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'college_school_name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        required
                                                    />
                                                    <InputError
                                                        message={errors.college_school_name}
                                                    />
                                                </div>
                                                )}
                                            </div>
                                        )}

                                    {/* Masters */}
                                    {data.highest_education_level === 'masters' && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Masters
                                            </h3>
                                            <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-3">
                                                <Label
                                                    htmlFor="grad_masteral_school"
                                                    className="w-28 text-sm font-medium"
                                                >
                                                    MASTERAL:
                                                </Label>
                                                <Input
                                                    id="grad_masteral_school"
                                                    name="grad_masteral_school"
                                                    value={data.grad_masteral_school || ''}
                                                    onChange={(e) =>
                                                        setData(
                                                            'grad_masteral_school',
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="Name of School"
                                                    required
                                                />
                                                <Input
                                                    id="grad_masteral_year"
                                                    name="grad_masteral_year"
                                                    type="number"
                                                    value={data.grad_masteral_year || ''}
                                                    onChange={(e) =>
                                                        setData(
                                                            'grad_masteral_year',
                                                            e.target.value
                                                                ? Number(e.target.value)
                                                                : '',
                                                        )
                                                    }
                                                    placeholder="Year Graduated (or 0000)"
                                                    min={0}
                                                    max={new Date().getFullYear()}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Doctor */}
                                    {data.highest_education_level === 'doctor' && (
                                        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Doctor
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-[auto,1fr,1fr] items-center gap-3">
                                                    <Label
                                                        htmlFor="grad_masteral_school"
                                                        className="w-28 text-sm font-medium"
                                                    >
                                                        MASTERAL:
                                                    </Label>
                                                    <Input
                                                        id="grad_masteral_school"
                                                        name="grad_masteral_school"
                                                        value={data.grad_masteral_school || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'grad_masteral_school',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Name of School"
                                                        required
                                                    />
                                                    <Input
                                                        id="grad_masteral_year"
                                                        name="grad_masteral_year"
                                                        type="number"
                                                        value={data.grad_masteral_year || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'grad_masteral_year',
                                                                e.target.value
                                                                    ? Number(e.target.value)
                                                                    : '',
                                                            )
                                                        }
                                                        placeholder="Year Graduated (or 0000)"
                                                        min={0}
                                                        max={new Date().getFullYear()}
                                                        required
                                                    />
                                                </div>
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
                                                        value={data.grad_doctoral_school || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'grad_doctoral_school',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Name of School"
                                                        required
                                                    />
                                                    <Input
                                                        id="grad_doctoral_year"
                                                        name="grad_doctoral_year"
                                                        type="number"
                                                        value={data.grad_doctoral_year || ''}
                                                        onChange={(e) =>
                                                            setData(
                                                                'grad_doctoral_year',
                                                                e.target.value
                                                                    ? Number(e.target.value)
                                                                    : '',
                                                            )
                                                        }
                                                        placeholder="Year Graduated (or 0000)"
                                                        min={0}
                                                        max={new Date().getFullYear()}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            {cancelHref ? (
                                                <Button asChild type="button" variant="ghost">
                                                    <Link href={cancelHref}>Cancel</Link>
                                                </Button>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setCurrentStep('personal')}
                                            >
                                                <ChevronLeft className="mr-2 h-4 w-4" />
                                                Back
                                            </Button>
                                            <Button type="button" onClick={confirmStep}>
                                                Confirm & Continue
                                                <ChevronRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Application Details */}
                        {currentStep === 'application' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Step 3: Application Details</CardTitle>
                                    <CardDescription>
                                        Complete your graduation application details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Graduation Appearance */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="presence">
                                            Graduation Appearance *
                                        </Label>
                                        <select
                                            id="presence"
                                            name="presence"
                                            aria-label="Graduation appearance"
                                            value={data.presence}
                                            onChange={(e) =>
                                                setData(
                                                    'presence',
                                                    e.target.value as 'attending' | 'not attending',
                                                )
                                            }
                                            required
                                            className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                        >
                                            <option value="attending">Attending</option>
                                            <option value="not attending">Not Attending</option>
                                        </select>
                                        <InputError message={errors.presence} />
                                    </div>

                                    {/* Department */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="department_id">Department *</Label>
                                        <select
                                            id="department_id"
                                            name="department_id"
                                            aria-label="Department"
                                            value={selectedDepartmentId === '' ? '' : selectedDepartmentId}
                                            onChange={(e) => {
                                                const deptId = e.target.value
                                                    ? Number(e.target.value)
                                                    : '';
                                                setSelectedDepartmentId(deptId);
                                                setSelectedCourseId('');
                                                setSelectedMajorId('');
                                                setData('department_id', deptId ? String(deptId) : '');
                                                setData('course_id', '');
                                                setData('major', '');
                                            }}
                                            required
                                            className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                        >
                                            <option value="">Select Department</option>
                                            {departments.map((dept) => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.department_id} />
                                    </div>

                                    {/* Course */}
                                    {selectedDepartment && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="course_id">Degree *</Label>
                                            <select
                                                id="course_id"
                                                name="course_id"
                                                aria-label="Degree"
                                                value={selectedCourseId === '' ? '' : selectedCourseId}
                                                onChange={(e) => {
                                                    const courseId = e.target.value
                                                        ? Number(e.target.value)
                                                        : '';
                                                    setSelectedCourseId(courseId);
                                                    setSelectedMajorId('');
                                                    setData('course_id', courseId ? String(courseId) : '');
                                                    setData('major', '');
                                                }}
                                                required
                                                className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                            >
                                                <option value="">Select Course</option>
                                                {selectedDepartment.courses.map((course) => (
                                                    <option key={course.id} value={course.id}>
                                                        {course.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.course_id} />
                                        </div>
                                    )}

                                    {/* Major (optional) */}
                                    {selectedCourse && selectedCourse.majors.length > 0 && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="major">Major (optional)</Label>
                                            <select
                                                id="major"
                                                name="major"
                                                aria-label="Major"
                                                value={selectedMajorId === '' ? '' : selectedMajorId}
                                                onChange={(e) => {
                                                    const majorId = e.target.value
                                                        ? Number(e.target.value)
                                                        : '';
                                                    const majorName =
                                                        selectedCourse.majors.find(
                                                            (m) => m.id === majorId,
                                                        )?.name || '';
                                                    setSelectedMajorId(majorId);
                                                    setData('major', majorName);
                                                }}
                                                className="border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] rounded-md"
                                            >
                                                <option value="">No major / Not applicable</option>
                                                {selectedCourse.majors.map((major) => (
                                                    <option key={major.id} value={major.id}>
                                                        {major.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError message={errors.major} />
                                        </div>
                                    )}

                                    {/* Degree Title - Display Only */}
                                    <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                        <Label className="text-sm font-semibold text-foreground">
                                            Degree / Title Applying For
                                        </Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">
                                                    Degree
                                                </Label>
                                                <p className="text-sm font-medium">
                                                    {selectedCourse?.name || 'Not selected'}
                                                </p>
                                            </div>
                                            {selectedCourse && selectedCourse.majors.length > 0 && (
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">
                                                        Major
                                                    </Label>
                                                    <p className="text-sm font-medium">
                                                        {selectedMajorId
                                                            ? selectedCourse.majors.find(
                                                                (m) => m.id === selectedMajorId,
                                                            )?.name || 'Not selected'
                                                            : 'Not selected'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="hidden"
                                            name="degree_title"
                                            value={data.degree_title}
                                        />
                                        <InputError message={errors.degree_title} />
                                    </div>

                                    {/* Graduate Program Fields */}
                                    {isGraduateProgram && (
                                        <>
                                            {/* Multiple Subject Code/Title/Units - Dynamic rows */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label>Subjects Presently Enrolled *</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={addGraduateSubject}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Add Subject
                                                    </Button>
                                                </div>
                                                <div className="space-y-3">
                                                    {data.graduate_subjects.map((subject, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid grid-cols-5 gap-4 items-end"
                                                        >
                                                            <div>
                                                                <Label className="text-sm">
                                                                    Code
                                                                </Label>
                                                                <Input
                                                                    value={subject.subject_code}
                                                                    onChange={(e) =>
                                                                        updateGraduateSubject(
                                                                            index,
                                                                            'subject_code',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder="e.g., THESIS 101"
                                                                />
                                                            </div>
                                                            <div className="col-span-3">
                                                                <Label className="text-sm">
                                                                    Title
                                                                </Label>
                                                                <Input
                                                                    value={subject.subject_title}
                                                                    onChange={(e) =>
                                                                        updateGraduateSubject(
                                                                            index,
                                                                            'subject_title',
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    placeholder="e.g., Thesis Writing"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="flex-1">
                                                                    <Label className="text-sm">
                                                                        Units
                                                                    </Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={subject.units ?? 0}
                                                                        onChange={(e) =>
                                                                            updateGraduateSubject(
                                                                                index,
                                                                                'units',
                                                                                e.target.value === ''
                                                                                    ? 0
                                                                                    : Number(e.target.value),
                                                                            )
                                                                        }
                                                                        placeholder="Units"
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                {data.graduate_subjects.length > 1 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 shrink-0"
                                                                        onClick={() => removeGraduateSubject(index)}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="no_thesis_required"
                                                        checked={noThesisRequired}
                                                        onCheckedChange={(checked) => {
                                                            const enabled = checked === true;
                                                            setNoThesisRequired(enabled);
                                                            if (enabled) {
                                                                setData('thesis_dissertation_title', '');
                                                                setData('thesis_dissertation_adviser', '');
                                                            }
                                                        }}
                                                    />
                                                    <Label
                                                        htmlFor="no_thesis_required"
                                                        className="text-sm font-normal cursor-pointer"
                                                    >
                                                        Thesis / dissertation not required for this program
                                                    </Label>
                                                </div>

                                                {!noThesisRequired && (
                                                    <>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="thesis_dissertation_title">
                                                                Thesis/Dissertation Title
                                                            </Label>
                                                            <Textarea
                                                                id="thesis_dissertation_title"
                                                                name="thesis_dissertation_title"
                                                                value={data.thesis_dissertation_title}
                                                                onChange={(e) =>
                                                                    setData(
                                                                        'thesis_dissertation_title',
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                placeholder="Enter your thesis or dissertation title"
                                                                rows={3}
                                                            />
                                                            <InputError
                                                                message={errors.thesis_dissertation_title}
                                                            />
                                                        </div>

                                                        <div className="grid gap-2">
                                                            <Label htmlFor="thesis_dissertation_adviser">
                                                                Thesis/Dissertation Adviser
                                                            </Label>
                                                            <Input
                                                                id="thesis_dissertation_adviser"
                                                                name="thesis_dissertation_adviser"
                                                                value={data.thesis_dissertation_adviser}
                                                                onChange={(e) =>
                                                                    setData(
                                                                        'thesis_dissertation_adviser',
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                placeholder="Enter your adviser&apos;s name"
                                                            />
                                                            <InputError
                                                                message={errors.thesis_dissertation_adviser}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Confirmation Section */}
                                    <div className="space-y-4 rounded-md border bg-muted/40 p-4">
                                        <Label className="text-sm font-semibold text-foreground">
                                            Confirmation
                                        </Label>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="agreed_to_requirements"
                                                    aria-label="Agree to comply with requirements"
                                                    checked={agreedToRequirements}
                                                    onChange={(e) =>
                                                        setAgreedToRequirements(e.target.checked)
                                                    }
                                                    className="mt-1 h-4 w-4 rounded border-gray-300"
                                                />
                                                <Label
                                                    htmlFor="agreed_to_requirements"
                                                    className="text-sm leading-relaxed cursor-pointer"
                                                >
                                                    I agree to comply with the requirements for the
                                                    degree I am applying for.
                                                </Label>
                                            </div>
                                            {agreedToRequirements && (
                                                <div className="grid gap-2">
                                                    <Label htmlFor={isGuestMode ? 'email_confirmation' : 'student_id_confirmation'}>
                                                        {isGuestMode
                                                            ? 'Enter your email address to confirm *'
                                                            : 'Enter your Student ID Number to confirm *'}
                                                    </Label>
                                                    {isGuestMode ? (
                                                        <>
                                                            <Input
                                                                id="email_confirmation"
                                                                name="email_confirmation"
                                                                type="email"
                                                                value={emailConfirmation}
                                                                onChange={(e) =>
                                                                    setEmailConfirmation(e.target.value)
                                                                }
                                                                placeholder="Enter your email address"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Please enter the same email you used above: {data.email || 'you@example.com'}
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Input
                                                                id="student_id_confirmation"
                                                                name="student_id_confirmation"
                                                                value={studentIdConfirmation}
                                                                onChange={(e) =>
                                                                    setStudentIdConfirmation(
                                                                        e.target.value,
                                                                    )
                                                                }
                                                                placeholder="Enter your Student ID"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Please enter your Student ID:{' '}
                                                                {expectedStudentId || 'N/A'}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            {cancelHref ? (
                                                <Button asChild type="button" variant="ghost">
                                                    <Link href={cancelHref}>Cancel</Link>
                                                </Button>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setCurrentStep('educational')}
                                            >
                                                <ChevronLeft className="mr-2 h-4 w-4" />
                                                Back
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    processing ||
                                                    !agreedToRequirements ||
                                                    !confirmationMatches
                                                }
                                            >
                                                {processing ? (isEditMode ? 'Updating...' : 'Submitting...') : submitLabel}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </form>
                </div>
            </div>
    );
}

