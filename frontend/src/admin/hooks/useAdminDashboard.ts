import { useEffect, useState } from 'react';
import {
    accessRequestsMock,
    requestQueueMock,
    transactionsMock,
    activitiesMock,
    type AdminStatItem,
    type AdminActivityItem,
} from '../data/dashboardMockData';
import { fetchAllStaff, authHeaders, fetchStaffPerformance, fetchDashboardMetrics, type StaffMember, type StaffPerformanceItem } from '../services/userManagementService';
import { getAuditLog, type AuditLogEntry, type AuditActionType } from '../services/auditLogService';

// Simulated network delay for refresh actions so the spinning state is visible.
const REFRESH_DELAY_MS = 700;
const API_BASE_URL = 'http://localhost:5000/api/users';

// The Overview widget always shows at least this many rows — real audit
// entries first, padded with mock entries only when real activity is thin.
const MIN_ACTIVITY_ITEMS = 5;

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

interface RequestQueueSummary {
    requestedTodayCount: number;
    processingCount: number;
    releasedCount: number;
    voidCount: number;
}

/**
 * Builds the 4 "Document Request Queue" summary cards from the aggregated
 * counts in getDashboardMetrics()'s summaryCounts field — NOT from the raw
 * `requestQueue` array (that's one row per request, meant for a detail
 * list/table, not these cards). Mirrors buildAccessRequestItems() above.
 */
function buildRequestQueueItems(summary: RequestQueueSummary): AdminStatItem[] {
    return [
        { id: 'request-today', label: 'Request Today', value: summary.requestedTodayCount, icon: 'inboxDown', accent: 'teal' },
        { id: 'processing', label: 'Processing', value: summary.processingCount, icon: 'gears', accent: 'gold' },
        { id: 'approved-documents', label: 'Approved Documents', value: summary.releasedCount, icon: 'check', accent: 'green' },
        { id: 'disapproved-documents', label: 'Disapproved Documents', value: summary.voidCount, icon: 'close', accent: 'red' },
    ];
}

// Audit entry types -> the widget's color-coded statuses. Only 6 status
// values exist (approved / declined / pending / login / logout / system),
// so the newer action types reuse whichever existing status reads closest —
// there's no dedicated status for "promoted" or "printed a report", for
// instance. account_activate/staff_promote reuse 'approved' (positive
// change); account_deactivate/staff_demote reuse 'declined' (negative
// change) — if the red "declined" styling reads as alarming for a routine
// demotion in the actual UI, switch it to 'system' (neutral) instead.
// report_print/document_draft/document_archive reuse 'system' (neutral,
// routine staff actions); document_void reuses 'declined'.
//
// FIXED: this used to reference document_upload/document_voided/
// document_archived/document_released, which don't exist in the finalized
// AuditActionType union (document_pending/document_void/document_draft/
// document_archive/report_print) — since this map is typed as
// Record<AuditActionType, ...>, the old version would fail to compile the
// moment auditLogService.ts's taxonomy update landed.
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

/**
 * Fetches real audit entries from the backend and pads with mock entries
 * only when real activity is thin, so the widget never looks empty. Real
 * entries always come first and are never displaced.
 *
 * Async because getAuditLog() is now a network call (audit_log now lives
 * in Postgres behind the Express backend, not localStorage) — previously
 * this was a synchronous localStorage read.
 */
async function buildActivityFeed(): Promise<AdminActivityItem[]> {
    let real: AdminActivityItem[] = [];
    try {
        real = (await getAuditLog()).map(auditEntryToActivityItem);
    } catch {
        // Network hiccup — fall through to mock padding below rather than
        // surfacing an error on the Overview widget, which is meant to be
        // a lightweight glance, not a source of truth.
    }
    if (real.length >= MIN_ACTIVITY_ITEMS) return real;
    const padding = activitiesMock.slice(0, MIN_ACTIVITY_ITEMS - real.length);
    return [...real, ...padding];
}

export function useAdminDashboard() {
    // Navigation / layout state
    const [activeView, setActiveView] = useState<string>(
        () => sessionStorage.getItem('adept-admin-active-view') || 'overview'
    );
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        sessionStorage.setItem('adept-admin-active-view', activeView);
    }, [activeView]);

    // Header controls
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter] = useState('Today');

    // Data states
    const [accessRequests, setAccessRequests] = useState<AdminStatItem[]>(accessRequestsMock);
    const [requestQueue, setRequestQueue] = useState<AdminStatItem[]>(requestQueueMock);
    const [transactions] = useState(transactionsMock);
    const [distribution, setDistribution] = useState<any[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceItem[]>([]);
    // Starts as mock data so the widget isn't empty on first paint; the
    // effect below replaces it with the real feed as soon as it loads.
    const [activities, setActivities] = useState<AdminActivityItem[]>(activitiesMock);

    // Per-section refresh indicators
    const [refreshingTransactions, setRefreshingTransactions] = useState(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState(false);
    const [refreshingQueue, setRefreshingQueue] = useState(false);

    const loadDashboardData = async () => {
        try {
            const data = await fetchDashboardMetrics();
            if (data.summaryCounts) {
                setRequestQueue(buildRequestQueueItems({
                    requestedTodayCount: data.summaryCounts.requestedTodayCount ?? 0,
                    processingCount: data.summaryCounts.processingCount ?? 0,
                    releasedCount: data.summaryCounts.releasedCount ?? 0,
                    voidCount: data.summaryCounts.voidCount ?? 0,
                }));
            }
            if (data.distribution) setDistribution(data.distribution);
        } catch {
            /* silently keep current queue state */
        }
    };

    const loadAccessRequestMetrics = async () => {
        try {
            const headers = await authHeaders();
            if (!headers.Authorization) {
                // Not logged in – skip fetching protected data
                setAccessRequests(accessRequestsMock);
                return;
            }
            const [staffMembers, requestResponse] = await Promise.all([
                fetchAllStaff(),
                fetch(`${API_BASE_URL}/account-requests`, { headers }),
            ]);

            if (requestResponse.status === 401) {
                setAccessRequests(accessRequestsMock);
                return;
            }

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
        void loadDashboardData();
    }, []);

    // Load the real activity feed on mount, and keep it live — refresh the
    // instant a new audit entry is written anywhere in the app (logins,
    // approvals, declines, etc.) via the shared 'admin-audit-log:updated'
    // event that auditLogService.ts dispatches after every successful write.
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

    const refreshTransactions = () => withSpinner(setRefreshingTransactions, async () => {
        await loadDashboardData();
    });
    const refreshPerformance = () => withSpinner(setRefreshingPerformance, async () => {
        const data = await fetchStaffPerformance();
        setStaffPerformance(data);
    });
    const refreshDistribution = () => withSpinner(setRefreshingDistribution, async () => {
        await loadDashboardData();
    });
    const refreshAccessRequests = () => withSpinner(setRefreshingAccessRequests, () => loadAccessRequestMetrics());
    const refreshQueue = () => withSpinner(setRefreshingQueue, async () => {
        await loadDashboardData();
    });

    // Load real staff performance data on mount
    useEffect(() => {
        fetchStaffPerformance()
            .then(setStaffPerformance)
            .catch(() => { /* silently ignore — will show empty */ });
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

        // Data states
        accessRequests,
        requestQueue,
        transactions,
        distribution,
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