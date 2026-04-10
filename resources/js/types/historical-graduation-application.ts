export type HistoricalViewer = 'admin' | 'coordinator';

export type HistoricalStatus = 'approved' | 'pending' | 'incomplete' | 'unknown';

export interface HistoricalApplicationListItem {
    id: number;
    source_period_label: string;
    reference_code: string | null;
    student_id: string | null;
    full_name: string;
    email: string | null;
    department_name: string | null;
    course_name: string | null;
    major_name: string | null;
    degree_title: string | null;
    attendance: string | null;
    status: HistoricalStatus;
    status_raw: string | null;
    submitted_at: string | null;
}

export interface HistoricalApplicationsIndexProps {
    viewer: HistoricalViewer;
    applications: {
        data: HistoricalApplicationListItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        search: string;
        batch: string;
        status: string;
    };
    batchOptions: Array<{
        value: string;
        label: string;
    }>;
    statusOptions: Array<{
        value: string;
        label: string;
    }>;
}

export interface HistoricalApplicationShowProps {
    viewer: HistoricalViewer;
    record: {
        id: number;
        source_period_label: string;
        reference_code: string | null;
        student_id: string | null;
        full_name: string;
        attendance: string | null;
        attendance_raw: string | null;
        status: HistoricalStatus;
        status_raw: string | null;
        submitted_at: string | null;
        program: {
            department_name: string | null;
            course_name: string | null;
            major_name: string | null;
            degree_title: string | null;
        };
        personal: {
            first_name: string | null;
            middle_name: string | null;
            last_name: string | null;
            sex: string | null;
            civil_status: string | null;
            religion: string | null;
            nationality: string | null;
            date_of_birth: string | null;
            place_of_birth: string | null;
        };
        contacts: {
            email: string | null;
            contact_number: string | null;
            address: string | null;
        };
        thesis: {
            title: string | null;
            adviser: string | null;
        };
        subjects: Array<{
            order: number | null;
            title: string | null;
            units: string | null;
        }>;
        education_history: {
            elementary?: Array<{ label: string; school: string | null; year: string | null }>;
            junior_high_school?: Array<{ label: string; school: string | null; year: string | null }>;
            senior_high_school?: Array<{ label: string; school: string | null; year: string | null }>;
            college?: {
                degree: string | null;
                year: string | null;
            };
            masters?: {
                school: string | null;
                year: string | null;
            };
            doctor?: {
                school: string | null;
                year: string | null;
            };
        };
        metadata: {
            source_batch: string;
            source_table: string;
            source_row_id: number;
            source_created_at: string | null;
            source_updated_at: string | null;
        };
    };
}
