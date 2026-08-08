import { api } from '../../users/services/requestService';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffMember {
    id: string;
    auth_user_id: string;
    first_name: string;
    middle_initial: string | null;
    last_name: string;
    email: string;
    username: string;
    account_status: 'ACTIVE' | 'DISABLED' | 'PENDING_APPROVAL' | 'REJECTED';
    created_at: string;
    created_by: string | null;
    admin_level: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    is_signatory: boolean;
    position: string | null;
    suffix: string | null;
    roles: { code: string } | null;
}

export interface CreateStaffPayload {
    firstName: string;
    middleInitial?: string;
    lastName: string;
    suffix?: string;
    email: string;
    username: string;
    password: string;
    roleCode?: string;
    adminLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StaffPerformanceItem {
    id: string;
    name: string;
    initials: string;
    requests: number;
    avatarBg: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches all staff members from the backend.
 */
export async function fetchAllStaff(): Promise<StaffMember[]> {
    const res = await api.get('/users/staff');
    return res.data.staff as StaffMember[];
}

export async function createStaffAccount(payload: CreateStaffPayload): Promise<StaffMember> {
    const res = await api.post('/users/staff', payload);
    return res.data.staff as StaffMember;
}

/**
 * Toggles a staff member's account status.
 */
export async function updateStaffStatus(
    staffId: string,
    status: 'ACTIVE' | 'DISABLED',
    reason?: string
): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/status`, { status, reason });
    return res.data.staff as StaffMember;
}

/**
 * Sets an Admin's access level.
 */
export async function setAdminLevel(
    staffId: string,
    adminLevel: 'HIGH' | 'MEDIUM' | 'LOW'
): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/admin-level`, { adminLevel });
    return res.data.staff as StaffMember;
}

/**
 * Promotes an Office Staff member to Admin.
 */
export async function promoteToAdmin(
    staffId: string,
    adminLevel: 'HIGH' | 'MEDIUM' | 'LOW'
): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/promote-to-admin`, { adminLevel });
    return res.data.staff as StaffMember;
}

/**
 * Demotes an Admin back to Office Staff.
 */
export async function demoteToStaff(staffId: string): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/demote-to-staff`);
    return res.data.staff as StaffMember;
}

/**
 * Assigns this staff member as the sole signatory.
 */
export async function assignSignatory(staffId: string): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/assign-signatory`);
    return res.data.staff as StaffMember;
}

/**
 * Removes the signatory designation.
 */
export async function unassignSignatory(staffId: string): Promise<StaffMember> {
    const res = await api.patch(`/users/staff/${staffId}/unassign-signatory`);
    return res.data.staff as StaffMember;
}

/**
 * Sets a staff member's official position.
 */
export async function setStaffPosition(
    staffId: string,
    position: string
) {
    const res = await api.patch(`/users/staff/${staffId}/set-position`, { position });
    return res.data.staff;
}

/**
 * Fetches staff performance metrics.
 */
export async function fetchStaffPerformance(from?: string, to?: string): Promise<StaffPerformanceItem[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    const qs = params.toString();
    const res = await api.get(`/users/staff-performance${qs ? `?${qs}` : ''}`);
    return res.data.performance as StaffPerformanceItem[];
}

/**
 * Fetches active signatories from the signatories table.
 */
export async function fetchSignatories(): Promise<any[]> {
    const res = await api.get('/users/signatories');
    return res.data.signatories;
}

/**
 * Fetches real-time dashboard metrics (URL standardized).
 * Optional from/to (YYYY-MM-DD) restrict the data to a date range.
 */
export async function fetchDashboardMetrics(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = await api.get(`/requests/dashboard-metrics${qs ? `?${qs}` : ''}`);
    return res.data;
}

/**
 * Fetches and maps recent transactions. Logic exactly as original.
 * Optional from/to (YYYY-MM-DD) restrict the data to a date range.
 */
export async function fetchRecentTransactions(limit = 5, from?: string, to?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    const res = await api.get(`/requests/registry${qs ? `?${qs}` : ''}`);
    const data = res.data;
    
    const transactions = (data.transactions || []).slice(0, limit).map((t: any) => {
        let status: 'Approved' | 'Disapproved' | 'Pending' = 'Pending';
        if (t.status === 'Released') status = 'Approved';
        else if (t.status === 'Void' || t.status === 'Cancelled') status = 'Disapproved';
        
        return {
            id: t.id,
            controlNo: t.referenceNumber || `REF-${(t.id || '').slice(0, 6).toUpperCase()}`,
            declarant: t.client?.declarantName || t.client?.requestedBy || 'Anonymous',
            document: (t.requestedDocuments && t.requestedDocuments.length > 0)
                ? t.requestedDocuments
                    .map((d: any) =>
                        typeof d === 'string'
                            ? d
                            : (d.documentName || d.document_name || d.name || d.type || JSON.stringify(d))
                    )
                    .join(', ')
                : 'No-Landholding Certificate',
            assignedStaff: t.assignedStaff || 'Unassigned',
            status,
            date: t.dateRequested
                ? new Date(t.dateRequested).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                : 'Today',
        };
    });
    return transactions;
}

/**
 * Fetches real-time reports & analytics (URL standardized).
 * Optional from/to (YYYY-MM-DD) restrict row counts to a request-date range.
 */
export async function fetchReportsAnalytics(from?: string, to?: string) {
    const res = await api.get('/requests/reports-data', {
        params: { from, to },
    });
    return res.data;
}