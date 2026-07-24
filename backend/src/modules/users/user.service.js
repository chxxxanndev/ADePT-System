import { supabase, useMock } from '../../config/supabase.js';
import { validatePassword } from '../../utils/validators.js';

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
        account_status: 'DISABLED',
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
const isRejectedRequest = (member) => {
    const reason = member?.disable_reason || '';
    return member?.account_status === 'REJECTED' || (member?.account_status === 'DISABLED' && /rejected/i.test(reason));
};

// ─── Service ──────────────────────────────────────────────────────────────────
class UserService {
    /**
     * Returns all staff members (excluding soft-deleted rows).
     * Falls back to MOCK_STAFF when Supabase is unavailable.
     */
    async getAllStaff() {
        if (useMock || !supabase) {
            return MOCK_STAFF.filter((member) => member.account_status !== 'PENDING_APPROVAL');
        }
        const { data, error } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)')
            .is('deleted_at', null)
            .neq('account_status', 'PENDING_APPROVAL')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    }

    async getAccountRequests() {
        const toRequestView = (member) => {
            if (member.account_status === 'ACTIVE') {
                return {
                    id: member.id,
                    applicantName: `${member.first_name} ${member.last_name}`,
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    status: 'approved',
                };
            }

            if (isRejectedRequest(member)) {
                return {
                    id: member.id,
                    applicantName: `${member.first_name} ${member.last_name}`,
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    status: 'declined',
                };
            }

            if (member.account_status === 'PENDING_APPROVAL') {
                return {
                    id: member.id,
                    applicantName: `${member.first_name} ${member.last_name}`,
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    status: 'pending',
                };
            }

            return null;
        };

        if (useMock || !supabase) {
            return MOCK_STAFF
                .filter((member) => member.account_status === 'PENDING_APPROVAL' || member.account_status === 'ACTIVE' || member.account_status === 'DISABLED' || member.account_status === 'REJECTED')
                .map(toRequestView)
                .filter(Boolean);
        }

        const { data, error } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code), disable_reason')
            .in('account_status', ['PENDING_APPROVAL', 'ACTIVE', 'DISABLED', 'REJECTED'])
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data ?? []).map(toRequestView).filter(Boolean);
    }

    async decideAccountRequest(requestId, decision, reason) {
        const normalizedDecision = decision === 'approved' ? 'ACTIVE' : 'REJECTED';
        const normalizedReason = decision === 'approved' ? null : (reason?.trim() || 'Account request rejected by administrator.');

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === requestId);
            if (!member) throw new Error('Account request not found.');
            if (member.account_status !== 'PENDING_APPROVAL') {
                throw new Error('Only pending requests can be reviewed.');
            }
            member.account_status = normalizedDecision;
            member.disable_reason = normalizedReason;
            return {
                id: member.id,
                applicantName: `${member.first_name} ${member.last_name}`,
                email: member.email,
                username: member.username,
                requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                status: decision,
            };
        }

        const { data, error } = await supabase
            .from('staff')
            .update({
                account_status: normalizedDecision,
                disable_reason: normalizedReason,
            })
            .eq('id', requestId)
            .eq('account_status', 'PENDING_APPROVAL')
            .is('deleted_at', null)
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)');

        if (error) throw error;
        const updatedMember = Array.isArray(data) ? data[0] : data;
        if (!updatedMember) throw new Error('Account request not found.');
        return {
            id: updatedMember.id,
            applicantName: `${updatedMember.first_name} ${updatedMember.last_name}`,
            email: updatedMember.email,
            username: updatedMember.username,
            requestedRole: updatedMember.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
            status: decision,
        };
    }

    async createStaff({ firstName, lastName, email, username, password, roleCode = 'OFFICE_STAFF' }) {
        if (!validatePassword(password)) {
            throw new Error('Password must be at least 6 characters long.');
        }

        if (useMock || !supabase) {
            const existing = MOCK_STAFF.find((s) => s.email === email || s.username === username);
            if (existing) {
                throw new Error('A staff account with that email or username already exists.');
            }

            const created = {
                id: `mock-${Date.now()}`,
                first_name: firstName,
                last_name: lastName,
                email,
                username,
                account_status: 'ACTIVE',
                created_at: new Date().toISOString(),
                roles: { code: roleCode },
            };
            MOCK_STAFF.unshift(created);
            return created;
        }

        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('code', roleCode)
            .single();

        if (roleError || !roleData) {
            throw new Error('Selected role was not found.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    display_username: username,
                },
            },
        });

        if (authError || !authData?.user?.id) {
            throw new Error(authError?.message || 'Unable to create authentication account.');
        }

        const { data, error } = await supabase
            .from('staff')
            .insert([{
                auth_user_id: authData.user.id,
                first_name: firstName,
                last_name: lastName,
                email,
                username,
                role_id: roleData.id,
                account_status: 'ACTIVE',
            }])
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }
    /**
     * Toggles a staff member's account_status between ACTIVE and INACTIVE.
     * @param {string} staffId  UUID from the staff table.
     * @param {'ACTIVE'|'INACTIVE'} newStatus
     */
    async updateStaffStatus(staffId, newStatus, reason) {
        if (!['ACTIVE', 'DISABLED'].includes(newStatus)) {
            throw new Error('Invalid status. Must be ACTIVE or DISABLED.');
        }

        const normalizedReason = newStatus === 'DISABLED'
            ? (reason?.trim() || 'Account disabled by administrator.')
            : null;

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.account_status = newStatus;
            member.disable_reason = normalizedReason;
            return member;
        }
        const { data, error } = await supabase
            .from('staff')
            .update({
                account_status: newStatus,
                disable_reason: normalizedReason,
            })
            .eq('id', staffId)
            .is('deleted_at', null)
            .select('id, first_name, last_name, email, username, account_status, created_at, roles(code)');
        if (error) throw error;
        const updatedMember = Array.isArray(data) ? data[0] : data;
        if (!updatedMember) throw new Error('Staff member not found.');
        return updatedMember;
    }
}
export default new UserService();
