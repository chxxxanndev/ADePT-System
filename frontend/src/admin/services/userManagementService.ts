import { supabase } from '../../lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/users';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffMember {
    id: string;
    // Supabase Auth user id — required to match this staff row against the
    // Realtime Presence channel keyed by auth id (see useOnlinePresence.ts
    // and AdminAuditLog.tsx). Now returned by user.service.js's getAllStaff().
    auth_user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    account_status: 'ACTIVE' | 'DISABLED' | 'PENDING_APPROVAL' | 'REJECTED';
    created_at: string;
    created_by: string | null;
    admin_level: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    is_signatory: boolean;
    roles: { code: string } | null;
}

export interface CreateStaffPayload {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    roleCode?: string;
    adminLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Pulls the current access token straight from supabase-js's own session
// (kept fresh by its built-in autoRefreshToken) rather than a hand-rolled
// localStorage copy — see useAuth.ts for why that copy was removed.
export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? localStorage.getItem('adept_token');
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches all staff members from the backend.
 */
export async function fetchAllStaff(): Promise<StaffMember[]> {
    const res = await fetch(`${API_BASE_URL}/staff`, {
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch staff (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember[];
}

export async function createStaffAccount(payload: CreateStaffPayload): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create staff account (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Toggles a staff member's account status.
 * @param staffId  The staff row UUID.
 * @param status   'ACTIVE' or 'DISABLED'.
 */
export async function updateStaffStatus(
    staffId: string,
    status: 'ACTIVE' | 'DISABLED',
    reason?: string
): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/status`, {
        method: 'PATCH',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update staff status (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Sets an Admin's access level (HIGH / MEDIUM / LOW). Super Admin only —
 * the backend will reject this call if the caller isn't a Super Admin.
 * @param staffId    The staff row UUID (must have role ADMIN).
 * @param adminLevel The new level to assign.
 */
export async function setAdminLevel(
    staffId: string,
    adminLevel: 'HIGH' | 'MEDIUM' | 'LOW'
): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/admin-level`, {
        method: 'PATCH',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ adminLevel }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update admin level (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Promotes an Office Staff member to Admin with an initial level.
 * Super Admin only.
 */
export async function promoteToAdmin(
    staffId: string,
    adminLevel: 'HIGH' | 'MEDIUM' | 'LOW'
): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/promote-to-admin`, {
        method: 'PATCH',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ adminLevel }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to promote staff to Admin (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Demotes an Admin back to Office Staff. Super Admin only.
 */
export async function demoteToStaff(staffId: string): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/demote-to-staff`, {
        method: 'PATCH',
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to demote Admin (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Assigns this staff member as the sole signatory (replaces any previous one).
 * Requires SUPER_ADMIN or ADMIN(HIGH).
 */
export async function assignSignatory(staffId: string): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/assign-signatory`, {
        method: 'PATCH',
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to assign signatory (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

/**
 * Removes the signatory designation from this staff member.
 */
export async function unassignSignatory(staffId: string): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/unassign-signatory`, {
        method: 'PATCH',
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to remove signatory (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}

export interface StaffPerformanceItem {
    id: string;
    name: string;
    initials: string;
    requests: number;
    avatarBg: string;
}

export async function fetchStaffPerformance(): Promise<StaffPerformanceItem[]> {
    const res = await fetch(`${API_BASE_URL}/staff-performance`, {
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch staff performance (${res.status})`);
    }
    const data = await res.json();
    return data.performance as StaffPerformanceItem[];
}

/**
 * Fetches real-time dashboard metrics (access requests, request queue, distribution)
 * from the backend requests endpoint.
 */
export async function fetchDashboardMetrics() {
    const res = await fetch('http://localhost:5000/api/requests/dashboard-metrics', {
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch dashboard metrics (${res.status})`);
    }
    return res.json();
}

/**
 * Fetches recent transactions from the request registry for the dashboard widget.
 * Returns the most recent entries mapped to AdminTransactionRow format.
 */
export async function fetchRecentTransactions(limit = 5): Promise<any[]> {
    const res = await fetch('http://localhost:5000/api/requests/registry', {
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch recent transactions (${res.status})`);
    }
    const data = await res.json();
    const transactions = (data.transactions || []).slice(0, limit).map((t: any) => {
        let status: 'Approved' | 'Disapproved' | 'Pending' = 'Pending';
        if (t.status === 'Released') status = 'Approved';
        else if (t.status === 'Void' || t.status === 'Cancelled') status = 'Disapproved';
        return {
            id: t.id,
            controlNo: t.referenceNumber || `REF-${(t.id || '').slice(0, 6).toUpperCase()}`,
            declarant: t.client?.declarantName || t.client?.requestedBy || 'Anonymous',
            document: (t.requestedDocuments && t.requestedDocuments.length > 0)
                ? t.requestedDocuments.join(', ')
                : 'No-Landholding Certificate',
            assignedStaff: t.assignedStaff || 'Unassigned',
            status,
            date: t.dateRequested
                ? new Date(t.dateRequested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Today',
        };
    });
    return transactions;
}

/**
 * Fetches real-time reports & analytics data directly from the backend requests endpoint.
 */
export async function fetchReportsAnalytics() {
    const res = await fetch('http://localhost:5000/api/requests/reports-data', {
        headers: await authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch reports analytics (${res.status})`);
    }
    return res.json();
}