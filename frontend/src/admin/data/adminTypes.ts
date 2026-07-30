export interface AdminStatItem {
    id: string;
    label: string;
    value: number | string;
    icon: 'user' | 'alert' | 'check' | 'close' | 'request' | 'gears' | 'inboxDown';
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
    status: 'approved' | 'pending' | 'declined' | 'login' | 'logout' | 'system';
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
