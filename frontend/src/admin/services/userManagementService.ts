import { api } from '../../users/services/requestService';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffMember {
    id: string;
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
 * Fetches staff performance metrics.
 */
export async function fetchStaffPerformance(): Promise<StaffPerformanceItem[]> {
    const res = await api.get('/users/staff-performance');
    return res.data.performance as StaffPerformanceItem[];
}

/**
 * Fetches real-time dashboard metrics (URL standardized)
 */
export async function fetchDashboardMetrics() {
    const res = await api.get('/requests/dashboard-metrics');
    return res.data;
}

/**
 * Fetches and maps recent transactions. Logic exactly as original.
 */
export async function fetchRecentTransactions(limit = 5): Promise<any[]> {
    const res = await api.get('/requests/registry');
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
 * Fetches real-time reports & analytics (URL standardized)
 */
export async function fetchReportsAnalytics() {
    const res = await api.get('/requests/reports-data');
    return res.data;
}