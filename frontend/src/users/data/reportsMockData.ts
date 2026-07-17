// TODO: replace with real data from a useReportsAnalytics hook / API call,
// mirroring the pattern used for dashboardMockData / PendingPaymentData elsewhere.
// Each PeriodMetric represents counts for Today (daily), This Week (weekly),
// and This Month (monthly) — swap these for real aggregation queries later.
//
// All colors below are pulled directly from the ADePT Official Design System
// palette (see ReportsAnalytics.css for the same tokens as CSS variables).
// Keep these two files in sync if the palette ever changes.

export interface PeriodMetric {
    daily: number;
    weekly: number;
    monthly: number;
}

export interface TrendInfo {
    direction: 'up' | 'down';
    percentage: number;
    comparedTo: string;
}

export interface DocumentTypeMetric extends PeriodMetric {
    id: string;
    label: string;
    color: string;
}

export interface SimpleMetric {
    id: string;
    label: string;
    count: number;
    color: string;
}

// ── ADePT palette tokens (mirrors ReportsAnalytics.css --color-*) ──
const PALETTE = {
    primary: '#29237A',       // Deep Indigo
    secondary: '#00BCD4',     // Marine Teal
    success: '#4CAF50',       // Agri Green
    pending: '#FDD835',       // Star Gold
    error: '#D32F2F',         // Crimson Red
    archived: '#607D8B',      // Archived / neutral
    trueCopy: '#1976D2',      // Certified True Copy
};

// ── Overview: Documents Released & Total Requests ──
export const documentsReleased: PeriodMetric = { daily: 29, weekly: 139, monthly: 697 };
export const totalRequests: PeriodMetric = { daily: 34, weekly: 158, monthly: 745 };

export const documentsReleasedTrend: TrendInfo = { direction: 'up', percentage: 12, comparedTo: 'Yesterday' };
export const totalRequestsTrend: TrendInfo = { direction: 'up', percentage: 8, comparedTo: 'Yesterday' };

// ── Breakdown by Document Type ──
export const documentTypeBreakdown: DocumentTypeMetric[] = [
    { id: 'tax-declaration', label: 'Tax Declaration', color: PALETTE.primary, daily: 6, weekly: 30, monthly: 210 },
    { id: 'land-holding', label: 'Certificate of Land Holding', color: PALETTE.success, daily: 18, weekly: 88, monthly: 415 },
    { id: 'no-land-holding', label: 'Certificate of No Landholding', color: PALETTE.trueCopy, daily: 5, weekly: 21, monthly: 72 },
];

// ── Processing Queue (live snapshot, not period-based) ──
export const processingQueue: SimpleMetric[] = [
    { id: 'pending-payment', label: 'Pending Payment', count: 12, color: PALETTE.pending },
    { id: 'pending-verification', label: 'Pending Verification', count: 4, color: PALETTE.secondary },
];

// ── Transaction Management (separate chart) ──
export const transactionManagement: SimpleMetric[] = [
    { id: 'transaction-registry', label: 'Transaction Registry', count: 745, color: PALETTE.secondary },
    { id: 'certified-true-copies', label: 'Certified True Copies', count: 7, color: PALETTE.trueCopy },
    { id: 'void-amended', label: 'Void & Amended', count: 6, color: PALETTE.error },
    { id: 'archived-flagged', label: 'Archived / Flagged', count: 16, color: PALETTE.archived },
];

// ── Documents Released by Staff (list-row summary) ──
export interface StaffReleaseSummary {
    id: string;
    docTypeLabel: string;
    totalReleased: number;
    mostRecentStaff: string;
    mostRecentTime: string;
    color: string;
}

export const staffReleaseSummary: StaffReleaseSummary[] = [
    {
        id: 'tax-declaration',
        docTypeLabel: 'Tax Declarations Released',
        totalReleased: 210,
        mostRecentStaff: 'Maria Lopez',
        mostRecentTime: '8:40 AM',
        color: 'rgba(41, 35, 122, 0.08)', // primary tint
    },
    {
        id: 'land-holding',
        docTypeLabel: 'Certificates of Land Holding Released',
        totalReleased: 415,
        mostRecentStaff: 'John Cruz',
        mostRecentTime: '8:12 AM',
        color: 'rgba(76, 175, 80, 0.12)', // success tint
    },
    {
        id: 'no-land-holding',
        docTypeLabel: 'Certificates of No Landholding Released',
        totalReleased: 72,
        mostRecentStaff: 'Anne Reyes',
        mostRecentTime: '7:55 AM',
        color: 'rgba(25, 118, 210, 0.10)', // true copy tint
    },
];

