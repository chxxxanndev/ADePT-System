import { apiFetch } from "../../lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffMember {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    account_status: "ACTIVE" | "DISABLED" | "PENDING_APPROVAL" | "REJECTED";
    created_at: string;
    roles: { code: string } | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches all staff members from the backend.
 */
export async function fetchAllStaff(): Promise<StaffMember[]> {
    const data = await apiFetch<{ staff: StaffMember[] }>("/api/users/staff");
    return data.staff;
}

/**
 * Updates a staff member's account status.
 * ACTIVE from PENDING_APPROVAL = approve.
 * REJECTED from PENDING_APPROVAL = decline.
 * DISABLED / ACTIVE otherwise = the existing enable/disable toggle.
 */
export async function updateStaffStatus(
    staffId: string,
    status: "ACTIVE" | "DISABLED" | "REJECTED",
    disableReason?: string
): Promise<StaffMember> {
    const data = await apiFetch<{ staff: StaffMember }>(
        `/api/users/staff/${staffId}/status`,
        {
            method: "PATCH",
            body: JSON.stringify({ status, ...(disableReason ? { disableReason } : {}) }),
        }
    );
    return data.staff;
}