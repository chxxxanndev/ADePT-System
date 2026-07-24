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
        created_by: null,
        admin_level: null,
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
        created_by: null,
        admin_level: null,
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
        created_by: null,
        admin_level: null,
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
        created_by: null,
        admin_level: null,
        roles: { code: 'OFFICE_STAFF' },
    },
];

const isRejectedRequest = (member) => {
    const reason = member?.disable_reason || '';
    return member?.account_status === 'REJECTED' || (member?.account_status === 'DISABLED' && /rejected/i.test(reason));
};

const LEVEL_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function hasAdminLevel(actingStaff, minLevel) {
    if (actingStaff.roleCode === 'SUPER_ADMIN') return true;
    if (actingStaff.roleCode !== 'ADMIN') return false;
    if (!actingStaff.adminLevel) return false;
    return LEVEL_RANK[actingStaff.adminLevel] >= LEVEL_RANK[minLevel];
}

// ─── Service ──────────────────────────────────────────────────────────────────
class UserService {
    /**
     * Resolves the acting user's staff row (id, roleCode, adminLevel) from
     * their Supabase auth_user_id. Every permission-gated method needs this
     * to know who's calling and what they're allowed to do.
     */
    async getActingStaff(authUserId) {
        if (useMock || !supabase) {
            // In mock mode, treat the first mock user as a Super Admin caller.
            return { id: 'mock-actor', roleCode: 'SUPER_ADMIN', adminLevel: null };
        }

        const { data, error } = await supabase
            .from('staff')
            .select('id, admin_level, roles(code)')
            .eq('auth_user_id', authUserId)
            .single();

        if (error || !data) throw new Error('Unable to resolve the acting user.');

        return {
            id: data.id,
            roleCode: data.roles?.code,
            adminLevel: data.admin_level,
        };
    }

    async getAllStaff() {
        if (useMock || !supabase) {
            return MOCK_STAFF.filter((member) => member.account_status !== 'PENDING_APPROVAL');
        }
        const { data, error } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
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

    /**
     * Approving/declining a self-registered sign-up request.
     * Permission: SUPER_ADMIN, or ADMIN with adminLevel === 'HIGH'.
     */
    async decideAccountRequest(requestId, decision, reason, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'HIGH')) {
            throw new Error('Your admin access level does not permit approving account requests.');
        }

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

