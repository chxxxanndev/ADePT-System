// TODO: replace with real data from a useReportsAnalytics hook / API call,
// mirroring the pattern used for dashboardMockData / PendingPaymentData elsewhere.
// Each PeriodMetric represents counts for Today (daily), This Week (weekly),
// and This Month (monthly) — swap these for real aggregation queries later.

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

// ── Overview: Documents Released & Total Requests ──
export const documentsReleased: PeriodMetric = { daily: 29, weekly: 139, monthly: 697 };
export const totalRequests: PeriodMetric = { daily: 34, weekly: 158, monthly: 745 };

export const documentsReleasedTrend: TrendInfo = { direction: 'up', percentage: 12, comparedTo: 'Yesterday' };
export const totalRequestsTrend: TrendInfo = { direction: 'up', percentage: 8, comparedTo: 'Yesterday' };

// ── Breakdown by Document Type ──
export const documentTypeBreakdown: DocumentTypeMetric[] = [
    { id: 'tax-declaration', label: 'Tax Declaration', color: '#2E2172', daily: 6, weekly: 30, monthly: 210 },
    { id: 'land-holding', label: 'Certificate of Land Holding', color: '#D9A400', daily: 18, weekly: 88, monthly: 415 },
    { id: 'no-land-holding', label: 'Certificate of No Landholding', color: '#C6373A', daily: 5, weekly: 21, monthly: 72 },
];

// ── Processing Queue (live snapshot, not period-based) ──
export const processingQueue: SimpleMetric[] = [
    { id: 'pending-payment', label: 'Pending Payment', count: 12, color: '#D9A400' },
    { id: 'pending-verification', label: 'Pending Verification', count: 4, color: '#4A9FE8' },
];

// ── Transaction Management ──
export const transactionManagement: SimpleMetric[] = [
    { id: 'transaction-registry', label: 'Transaction Registry', count: 745, color: '#2E2172' },
    { id: 'certified-true-copies', label: 'Certified True Copies', count: 7, color: '#1E9E5A' },
    { id: 'void-amended', label: 'Void & Amended', count: 6, color: '#C6373A' },
    { id: 'archived-flagged', label: 'Archived / Flagged', count: 16, color: '#8A8DA0' },
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
        color: '#DCD9F5',
    },
    {
        id: 'land-holding',
        docTypeLabel: 'Certificates of Land Holding Released',
        totalReleased: 415,
        mostRecentStaff: 'John Cruz',
        mostRecentTime: '8:12 AM',
        color: '#FBEFC6',
    },
    {
        id: 'no-land-holding',
        docTypeLabel: 'Certificates of No Landholding Released',
        totalReleased: 72,
        mostRecentStaff: 'Anne Reyes',
        mostRecentTime: '7:55 AM',
        color: '#F8D0D0',
    },
];

// ── Performance Insights (added beyond the original request — see notes below) ──
export const completionRate = 93; // % of requests successfully released vs total requested
export const avgTurnaroundHours = 2.4; // average time from request intake to release