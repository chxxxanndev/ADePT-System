// Shared type definitions for the ADePT Dashboard

export type StatAccent = 'teal' | 'gold' | 'green' | 'red';

export interface StatCardData {
    id: string;
    label: string;
    value: number | string;
    sublabel: string;
    accent: StatAccent;
    icon: 'requests' | 'released' | 'ready' | 'active' | 'archived' | 'voided' | 'reprinted' | 'cancelled';
    /** Active-view the card navigates to when clicked (rendered as a button). */
    view?: string;
    /** Optional params carried into the destination view, e.g.
     *  { status: 'Cancelled' } to pre-filter Archive Management. */
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
    /** Short x-axis label — "This Week", "Last Week", or the week-start
     *  date ("Aug 10") for older weeks. */
    label: string;
    /** Full week date span for the tooltip, e.g. "3 Aug – 9 Aug". */
    rangeLabel?: string;
    /** Requests processed that week (bucketed by request date). */
    processed: number;
    /** Documents actually released that week (bucketed by release time). */
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

// Date range produced by the dashboard's Summary period selector
export interface PeriodRange {
    from: Date;
    to: Date;
}