    /**
     * Creating a staff account via the "Add Staff" modal.
     * Permission: SUPER_ADMIN, ADMIN with adminLevel HIGH or MEDIUM.
     * LOW-mode admins cannot create staff.
     */
    async createStaff({ firstName, lastName, email, username, password, roleCode = 'OFFICE_STAFF' }, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'MEDIUM')) {
            throw new Error('Your admin access level does not permit creating staff accounts.');
        }

        // Only Super Admin may create ADMIN or SUPER_ADMIN accounts
        if ((roleCode === 'ADMIN' || roleCode === 'SUPER_ADMIN') && actingStaff.roleCode !== 'SUPER_ADMIN') {
            throw new Error('Only the Super Admin can create Admin accounts.');
        }

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
                created_by: actingStaff.id,
                admin_level: roleCode === 'ADMIN' ? 'LOW' : null,
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
                created_by: actingStaff.id,
                admin_level: roleCode === 'ADMIN' ? 'LOW' : null, // default new admins to LOW; Super Admin can raise it later
            }])
            .select('id, first_name, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Toggles a staff member's account_status between ACTIVE and DISABLED.
     * Permission rules:
     *  - Target is ADMIN or SUPER_ADMIN → only SUPER_ADMIN may act.
     *  - Target is OFFICE_STAFF:
     *      - SUPER_ADMIN or ADMIN(HIGH) → unrestricted.
     *      - ADMIN(MEDIUM) → only if they created this staff member.
     *      - ADMIN(LOW) → not permitted at all.
     */
    async updateStaffStatus(staffId, newStatus, reason, actingStaff) {
        if (!['ACTIVE', 'DISABLED'].includes(newStatus)) {
            throw new Error('Invalid status. Must be ACTIVE or DISABLED.');
        }

        const normalizedReason = newStatus === 'DISABLED'
            ? (reason?.trim() || 'Account disabled by administrator.')
            : null;

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');

            this._assertCanManageTarget(member, actingStaff);

            member.account_status = newStatus;
            member.disable_reason = normalizedReason;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, created_by, roles(code)')
            .eq('id', staffId)
            .is('deleted_at', null)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');

        this._assertCanManageTarget(target, actingStaff);

        const { data, error } = await supabase
            .from('staff')
            .update({
                account_status: newStatus,
                disable_reason: normalizedReason,
            })
            .eq('id', staffId)
            .is('deleted_at', null)
            .select('id, first_name, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)');
        if (error) throw error;
        const updatedMember = Array.isArray(data) ? data[0] : data;
        if (!updatedMember) throw new Error('Staff member not found.');
        return updatedMember;
    }

    /**
     * Shared permission check for status changes. Throws if not permitted.
     */
    _assertCanManageTarget(target, actingStaff) {
        const targetRole = target.roles?.code;

        if (targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN') {
            if (actingStaff.roleCode !== 'SUPER_ADMIN') {
                throw new Error('Only the Super Admin can manage Admin accounts.');
            }
            return;
        }

        // Target is regular staff
        if (actingStaff.roleCode === 'SUPER_ADMIN') return;

        if (actingStaff.roleCode === 'ADMIN') {
            if (actingStaff.adminLevel === 'LOW') {
                throw new Error('Your admin access level does not permit managing staff accounts.');
            }
            if (actingStaff.adminLevel === 'MEDIUM' && target.created_by !== actingStaff.id) {
                throw new Error('You can only manage staff accounts that you created.');
            }
            // HIGH: no extra restriction
            return;
        }

        throw new Error('You do not have permission to manage staff accounts.');
    }

    /**
     * Sets or changes an Admin's mode. Super Admin only.
     */
    async setAdminLevel(staffId, newLevel, actingStaff) {
        if (actingStaff.roleCode !== 'SUPER_ADMIN') {
            throw new Error('Only the Super Admin can change an Admin\'s access level.');
        }
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(newLevel)) {
            throw new Error('Invalid admin level. Must be HIGH, MEDIUM, or LOW.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'ADMIN') throw new Error('Admin level only applies to Admin accounts.');
            member.admin_level = newLevel;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code)')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'ADMIN') {
            throw new Error('Admin level only applies to Admin accounts.');
        }

        const { data, error } = await supabase
            .from('staff')
            .update({ admin_level: newLevel })
            .eq('id', staffId)
            .select('id, first_name, last_name, email, username, account_status, admin_level, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Promotes an existing OFFICE_STAFF member to ADMIN with an initial level.
     * Super Admin only.
     */
    async promoteToAdmin(staffId, adminLevel, actingStaff) {
        if (actingStaff.roleCode !== 'SUPER_ADMIN') {
            throw new Error('Only the Super Admin can promote staff to Admin.');
        }
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(adminLevel)) {
            throw new Error('Invalid admin level. Must be HIGH, MEDIUM, or LOW.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'OFFICE_STAFF') {
                throw new Error('Only Office Staff accounts can be promoted to Admin.');
            }
            member.roles = { code: 'ADMIN' };
            member.admin_level = adminLevel;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code)')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'OFFICE_STAFF') {
            throw new Error('Only Office Staff accounts can be promoted to Admin.');
        }

        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('code', 'ADMIN')
            .single();

        if (roleError || !roleData) {
            throw new Error('Admin role was not found. Make sure it exists in the roles table.');
        }

        const { data, error } = await supabase
            .from('staff')
            .update({
                role_id: roleData.id,
                admin_level: adminLevel,
            })
            .eq('id', staffId)
            .select('id, first_name, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Demotes an existing ADMIN back to OFFICE_STAFF, clearing their level.
     * Super Admin only.
     */
    async demoteToStaff(staffId, actingStaff) {
        if (actingStaff.roleCode !== 'SUPER_ADMIN') {
            throw new Error('Only the Super Admin can demote an Admin.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'ADMIN') {
                throw new Error('Only Admin accounts can be demoted.');
            }
            member.roles = { code: 'OFFICE_STAFF' };
            member.admin_level = null;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code)')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'ADMIN') {
            throw new Error('Only Admin accounts can be demoted.');
        }

        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('code', 'OFFICE_STAFF')
            .single();

        if (roleError || !roleData) {
            throw new Error('Office Staff role was not found.');
        }

        const { data, error } = await supabase
            .from('staff')
            .update({
                role_id: roleData.id,
                admin_level: null,
            })
            .eq('id', staffId)
            .select('id, first_name, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }
}
export default new UserService();