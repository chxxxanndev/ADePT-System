// Mock data source for the Admin Dashboard.
// Values here are wired to match the reference screenshot 1:1.
// Swap the arrays/fetchers for real API calls once endpoints are ready —
// the shapes below are the contract the UI components already expect.

/* --------------------------------- Types ---------------------------------- */

export interface AdminStatItem {
    id: string;
    label: string;
    value: number | string;
    icon: 'user' | 'alert' | 'check' | 'close' | 'request' | 'gears';
    accent: 'teal' | 'gold' | 'green' | 'red';
}

export interface AdminTransactionRow {
    id: string;
    controlNo: string;
    declarant: string;
    document: string;
    assignedStaff: string;
    status: 'Approved' | 'Disapproved' | 'Pending';
    date: string;
}

export interface StaffPerformanceItem {
    id: string;
    initials: string;
    name: string;
    requests: number;
    avatarBg: string;
}

export interface AdminActivityItem {
    id: string;
    title: string;
    actor: string;
    time: string;
    status: 'approved' | 'pending' | 'declined';
}

export interface DocumentDistributionSlice {
    id: string;
    label: string;
    percentage: number;
    count: number;
    color: string;
}

export interface AdminNavSubItem {
    label: string;
    view: string;
}

export interface AdminNavItem {
    label: string;
    view: string;
    subItems?: AdminNavSubItem[];
}

export interface AdminNavSection {
    section: string;
    items: AdminNavItem[];
}

/* ------------------------------ Sidebar nav -------------------------------- */

export const adminNavigation: AdminNavSection[] = [
    {
        section: 'General',
        items: [
            { label: 'Overview', view: 'overview' },
        ],
    },
    {
        section: 'Access Control',
        items: [
            {
                label: 'User Management',
                view: 'user-management',
                subItems: [
                    { label: 'Account Request', view: 'account-request' },
                    { label: 'Staff Accounts', view: 'staff-accounts' },
                ],
            },
            { label: 'Request queue', view: 'request-queue' },
        ],
    },
    {
        section: 'Other',
        items: [
            { label: 'Reports & Analytics', view: 'reports-analytics' },
            { label: 'Audit Log', view: 'audit-log' },
            { label: 'Settings', view: 'settings' },
        ],
    },
];

/* ---------------------------- Account access requests ---------------------------- */

export const accessRequestsMock: AdminStatItem[] = [
    { id: 'active-accounts', label: 'Active Accounts', value: 5, icon: 'user', accent: 'teal' },
    { id: 'pending-registration', label: 'Pending Registration', value: 4, icon: 'alert', accent: 'gold' },
    { id: 'approved-today', label: 'Approved Today', value: 7, icon: 'check', accent: 'green' },
    { id: 'declined-today', label: 'Declined Today', value: 2, icon: 'close', accent: 'red' },
];

/* ------------------------------ Document request queue ---------------------------- */

export const requestQueueMock: AdminStatItem[] = [
    { id: 'request-today', label: 'Request Today', value: 10, icon: 'request', accent: 'teal' },
    { id: 'processing', label: 'Processing', value: 20, icon: 'gears', accent: 'gold' },
    { id: 'approved-documents', label: 'Approved Documents', value: 148, icon: 'check', accent: 'green' },
    { id: 'disapproved-documents', label: 'Disapproved Documents', value: 10, icon: 'close', accent: 'red' },
];

/* --------------------------------- Transactions ------------------------------------ */

export const transactionsMock: AdminTransactionRow[] = [
    {
        id: '2026-ADR',
        controlNo: '2026-ADR',
        declarant: 'Zacarias Jacob',
        document: 'Tax Declaration',
        assignedStaff: 'Linda',
        status: 'Approved',
        date: '7/1/2026',
    },
    {
        id: '2027-ADR',
        controlNo: '2027-ADR',
        declarant: 'Elizabeth Santos',
        document: 'Landholding',
        assignedStaff: 'Josephine',
        status: 'Disapproved',
        date: '7/17/2026',
    },
    {
        id: '2028-ADR',
        controlNo: '2028-ADR',
        declarant: 'Maria Montoro',
        document: 'No Landholding',
        assignedStaff: 'Emilio',
        status: 'Pending',
        date: '7/17/2026',
    },
    {
        id: '2029-ADR',
        controlNo: '2029-ADR',
        declarant: 'Mister Bean',
        document: 'Tax Declaration',
        assignedStaff: 'Laurel',
        status: 'Approved',
        date: '7/20/2026',
    },
];

/* ------------------------------- Staff performance --------------------------------- */

export const staffPerformanceMock: StaffPerformanceItem[] = [
    { id: 'maria-lopez', initials: 'ML', name: 'Maria Lopez', requests: 148, avatarBg: '#E3F2FD' },
    { id: 'john-cruz', initials: 'JC', name: 'John Cruz', requests: 100, avatarBg: '#FFF3E0' },
    { id: 'anne-reyes', initials: 'AR', name: 'Anne Reyes', requests: 88, avatarBg: '#E8F5E9' },
    { id: 'carlo-gomez', initials: 'CG', name: 'Carlo Gomez', requests: 54, avatarBg: '#F3E5F5' },
];

/* ----------------------------- Document distribution -------------------------------- */

export const documentDistributionMock: DocumentDistributionSlice[] = [
    { id: 'tax-dec', label: 'Tax Declaration', percentage: 52, count: 4664, color: '#252175' },
    { id: 'cert-landholding', label: 'Cert. of Landholding', percentage: 30, count: 2695, color: '#FDD835' },
    { id: 'cert-no-landholding', label: 'Cert. of No Landholding', percentage: 18, count: 1617, color: '#D32F2F' },
];

export const totalDocumentsCount = 8976;

/* ------------------------------------ Activity -------------------------------------- */

export const activitiesMock: AdminActivityItem[] = [
    { id: 'act-1', title: 'Approved Staff Account', actor: 'Super Admin', time: '7:58 AM', status: 'approved' },
    { id: 'act-2', title: 'Pending Registration', actor: 'Super Admin', time: '10:58 AM', status: 'pending' },
    { id: 'act-3', title: 'Declined Registration Request', actor: 'Super Admin', time: '7:58 AM', status: 'declined' },
];