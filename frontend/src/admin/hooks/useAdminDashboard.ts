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
// 3. Realtime client for the live account-request badge
import { supabase } from '../../lib/supabaseClient';

const REFRESH_DELAY_MS = 700;

interface AccountRequestSummary {
    id: string;
    status: 'approved' | 'declined' | 'pending';
    submitted?: string;
    created_at?: string;
    applicantName?: string;
}

function isSameDay(value: string | undefined, reference: Date) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === reference.getFullYear()
        && date.getMonth() === reference.getMonth()
        && date.getDate() === reference.getDate();
}

function staffDisplayName(member: StaffMember): string {
    return `${member.first_name} ${member.last_name}`.trim() || member.username || 'Unknown';
}

function buildAccessRequestItems(staff: StaffMember[], requests: AccountRequestSummary[]): AdminStatItem[] {
    const today = new Date();
    const activeAccounts = staff.filter((member) => member.account_status === 'ACTIVE');
    const pendingRegistration = requests.filter((request) => request.status === 'pending');
    const approvedToday = requests.filter((request) => request.status === 'approved' && isSameDay(request.submitted || request.created_at, today));
    const declinedToday = requests.filter((request) => request.status === 'declined' && isSameDay(request.submitted || request.created_at, today));

    return [
        { id: 'active-accounts', label: 'Active Accounts', value: activeAccounts.length, icon: 'user', accent: 'teal', details: activeAccounts.map(staffDisplayName) },
        { id: 'pending-registration', label: 'Pending Registration', value: pendingRegistration.length, icon: 'alert', accent: 'gold', details: pendingRegistration.map((r) => r.applicantName || 'Unknown') },
        { id: 'approved-today', label: 'Approved Today', value: approvedToday.length, icon: 'check', accent: 'green', details: approvedToday.map((r) => r.applicantName || 'Unknown') },
        { id: 'declined-today', label: 'Declined Today', value: declinedToday.length, icon: 'close', accent: 'red', details: declinedToday.map((r) => r.applicantName || 'Unknown') },
    ];
}

interface RequestQueueSummary {
    requestedTodayCount: number;
    processingCount: number;
    releasedCount: number;
    voidCount: number;
}

interface RegistryTransaction {
    id: string;
    referenceNumber?: string;
    client?: { declarantName?: string; requestedBy?: string };
    status?: string;
    dateRequested?: string;
}

const PENDING_LIKE_STATUSES = new Set(['Pending', 'Processing', 'Payment Verified']);

function declarantOf(t: RegistryTransaction): string {
    return t.client?.declarantName || 'Unknown Declarant';
}

// Picks the label for the first queue card based on the selected range:
// a single-day range gets "Request That Day" (or "Request Today" if that
// day is today); multi-day ranges get "Requests In Range".
function requestCardLabel(range: { from: string; to: string }): string {
    if (range.from === range.to) {
        const now = new Date();
        const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return range.from === todayISO ? 'Request Today' : 'Request That Day';
    }
    return 'Requests In Range';
}

