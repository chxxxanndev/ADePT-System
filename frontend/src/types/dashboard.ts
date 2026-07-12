// Shared type definitions for the ADePT Dashboard

export type StatAccent = 'teal' | 'gold' | 'green' | 'red';

export interface StatCardData {
    id: string;
    label: string;
    value: number | string;
    sublabel: string;
    accent: StatAccent;
    icon: 'requests' | 'released' | 'issued' | 'active' | 'archived' | 'voided' | 'reprinted' | 'cancelled';
    trend?: 'up' | 'down';
}

export type BadgeStatus =
    | 'Released'
    | 'Pending Payment'
    | 'Pending Verification'
    | 'Paid'
    | 'Verified'
    | 'Cancelled'
    | 'Voided'
    | 'Archived'
    | 'Certified True Copy';

export interface TransactionRow {
    id: string;
    controlNumber: string;
    declarant: string;
    document: string;
    status: BadgeStatus;
    dateTime: string;
}

export interface WeeklyTrendPoint {
    label: string;
    value: number;
}

export interface DocumentDistributionSlice {
    label: string;
    count: number;
    percentage: number;
    color: 'primary' | 'gold' | 'red';
}

export interface QuickActionItem {
    id: string;
    title: string;
    description: string;
    icon: 'newRequest' | 'pending' | 'search' | 'archive' | 'reports';
    view: string;
}

export interface NavSubItem {
    label: string;
    badge?: number;
    dotColor?: 'green' | 'gold' | 'blue' | 'red' | 'purple';
    view: string;
}

export interface NavItem {
    label: string;
    icon: string;
    view?: string;
    subItems?: NavSubItem[];
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

export interface UserProfile {
    name: string;
    email: string;
    role: string;
    lastLogin: string;
}
