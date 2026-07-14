export interface AdminStatItem {
    id: string;
    label: string;
    value: number;
    accent: 'teal' | 'gold' | 'green' | 'red';
    icon: 'user' | 'alert' | 'check' | 'close' | 'request' | 'gears';
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

export interface DocumentDistributionSlice {
    id: string;
    label: string;
    percentage: number;
    count: number;
    color: string;
}

export interface RecentActivityItem {
    id: string;
    title: string;
    actor: string;
    time: string;
    type: 'approved' | 'pending' | 'declined';
}

export interface AdminNavItem {
    label: string;
    view: string;
    subItems?: { label: string; view: string }[];
}

export interface AdminNavSection {
    section: string;
    items: AdminNavItem[];
}

export const adminNavigation: AdminNavSection[] = [
    {
        section: 'GENERAL',
        items: [
            { label: 'Overview', view: 'overview' }
        ]
    },
    {
        section: 'ACCESS CONTROL',
        items: [
            {
                label: 'User Management',
                view: 'user-management',
                subItems: [
                    { label: 'Account Request', view: 'account-request' },
                    { label: 'Staff Accounts', view: 'staff-accounts' }
                ]
            }
        ]
    },
    {
        section: 'OTHER',
        items: [
            { label: 'Request queue', view: 'request-queue' },
            { label: 'Reports & Analytics', view: 'reports-analytics' },
            { label: 'Audit Log', view: 'audit-log' },
            { label: 'Settings', view: 'settings' }
        ]
    }
];

export const accountAccessRequestsMock: AdminStatItem[] = [
    { id: 'active-acc', label: 'Active Accounts', value: 5, accent: 'teal', icon: 'user' },
    { id: 'pending-reg', label: 'Pending Registration', value: 4, accent: 'gold', icon: 'alert' },
    { id: 'approved-today', label: 'Approved Today', value: 7, accent: 'green', icon: 'check' },
    { id: 'declined-today', label: 'Declined Today', value: 2, accent: 'red', icon: 'close' }
];

export const documentRequestQueueMock: AdminStatItem[] = [
    { id: 'req-today', label: 'Request Today', value: 10, accent: 'teal', icon: 'request' },
    { id: 'processing', label: 'Processing', value: 20, accent: 'gold', icon: 'gears' },
    { id: 'approved-docs', label: 'Approved Documents', value: 148, accent: 'green', icon: 'check' },
    { id: 'disapproved-docs', label: 'Disapproved Documents', value: 10, accent: 'red', icon: 'close' }
];

export const recentTransactionsMock: AdminTransactionRow[] = [
    { id: 'rt1', controlNo: '2026-ADR', declarant: 'Zacarias Jacob', document: 'Tax Declaration', assignedStaff: 'Linda', status: 'Approved', date: '7/11/2026' },
    { id: 'rt2', controlNo: '2027-ADR', declarant: 'Elizabeth Santos', document: 'Landholding', assignedStaff: 'Josephine', status: 'Disapproved', date: '7/17/2026' },
    { id: 'rt3', controlNo: '2028-ADR', declarant: 'Maria Montoon', document: 'No Landholding', assignedStaff: 'Emilio', status: 'Pending', date: '7/17/2026' },
    { id: 'rt4', controlNo: '2029-ADR', declarant: 'Mister Bean', document: 'Tax Declaration', assignedStaff: 'Laurel', status: 'Approved', date: '7/20/2026' }
];

export const staffPerformanceMock: StaffPerformanceItem[] = [
    { id: 'sp1', initials: 'ML', name: 'Maria Lopez', requests: 148, avatarBg: '#E0F2FE' }, // Light Blue
    { id: 'sp2', initials: 'JC', name: 'John Cruz', requests: 100, avatarBg: '#FEF3C7' },  // Light Orange/Amber
    { id: 'sp3', initials: 'AR', name: 'Anne Reyes', requests: 88, avatarBg: '#FCE7F3' },   // Light Pink
    { id: 'sp4', initials: 'CG', name: 'Carlo Gomez', requests: 54, avatarBg: '#F3E8FF' }   // Light Purple
];

export const documentDistributionMock: DocumentDistributionSlice[] = [
    { id: 'dd1', label: 'Tax Declaration', percentage: 52, count: 108, color: '#252175' },     // Primary Brand (Deep Indigo)
    { id: 'dd2', label: 'Cert. of Landholding', percentage: 96, count: 210, color: '#FDD835' }, // Star Gold
    { id: 'dd3', label: 'Cert. of No Landholding', percentage: 25, count: 302, color: '#D32F2F' } // Crimson Red
];

export const totalDocumentsCount = 8984;

export const recentActivityMock: RecentActivityItem[] = [
    { id: 'ra1', title: 'Approved Staff Account', actor: 'Super Admin', time: '7:58 AM', type: 'approved' },
    { id: 'ra2', title: 'Pending Registration', actor: 'Super Admin', time: '10:58 AM', type: 'pending' },
    { id: 'ra3', title: 'Declined Registration Request', actor: 'Super Admin', time: '7:58 AM', type: 'declined' }
];