function buildRequestQueueItems(
    summary: RequestQueueSummary,
    range: { from: string; to: string },
    transactions: RegistryTransaction[]
): AdminStatItem[] {
    const inRange = transactions.filter((t) => {
        const day = (t.dateRequested || '').slice(0, 10);
        return day >= range.from && day <= range.to;
    });
    const processing = inRange.filter((t) => PENDING_LIKE_STATUSES.has(t.status || ''));
    const approved = inRange.filter((t) => t.status === 'Released');
    const voided = inRange.filter((t) => t.status === 'Void' || t.status === 'Cancelled');

    return [
        { id: 'request-today', label: requestCardLabel(range), value: summary.requestedTodayCount, icon: 'inboxDown', accent: 'teal', details: inRange.map(declarantOf) },
        { id: 'processing', label: 'Processing', value: summary.processingCount, icon: 'gears', accent: 'gold', details: processing.map(declarantOf) },
        { id: 'approved-documents', label: 'Approved Documents', value: summary.releasedCount, icon: 'check', accent: 'green', details: approved.map(declarantOf) },
        { id: 'void-documents', label: 'Void Documents', value: summary.voidCount, icon: 'close', accent: 'red', details: voided.map(declarantOf) },
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
    const [dateFilter, setDateFilter] = useState('Today');

    // Number of pending account requests — drives the sidebar badge on
    // the "Account Request" item so the admin sees new signups at a glance.
    const [pendingRequestCount, setPendingRequestCount] = useState(0);

    // Inclusive [from, to] YYYY-MM-DD range driving the dashboard queries.
    // Defaults to today so the initial load already respects the selector.
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return { from: `${y}-${m}-${day}`, to: `${y}-${m}-${day}` };
    });

    const [accessRequests, setAccessRequests] = useState<AdminStatItem[]>([]);
    const [requestQueue, setRequestQueue] = useState<AdminStatItem[]>([]);
    const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceItem[]>([]);
    const [allTimeStaffPerformance, setAllTimeStaffPerformance] = useState<StaffPerformanceItem[]>([]);
    const [activities, setActivities] = useState<AdminActivityItem[]>([]);

    const [refreshingTransactions, setRefreshingTransactions] = useState(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState(false);
    const [refreshingQueue, setRefreshingQueue] = useState(false);

    const loadDashboardData = async (rangeOverride?: { from: string; to: string }) => {
        try {
            const range = rangeOverride ?? dateRange;
            const [metrics, recent, performance, registryRes] = await Promise.all([
                fetchDashboardMetrics(range.from, range.to).catch(() => ({})),
                fetchRecentTransactions(5, range.from, range.to).catch(() => []),
                fetchStaffPerformance(range.from, range.to).catch(() => []),
                api.get('/requests/registry').catch(() => ({ data: { transactions: [] } })),
            ]);
            const registryTransactions: RegistryTransaction[] = registryRes?.data?.transactions ?? [];
            if (metrics.summaryCounts) {
                setRequestQueue(buildRequestQueueItems({
                    requestedTodayCount: metrics.summaryCounts.requestedTodayCount ?? 0,
                    processingCount: metrics.summaryCounts.processingCount ?? 0,
                    releasedCount: metrics.summaryCounts.releasedCount ?? 0,
                    voidCount: metrics.summaryCounts.voidCount ?? 0,
                }, range, registryTransactions));
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
            if ((performance as StaffPerformanceItem[]).length > 0) setStaffPerformance(performance as StaffPerformanceItem[]);
        } catch {
            /* silently keep current state */
        }
    };

    /**
     * UPDATED: Uses 'api' instance with graceful fallback for session state / auth 401 errors.
     */
    const loadAccessRequestMetrics = async () => {
        try {
            const [staffMembers, requestResponse] = await Promise.all([
                fetchAllStaff().catch(() => []),
                api.get('/users/account-requests').catch(() => ({ data: { requests: [] } }))
            ]);

            const requests = (requestResponse.data?.requests || []) as AccountRequestSummary[];
            setPendingRequestCount(requests.filter((request) => request.status === 'pending').length);
            setAccessRequests(buildAccessRequestItems(staffMembers, requests));
        } catch {
            /* silently keep current state */
        }
    };

    useEffect(() => {
        // Wait for the Supabase session to be available before firing API
        // calls so the auth interceptor always has a token to attach.
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.access_token) {
                void loadAccessRequestMetrics();
                void loadDashboardData();
            } else {
                // Session not ready yet — subscribe to the next auth state
                // change (SIGNED_IN / TOKEN_REFRESHED) and load once it fires.
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        void loadAccessRequestMetrics();
                        void loadDashboardData();
                        subscription.unsubscribe();
                    }
                });
            }
        });
    }, []);

    // Keep the sidebar badge in sync when the admin approves/declines
    // requests on the Account Request page (it dispatches this event).
    useEffect(() => {
        const onStaffDirectoryUpdated = () => {
            void loadAccessRequestMetrics();
        };
        window.addEventListener('staff-directory:updated', onStaffDirectoryUpdated);
        return () => {
            window.removeEventListener('staff-directory:updated', onStaffDirectoryUpdated);
        };
    }, []);

    // Real-time badge: subscribes to INSERT/UPDATE changes on the staff
    // table so a new sign-up (or a decision made elsewhere) bumps the badge
    // instantly. A 30s poll acts as a fallback for projects that haven't
    // added the table to the supabase_realtime publication.
    useEffect(() => {
        let isMounted = true;
        const refresh = () => {
            if (isMounted) void loadAccessRequestMetrics();
        };
        const channel = supabase
            .channel('account-request-badge')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, refresh)
            .subscribe();
        const pollInterval = window.setInterval(refresh, 30000);
        return () => {
            isMounted = false;
            window.clearInterval(pollInterval);
            void supabase.removeChannel(channel);
        };
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
        const data = await fetchStaffPerformance(dateRange.from, dateRange.to);
        setStaffPerformance(data);
    });
    const refreshDistribution = () => withSpinner(setRefreshingDistribution, () => loadDashboardData());
    const refreshAccessRequests = () => withSpinner(setRefreshingAccessRequests, () => loadAccessRequestMetrics());
    const refreshQueue = () => withSpinner(setRefreshingQueue, () => loadDashboardData());

    // Applies a new dashboard period AND refetches the period-sensitive
    // widgets (queue summary, document distribution, recent transactions)
    // with the selected range. Access-request metrics are account-driven
    // (not request-date-driven), so they intentionally stay untouched.
    const applyDateFilter = (label: string, range: { from: string; to: string }) => {
        setDateFilter(label);
        setDateRange(range);
        void loadDashboardData(range);
    };

    // Initial staff performance load — scoped to today (matches the default dateRange)
    useEffect(() => {
        fetchStaffPerformance(dateRange.from, dateRange.to)
            .then(setStaffPerformance)
            .catch(() => {});
        // Also fetch all-time performance once for the "All Requests" toggle
        fetchStaffPerformance()
            .then(setAllTimeStaffPerformance)
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
        setDateFilter,
        dateRange,
        applyDateFilter,
        accessRequests,
        pendingRequestCount,
        requestQueue,
        transactions,
        distribution,
        staffPerformance,
        allTimeStaffPerformance,
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