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
function authHeaders(extra: Record<string, string> = {}) {
    const token = localStorage.getItem('adept_token');
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
        headers: authHeaders(),
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: authHeaders(),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to demote Admin (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}