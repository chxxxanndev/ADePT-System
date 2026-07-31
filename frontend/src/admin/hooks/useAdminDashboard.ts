import { useEffect, useState } from 'react';
import {
    type AdminStatItem,
    type AdminTransactionRow,
    type AdminActivityItem,
} from '../data/adminTypes';
// 1. Cleaned up imports - removed authHeaders
import { 
    fetchAllStaff, 
    fetchStaffPerformance, 
    fetchDashboardMetrics, 
    fetchRecentTransactions, 
    type StaffMember, 
    type StaffPerformanceItem 
} from '../services/userManagementService';
import { getAuditLog, type AuditLogEntry, type AuditActionType } from '../services/auditLogService';
// 2. Import our smart api instance
import { api } from '../../users/services/requestService';

const REFRESH_DELAY_MS = 700;

interface AccountRequestSummary {
    id: string;
    status: 'approved' | 'declined' | 'pending';
    submitted?: string;
    created_at?: string;
}

// ... (keep isSameDay, buildAccessRequestItems, buildRequestQueueItems exactly as they are)
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

interface RequestQueueSummary {
    requestedTodayCount: number;
    processingCount: number;
    releasedCount: number;
    voidCount: number;
}

function buildRequestQueueItems(summary: RequestQueueSummary): AdminStatItem[] {
    return [
        { id: 'request-today', label: 'Request Today', value: summary.requestedTodayCount, icon: 'inboxDown', accent: 'teal' },
        { id: 'processing', label: 'Processing', value: summary.processingCount, icon: 'gears', accent: 'gold' },
        { id: 'approved-documents', label: 'Approved Documents', value: summary.releasedCount, icon: 'check', accent: 'green' },
        { id: 'disapproved-documents', label: 'Disapproved Documents', value: summary.voidCount, icon: 'close', accent: 'red' },
    ];
}

const AUDIT_STATUS_MAP: Record<AuditActionType, AdminActivityItem['status']> = {
    approval: 'approved',
    decline: 'declined',
    system: 'system',
    login: 'login',
    logout: 'logout',
    document_upload: 'system',
    document_voided: 'declined',
    document_archived: 'system',
    document_released: 'approved',
    document_pending: 'pending',
    report_print: 'system',
    account_activate: 'approved',
    account_deactivate: 'declined',
    staff_promote: 'approved',
    staff_demote: 'declined',
};

function capitalize(text: string) {
    return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

function auditEntryToActivityItem(entry: AuditLogEntry): AdminActivityItem {
    return {
        id: entry.id,
        title: capitalize(entry.description),
        actor: entry.actor,
        time: `${entry.date}, ${entry.time}`,
        status: AUDIT_STATUS_MAP[entry.type],
    };
}

async function buildActivityFeed(): Promise<AdminActivityItem[]> {
    try {
        return (await getAuditLog()).map(auditEntryToActivityItem);
    } catch {
        return [];
    }
}

export function useAdminDashboard() {
    const [activeView, setActiveView] = useState<string>(
        () => sessionStorage.getItem('adept-admin-active-view') || 'overview'
    );
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        sessionStorage.setItem('adept-admin-active-view', activeView);
    }, [activeView]);

    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter] = useState('Today');

    const [accessRequests, setAccessRequests] = useState<AdminStatItem[]>([]);
    const [requestQueue, setRequestQueue] = useState<AdminStatItem[]>([]);
    const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceItem[]>([]);
    const [activities, setActivities] = useState<AdminActivityItem[]>([]);

    const [refreshingTransactions, setRefreshingTransactions] = useState(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState(false);
    const [refreshingQueue, setRefreshingQueue] = useState(false);

    const loadDashboardData = async () => {
        try {
            const [metrics, recent] = await Promise.all([
                fetchDashboardMetrics(),
                fetchRecentTransactions(),
            ]);
            if (metrics.summaryCounts) {
                setRequestQueue(buildRequestQueueItems({
                    requestedTodayCount: metrics.summaryCounts.requestedTodayCount ?? 0,
                    processingCount: metrics.summaryCounts.processingCount ?? 0,
                    releasedCount: metrics.summaryCounts.releasedCount ?? 0,
                    voidCount: metrics.summaryCounts.voidCount ?? 0,
                }));
            }
            if (metrics.distribution) {
                const normalized = metrics.distribution.map((d: any) => ({
                    label: d.label,
                    color: d.color,
                    count: d.count ?? d.value ?? 0,
                }));
                setDistribution(normalized);
            }
            if (recent.length > 0) setTransactions(recent);
        } catch {
            /* silently keep current state */
        }
    };

    /**
     * UPDATED: Now uses our 'api' instance. 
     * No more manual authHeaders, no more 401 glitches.
     */
    const loadAccessRequestMetrics = async () => {
        try {
            const [staffMembers, requestResponse] = await Promise.all([
                fetchAllStaff(),
                api.get('/users/account-requests') // Standardized call
            ]);

            const requests = (requestResponse.data.requests || []) as AccountRequestSummary[];
            setAccessRequests(buildAccessRequestItems(staffMembers, requests));
        } catch (err) {
            console.error("Dashboard error:", err);
        }
    };

    useEffect(() => {
        void loadAccessRequestMetrics();
        void loadDashboardData();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const refreshActivities = () => {
            void buildActivityFeed().then((feed) => {
                if (isMounted) setActivities(feed);
            });
        };
        refreshActivities();
        window.addEventListener('admin-audit-log:updated', refreshActivities);
        return () => {
            isMounted = false;
            window.removeEventListener('admin-audit-log:updated', refreshActivities);
        };
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

    const refreshTransactions = () => withSpinner(setRefreshingTransactions, () => loadDashboardData());
    const refreshPerformance = () => withSpinner(setRefreshingPerformance, async () => {
        const data = await fetchStaffPerformance();
        setStaffPerformance(data);
    });
    const refreshDistribution = () => withSpinner(setRefreshingDistribution, () => loadDashboardData());
    const refreshAccessRequests = () => withSpinner(setRefreshingAccessRequests, () => loadAccessRequestMetrics());
    const refreshQueue = () => withSpinner(setRefreshingQueue, () => loadDashboardData());

    useEffect(() => {
        fetchStaffPerformance()
            .then(setStaffPerformance)
            .catch(() => {});
    }, []);

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
        accessRequests,
        requestQueue,
        transactions,
        distribution,
        staffPerformance,
        activities,
        refreshingTransactions,
        refreshingPerformance,
        refreshingDistribution,
        refreshingAccessRequests,
        refreshingQueue,
        refreshTransactions,
        refreshPerformance,
        refreshDistribution,
        refreshAccessRequests,
        refreshQueue,
    };
}