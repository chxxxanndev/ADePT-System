import { useEffect, useState } from 'react';
import {
    accessRequestsMock,
    requestQueueMock,
    transactionsMock,
    staffPerformanceMock,
    activitiesMock,
    type AdminStatItem,
} from '../data/dashboardMockData';
import { fetchAllStaff, type StaffMember } from '../services/userManagementService';

// Simulated network delay for refresh actions so the spinning state is visible.
const REFRESH_DELAY_MS = 700;
const API_BASE_URL = 'http://localhost:5000/api/users';

interface AccountRequestSummary {
    id: string;
    status: 'approved' | 'declined' | 'pending';
    submitted?: string;
    created_at?: string;
}

function isSameDay(value: string | undefined, reference: Date) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === reference.getFullYear()
        && date.getMonth() === reference.getMonth()
        && date.getDate() === reference.getDate();
}

function buildAccessRequestItems(staff: StaffMember[], requests: AccountRequestSummary[]): AdminStatItem[] {
    const today = new Date();
    const activeAccounts = staff.filter((member) => member.account_status === 'ACTIVE').length;
    const pendingRegistration = requests.filter((request) => request.status === 'pending').length;
    const approvedToday = requests.filter((request) => request.status === 'approved' && isSameDay(request.submitted || request.created_at, today)).length;
    const declinedToday = requests.filter((request) => request.status === 'declined' && isSameDay(request.submitted || request.created_at, today)).length;

    return [
        { id: 'active-accounts', label: 'Active Accounts', value: activeAccounts, icon: 'user', accent: 'teal' },
        { id: 'pending-registration', label: 'Pending Registration', value: pendingRegistration, icon: 'alert', accent: 'gold' },
        { id: 'approved-today', label: 'Approved Today', value: approvedToday, icon: 'check', accent: 'green' },
        { id: 'declined-today', label: 'Declined Today', value: declinedToday, icon: 'close', accent: 'red' },
    ];
}

export function useAdminDashboard() {
    // Navigation / layout state
    const [activeView, setActiveView] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Header controls
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter] = useState('Today');

    // Data states
    const [accessRequests, setAccessRequests] = useState<AdminStatItem[]>(accessRequestsMock);
    const [requestQueue] = useState(requestQueueMock);
    const [transactions] = useState(transactionsMock);
    const [staffPerformance] = useState(staffPerformanceMock);
    const [activities] = useState(activitiesMock);

    // Per-section refresh indicators
    const [refreshingTransactions, setRefreshingTransactions] = useState(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState(false);
    const [refreshingQueue, setRefreshingQueue] = useState(false);

    const loadAccessRequestMetrics = async () => {
        try {
            const [staffMembers, requestResponse] = await Promise.all([
                fetchAllStaff(),
                fetch(`${API_BASE_URL}/account-requests`),
            ]);

            if (!requestResponse.ok) {
                throw new Error('Unable to load access request metrics.');
            }

            const requestPayload = await requestResponse.json();
            const requests = (requestPayload.requests || []) as AccountRequestSummary[];
            setAccessRequests(buildAccessRequestItems(staffMembers, requests));
        } catch {
            setAccessRequests(accessRequestsMock);
        }
    };

    useEffect(() => {
        void loadAccessRequestMetrics();
    }, []);

    const withSpinner = (
        setter: (value: boolean) => void,
        action?: () => void | Promise<void>
    ) => {
        setter(true);
        window.setTimeout(() => {
            void Promise.resolve(action?.()).finally(() => setter(false));
        }, REFRESH_DELAY_MS);
    };

    const refreshTransactions = () => withSpinner(setRefreshingTransactions);
    const refreshPerformance = () => withSpinner(setRefreshingPerformance);
    const refreshDistribution = () => withSpinner(setRefreshingDistribution);
    const refreshAccessRequests = () => withSpinner(setRefreshingAccessRequests, () => loadAccessRequestMetrics());
    const refreshQueue = () => withSpinner(setRefreshingQueue);

    return {
        activeView,
        setActiveView,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        searchQuery,
        setSearchQuery,
        dateFilter,

        // Data states
        accessRequests,
        requestQueue,
        transactions,
        staffPerformance,
        activities,

        // Refresh indicators
        refreshingTransactions,
        refreshingPerformance,
        refreshingDistribution,
        refreshingAccessRequests,
        refreshingQueue,

        // Handlers
        refreshTransactions,
        refreshPerformance,
        refreshDistribution,
        refreshAccessRequests,
        refreshQueue,
    };
}