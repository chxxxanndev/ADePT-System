import { useCallback, useEffect, useState } from 'react';
import {
    fetchAllStaff,
    updateStaffStatus,
    type StaffMember,
} from '../services/userManagementService';
// ─── UI-facing shape ──────────────────────────────────────────────────────────
export interface StaffRow {
    id: string;
    name: string;
    username: string;
    role: string;
    email: string;
    status: 'active' | 'inactive' | 'pending';
    dateAdded: string;
    account_status: StaffMember['account_status'];
}
function formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
    });
}
function toRoleLabel(code: string | undefined): string {
    switch (code) {
        case 'SUPER_ADMIN':  return 'Super Admin';
        case 'OFFICE_STAFF': return 'Records Officer';
        default:             return code ?? 'Staff';
    }
}
function mapToRow(member: StaffMember): StaffRow {
    const statusMap: Record<StaffMember['account_status'], StaffRow['status']> = {
        ACTIVE:           'active',
        DISABLED:         'inactive',
        PENDING_APPROVAL: 'pending',
        REJECTED:         'inactive',
    };
     return {
        id:             member.id,
        name:           `${member.first_name} ${member.last_name}`,
        username:       member.username || '—',
        role:           toRoleLabel(member.roles?.code),
        email:          member.email,
        status:         statusMap[member.account_status] ?? 'inactive',
        dateAdded:      formatDate(member.created_at),
        account_status: member.account_status,
    };
}
// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useStaffAccounts() {
    const [staff, setStaff]               = useState<StaffRow[]>([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState<string | null>(null);
    const [searchQuery, setSearchQuery]   = useState('');
    const [updatingId, setUpdatingId]     = useState<string | null>(null);
    // ── Initial fetch ────────────────────────────────────────────────────────
    const loadStaff = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllStaff();
            setStaff(data.map(mapToRow));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load staff.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { loadStaff(); }, [loadStaff]);
    // ── Toggle active / inactive ─────────────────────────────────────────────
    const toggleStatus = useCallback(async (staffId: string) => {
        const member = staff.find((s) => s.id === staffId);
        if (!member) return;
    
        const nextStatus: 'ACTIVE' | 'DISABLED' =
         member.account_status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        setUpdatingId(staffId);
        try {
            const updated = await updateStaffStatus(
                staffId,
                nextStatus,
                nextStatus === 'DISABLED' ? 'Account disabled by administrator.' : undefined
            );
            setStaff((prev) =>
                prev.map((s) => (s.id === staffId ? mapToRow(updated) : s))
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    }, [staff]);
    // ── Derived: filtered list ───────────────────────────────────────────────
    const filteredStaff = staff.filter((member) => {
        const q = searchQuery.toLowerCase();
        return (
            !q ||
            member.name.toLowerCase().includes(q) ||
            member.username.toLowerCase().includes(q) ||
            member.email.toLowerCase().includes(q) ||
            member.role.toLowerCase().includes(q)
        );
    });
    return {
        staff: filteredStaff,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        toggleStatus,
        updatingId,
        refresh: loadStaff,
    };
}