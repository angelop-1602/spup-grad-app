import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    admin: User | null;
    coordinator: User | null;
    developer: User | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    version: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    notifications?: Array<{
        id: string;
        type?: string;
        student_name: string;
        student_avatar: string | null;
        student_id?: string;
        requirement_label: string;
        application_number: string;
        upload_count?: number;
        course_name?: string;
        department_name?: string;
        department_code?: string;
        created_at: string;
        read_at?: string | null;
    }>;
    unreadNotificationCount?: number;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
