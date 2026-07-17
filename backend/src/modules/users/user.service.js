import { supabase, useMock } from '../../config/supabase.js';
// ─── Mock fallback ────────────────────────────────────────────────────────────
const MOCK_STAFF = [
    {
        id: 'mock-1',
        first_name: 'Maria',
        last_name: 'Lopez',
        email: 'mary@gmail.com',
        username: 'mlopez',
        account_status: 'ACTIVE',
        created_at: '2026-07-11T00:00:00Z',
        roles: { code: 'OFFICE_STAFF' },
    },
    {
        id: 'mock-2',
        first_name: 'John',
        last_name: 'Cruz',
        email: 'johnny@gmail.com',
        username: 'jcruz',
        account_status: 'INACTIVE',
        created_at: '2026-04-05T00:00:00Z',
        roles: { code: 'OFFICE_STAFF' },
    },
    {
        id: 'mock-3',
        first_name: 'Anne',
        last_name: 'Reyes',
        email: 'unnie@gmail.com',
        username: 'areyes',
        account_status: 'INACTIVE',
        created_at: '2026-07-15T00:00:00Z',
        roles: { code: 'OFFICE_STAFF' },
    },
    {
        id: 'mock-4',
        first_name: 'Carlo',
        last_name: 'Gomez',
        email: 'olrac@gmail.com',
        username: 'cgomez',
        account_status: 'ACTIVE',
        created_at: '2026-06-27T00:00:00Z',
        roles: { code: 'OFFICE_STAFF' },
    },
];
// ─── Service ──────────────────────────────────────────────────────────────────
class UserService {
    /**
     * Returns all staff members (excluding soft-deleted rows).
     * Falls back to MOCK_STAFF when Supabase is unavailable.
     */
    async getAllStaff() {
        if (useMock || !supabase) {
            return MOCK_STAFF;
        }
        const { data, error } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    }
    /**
     * Toggles a staff member's account_status between ACTIVE and INACTIVE.
     * @param {string} staffId  UUID from the staff table.
     * @param {'ACTIVE'|'INACTIVE'} newStatus
     */
    async updateStaffStatus(staffId, newStatus) {
        if (!['ACTIVE', 'INACTIVE'].includes(newStatus)) {
            throw new Error('Invalid status. Must be ACTIVE or INACTIVE.');
        }
        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.account_status = newStatus;
            return member;
        }
        const { data, error } = await supabase
            .from('staff')
            .update({ account_status: newStatus })
            .eq('id', staffId)
            .is('deleted_at', null)
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)')
            .single();
        if (error) throw error;
        if (!data) throw new Error('Staff member not found.');
        return data;
    }
}
export default new UserService();
