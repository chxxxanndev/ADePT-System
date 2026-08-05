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

// ── NEW: dual-series trend point (real processed + real released counts),
// used by AnalyticsOverview once it became period-selector-aware. Unlike
// WeeklyTrendPoint (fixed weekly buckets, single value), a TrendPoint's
// bucket width and count vary based on the active Dashboard Period range.
export interface TrendPoint {
    label: string;
    processed: number;
    released: number;
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
    avatarUrl?: string;
}

// Date range produced by the Dashboard Period selector
export interface PeriodRange {
    from: Date;
    to: Date;
}