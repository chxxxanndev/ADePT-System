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
        account_status: 'DISABLED',
        created_at: '2026-04-05T00:00:00Z',
        roles: { code: 'OFFICE_STAFF' },
    },
    {
        id: 'mock-3',
        first_name: 'Anne',
        last_name: 'Reyes',
        email: 'unnie@gmail.com',
        username: 'areyes',
        account_status: 'PENDING_APPROVAL',
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
     * Updates a staff member's account_status.
     * Handles three distinct transitions with different audit fields:
     *   - PENDING_APPROVAL -> ACTIVE   (approval: sets approved_by/approved_at)
     *   - PENDING_APPROVAL -> REJECTED (rejection)
     *   - ACTIVE           -> DISABLED (disabling: sets disabled_by/disabled_at/disable_reason)
     *   - DISABLED         -> ACTIVE   (reactivation: clears disable fields)
     *
     * @param {string} staffId
     * @param {'ACTIVE'|'DISABLED'|'REJECTED'} newStatus
     * @param {string} [disableReason]  Required when newStatus is 'DISABLED'.
     * @param {string} [actingStaffId]  staff.id of the admin performing the action.
     */
    async updateStaffStatus(staffId, newStatus, disableReason, actingStaffId) {
        if (!['ACTIVE', 'DISABLED', 'REJECTED'].includes(newStatus)) {
            throw new Error('Invalid status. Must be ACTIVE, DISABLED, or REJECTED.');
        }
        if (newStatus === 'DISABLED' && !disableReason) {
            throw new Error('A disable_reason is required when disabling a staff account.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.account_status = newStatus;
            return member;
        }

        // Look up current status first, since ACTIVE means something different
        // depending on where the account is coming from.
        const { data: current, error: fetchError } = await supabase
            .from('staff')
            .select('account_status')
            .eq('id', staffId)
            .is('deleted_at', null)
            .single();

        if (fetchError || !current) throw new Error('Staff member not found.');

        let updatePayload;

        if (newStatus === 'DISABLED') {
            updatePayload = {
                account_status: 'DISABLED',
                disable_reason: disableReason,
                disabled_at: new Date().toISOString(),
                disabled_by: actingStaffId,
            };
        } else if (newStatus === 'REJECTED') {
            if (current.account_status !== 'PENDING_APPROVAL') {
                throw new Error('Only pending applications can be rejected.');
            }
            updatePayload = {
                account_status: 'REJECTED',
            };
        } else {
            // newStatus === 'ACTIVE'
            if (current.account_status === 'PENDING_APPROVAL') {
                updatePayload = {
                    account_status: 'ACTIVE',
                    approved_by: actingStaffId,
                    approved_at: new Date().toISOString(),
                };
            } else {
                updatePayload = {
                    account_status: 'ACTIVE',
                    disable_reason: null,
                    disabled_at: null,
                    disabled_by: null,
                };
            }
        }

        const { data, error } = await supabase
            .from('staff')
            .update(updatePayload)
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