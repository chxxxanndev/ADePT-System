export type StatAccent = 'teal' | 'gold' | 'green' | 'red';

export interface StatCardData {
    id: string;
    label: string;
    value: number | string;
    sublabel: string;
    accent: StatAccent;
    icon: 'requests' | 'released' | 'ready' | 'active' | 'archived' | 'voided' | 'reprinted' | 'cancelled';
    view?: string;
    viewParams?: Record<string, string>;
}

// The exact status vocabulary the /api/requests/registry endpoint emits
// (STATUS_MAP in request.service.js) — keep in sync with it.
export type BadgeStatus =
    | 'Pending'
    | 'For Payment'
    | 'Payment Verified'
    | 'Processing'
    | 'Ready for Release'
    | 'Released'
    | 'Void'
    | 'Cancelled'
    | 'Archived';

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
    rangeLabel?: string;
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

export interface PeriodRange {
    from: Date;
    to: Date;
}