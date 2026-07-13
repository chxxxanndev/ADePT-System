
import type {
    StatCardData,
    TransactionRow,
    WeeklyTrendPoint,
    DocumentDistributionSlice,
    QuickActionItem,
    NavSection,
    UserProfile,
} from '../types/dashboard';

export const currentUser: UserProfile = {
    name: 'Vicente Deosy',
    email: 'provincialassessor@gmail.com',
    role: 'Encoder / Staff',
    lastLogin: 'Today • 8:12 AM',
};

export const operationalSummary: StatCardData[] = [
    { id: 'total-requests', label: 'Total Requests', value: 130, sublabel: '+12% Yesterday', accent: 'teal', icon: 'requests', trend: 'up' },
    { id: 'released-today', label: 'Released Today', value: 29, sublabel: 'Successfully Issued', accent: 'gold', icon: 'released' },
    { id: 'monthly-issued', label: 'Monthly Issued Docs', value: 697, sublabel: 'Current month', accent: 'green', icon: 'issued' },
    { id: 'active-requests', label: 'Active Requests', value: 12, sublabel: 'Awaiting Completion', accent: 'red', icon: 'active' },
];

export const administrativeSummary: StatCardData[] = [
    { id: 'archived', label: 'Archived', value: 16, sublabel: 'Inactive Requests', accent: 'teal', icon: 'archived' },
    { id: 'voided', label: 'Voided', value: 4, sublabel: 'Amended records', accent: 'gold', icon: 'voided' },
    { id: 'reprinted', label: 'Reprinted', value: 7, sublabel: 'CTCs Issued', accent: 'green', icon: 'reprinted' },
    { id: 'cancelled', label: 'Cancelled', value: 2, sublabel: 'Processing discontinued', accent: 'red', icon: 'cancelled' },
];

export const weeklyTrend: WeeklyTrendPoint[] = [
    { label: 'Week 1', value: 98 },
    { label: 'Week 2', value: 145 },
    { label: 'Week 3', value: 112 },
    { label: 'Week 4', value: 182 },
    { label: 'Week 5', value: 160 },
];

export const documentDistribution: DocumentDistributionSlice[] = [
    { label: 'Tax Declaration', count: 42, percentage: 20, color: 'primary' },
    { label: 'Certificate of Land Holding', count: 145, percentage: 70, color: 'gold' },
    { label: 'Certificate of No Landholding', count: 21, percentage: 10, color: 'red' },
];

export const totalDocuments = documentDistribution.reduce((sum, d) => sum + d.count, 0);

export const recentTransactions: TransactionRow[] = [
    { id: 't1', controlNumber: 'TD-000191', declarant: 'Jofel Ramos', document: 'Tax Declaration', status: 'Released', dateTime: '07/12/26, 10:45 AM' },
    { id: 't2', controlNumber: 'CLH-000089', declarant: 'Melissa Tan', document: 'Certificate of Land Holding', status: 'Cancelled', dateTime: '07/12/26, 10:32 AM' },
    { id: 't3', controlNumber: 'CNL-000062', declarant: 'Florie Amora', document: 'Certificate of No Landholding', status: 'Pending Verification', dateTime: '07/12/26, 08:56 AM' },
    { id: 't4', controlNumber: 'CTC-000065', declarant: 'Ana Chavez', document: 'Certified True Copy', status: 'Certified True Copy', dateTime: '07/12/26, 07:54 AM' },
    { id: 't5', controlNumber: 'CNL-000064', declarant: 'Sharla Uy', document: 'Tax Declaration', status: 'Voided', dateTime: '07/12/26, 07:41 AM' },
];

export const quickActions: QuickActionItem[] = [
    { id: 'qa-new', title: 'New Request', description: 'Start a new document request', icon: 'newRequest', view: 'new-request' },
    { id: 'qa-pending', title: 'Pending Processing', description: 'Continue requests awaiting completion', icon: 'pending', view: 'request-processing' },
    { id: 'qa-search', title: 'Search Transactions', description: 'Locate existing records', icon: 'search', view: 'transaction-registry' },
    { id: 'qa-archive', title: 'Archive Management', description: 'Restore archived requests', icon: 'archive', view: 'archive-management' },
    { id: 'qa-reports', title: 'Reports & Analytics', description: 'Generate reports and summaries', icon: 'reports', view: 'reports' },
];

export const navSections: NavSection[] = [
    {
        label: 'General',
        items: [
            { label: 'Dashboard', icon: 'dashboard', view: 'dashboard' },
            { label: 'Request Form Entry', icon: 'newRequest', view: 'new-request' },
        ],
    },
    {
        label: 'Requests',
        items: [
            {
                label: 'Document Request',
                icon: 'requestProcessing',
                subItems: [
                    { label: 'Tax Declaration', view: 'tax-declaration' },
                    { label: 'Certificate of Land Holding', view: 'certificate-land-holding' },
                    { label: 'Certificate of No Landholding', view: 'certificate-no-landholding' },
                ],
            },
        ],
    },
    {
        label: 'Processing',
        items: [
            {
                label: 'Payment and Verification',
                icon: 'documentProcessing',
                subItems: [
                    { label: 'Pending Payment', badge: 12, view: 'pending-payment' },
                    { label: 'Pending Verification', badge: 4, view: 'pending-verification' },
                    { label: 'OR Validation', view: 'or-validation' },
                ],
            },
        ],
    },
    {
        label: 'Transactions',
        items: [
            {
                label: 'Transaction Management',
                icon: 'transactionManagement',
                subItems: [
                    { label: 'Transaction Registry', dotColor: 'green', view: 'transaction-registry' },
                    { label: 'Certified True Copy', dotColor: 'blue', view: 'certified-true-copy' },
                    { label: 'Void & Amend', dotColor: 'red', view: 'void-amend' },
                    { label: 'Archive Management', dotColor: 'purple', view: 'archive-management' },
                ],
            },
        ],
    },
    {
        label: 'Reports',
        items: [{ label: 'Reports & Analytics', icon: 'reports', view: 'reports' }],
    },
    {
        label: 'Other',
        items: [
            { label: 'Settings', icon: 'settings', view: 'settings' },
        ],
    },
];