// ── Declarant Records (per-transaction rows for the Reports table) ──
export type DeclarantStatus =
    | 'Released'
    | 'Pending Payment'
    | 'Pending Verification'
    | 'Voided'
    | 'Flagged'
    | 'Archived';

export interface DeclarantRecord {
    reference: string;
    declarantName: string;
    initials: string;
    avatarColor: string;
    documentRequested: string;
    dateReleased: string;
    staffReleased: string;
    encodedBy: string;
    status: DeclarantStatus;
}

export const declarantRecords: DeclarantRecord[] = [
    {
        reference: 'TD-2026-04831',
        declarantName: 'Leah Todd',
        initials: 'LT',
        avatarColor: PALETTE.primary,
        documentRequested: 'Tax Declaration',
        dateReleased: '10 Jul 2026 · 08:40 AM',
        staffReleased: 'Maria Lopez',
        encodedBy: 'Ana Marquez',
        status: 'Released',
    },
    {
        reference: 'LH-2026-04791',
        declarantName: 'Harriett Johnson',
        initials: 'HJ',
        avatarColor: PALETTE.success,
        documentRequested: 'Certificate of Land Holding',
        dateReleased: '10 Jul 2026 · 08:12 AM',
        staffReleased: 'John Cruz',
        encodedBy: 'Dennis Cruz',
        status: 'Released',
    },
    {
        reference: 'NLH-2026-05553',
        declarantName: 'Victor Wilkins',
        initials: 'VW',
        avatarColor: PALETTE.trueCopy,
        documentRequested: 'Certificate of No Landholding',
        dateReleased: '10 Jul 2026 · 07:55 AM',
        staffReleased: 'Anne Reyes',
        encodedBy: 'Ana Marquez',
        status: 'Released',
    },
    {
        reference: 'CTC-2026-02342',
        declarantName: 'Allen Hanson',
        initials: 'AH',
        avatarColor: PALETTE.trueCopy,
        documentRequested: 'Certified True Copy',
        dateReleased: '—',
        staffReleased: '—',
        encodedBy: 'Ana Marquez',
        status: 'Pending Payment',
    },
    {
        reference: 'TD-2026-09437',
        declarantName: 'Oscar Sullivan',
        initials: 'OS',
        avatarColor: PALETTE.primary,
        documentRequested: 'Tax Declaration',
        dateReleased: '—',
        staffReleased: '—',
        encodedBy: 'Dennis Cruz',
        status: 'Pending Verification',
    },
    {
        reference: 'CTC-2026-05155',
        declarantName: 'Minerva Duncan',
        initials: 'MD',
        avatarColor: PALETTE.trueCopy,
        documentRequested: 'Certified True Copy',
        dateReleased: '23 Jun 2026 · 12:18 AM',
        staffReleased: 'Maria Lopez',
        encodedBy: 'Dennis Cruz',
        status: 'Voided',
    },
    {
        reference: 'TD-2026-08169',
        declarantName: 'Sadie Blair',
        initials: 'SB',
        avatarColor: PALETTE.primary,
        documentRequested: 'Tax Declaration',
        dateReleased: '—',
        staffReleased: '—',
        encodedBy: 'John Cruz',
        status: 'Flagged',
    },
    {
        reference: 'NLH-2026-00423',
        declarantName: 'Sophia Rodriguez',
        initials: 'SR',
        avatarColor: PALETTE.trueCopy,
        documentRequested: 'Certificate of No Landholding',
        dateReleased: '01 Jun 2026 · 05:50 PM',
        staffReleased: 'Anne Reyes',
        encodedBy: 'Ana Marquez',
        status: 'Archived',
    },
    {
        reference: 'LH-2026-09725',
        declarantName: 'Tom Hanson',
        initials: 'TH',
        avatarColor: PALETTE.success,
        documentRequested: 'Certificate of Land Holding',
        dateReleased: '17 May 2026 · 02:29 PM',
        staffReleased: 'John Cruz',
        encodedBy: 'Ana Marquez',
        status: 'Released',
    },
    {
        reference: 'CTC-2026-06657',
        declarantName: 'Stanley Moore',
        initials: 'SM',
        avatarColor: PALETTE.trueCopy,
        documentRequested: 'Certified True Copy',
        dateReleased: '12 Apr 2026 · 07:32 AM',
        staffReleased: 'Maria Lopez',
        encodedBy: 'Dennis Cruz',
        status: 'Released',
    },
];

// ── Performance Insights (added beyond the original request — see notes below) ──
export const completionRate = 93; // % of requests successfully released vs total requested
export const avgTurnaroundHours = 2.4; // average time from request intake to release