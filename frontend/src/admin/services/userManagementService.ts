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
    roles: { code: string } | null;
}
// ─── API calls ────────────────────────────────────────────────────────────────
/**
 * Fetches all staff members from the backend.
 */
export async function fetchAllStaff(): Promise<StaffMember[]> {
    const res = await fetch(`${API_BASE_URL}/staff`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch staff (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember[];
}

export interface CreateStaffPayload {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    roleCode?: string;
}

export async function createStaffAccount(payload: CreateStaffPayload): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
 * @param status   'ACTIVE' or 'INACTIVE'.
 */
export async function updateStaffStatus(
    staffId: string,
    status: 'ACTIVE' | 'DISABLED',
    reason?: string
): Promise<StaffMember> {
    const res = await fetch(`${API_BASE_URL}/staff/${staffId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update staff status (${res.status})`);
    }
    const data = await res.json();
    return data.staff as StaffMember;
}