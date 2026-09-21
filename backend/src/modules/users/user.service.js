import { supabase, useMock } from '../../config/supabase.js';
import { validatePassword } from '../../utils/validators.js';

function composeFullName(firstName, middleInitial, lastName) {
    const mi = middleInitial ? middleInitial.replace(/\.$/, '') + '.' : '';
    return `${firstName} ${mi} ${lastName}`.replace(/\s+/g, ' ').trim();
}

function broadcastStaffRoleUpdate(staffId) {
    if (!supabase || useMock) return;
    const channel = supabase.channel('staff-role-updates');
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            channel
                .send({ type: 'broadcast', event: 'role-updated', payload: { staffId } })
                .finally(() => channel.unsubscribe());
        }
    });
}

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

const MOCK_SIGNATORIES = [
    { id: 1, name: 'ELVIRA T. ENAO, REA', position: 'Local Assessment Operations Officer IV', role: 'AUTHORIZED_REP', is_active: true },
    { id: 2, name: 'ENGR. VICENTE P. DESOY, REA', position: 'Provincial Assessor', role: 'ASSESSOR', is_active: true },
    { id: 3, name: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp', position: 'Assistant Provincial Assessor', role: 'ASST_ASSESSOR', is_active: true }
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

class UserService {

    async getActingStaff(authUserId) {
        if (useMock || !supabase) {
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
            .select('id, auth_user_id, first_name, last_name, suffix, email, username, account_status, created_at, created_by, admin_level, is_signatory, position, roles(code)')
            .is('deleted_at', null)
            .neq('account_status', 'PENDING_APPROVAL')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
    }

    async getAccountRequests() {
        const toRequestView = (member) => {
            const decidedAt = member.account_status !== 'PENDING_APPROVAL' ? member.updated_at : null;

            if (member.account_status === 'ACTIVE') {
                return {
                    id: member.id,
                    applicantName: composeFullName(member.first_name, member.middle_initial, member.last_name),
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    decided_at: decidedAt,
                    status: 'approved',
                };
            }

            if (isRejectedRequest(member)) {
                return {
                    id: member.id,
                    applicantName: composeFullName(member.first_name, member.middle_initial, member.last_name),
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    decided_at: decidedAt,
                    status: 'declined',
                };
            }

            if (member.account_status === 'PENDING_APPROVAL') {
                return {
                    id: member.id,
                    applicantName: composeFullName(member.first_name, member.middle_initial, member.last_name),
                    email: member.email,
                    username: member.username,
                    requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                    submitted: member.created_at,
                    decided_at: null,
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
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, updated_at, roles(code), disable_reason')
            .in('account_status', ['PENDING_APPROVAL', 'ACTIVE', 'DISABLED', 'REJECTED'])
            .is('deleted_at', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data ?? []).map(toRequestView).filter(Boolean);
    }

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
                applicantName: composeFullName(member.first_name, member.middle_initial, member.last_name),
                email: member.email,
                username: member.username,
                requestedRole: member.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
                status: decision,
            };
        }

        const decidedAtNow = new Date().toISOString();

        console.log('[decideAccountRequest] requestId:', JSON.stringify(requestId), 'length:', requestId?.length);

        const { data, error } = await supabase
            .from('staff')
            .update({
                account_status: normalizedDecision,
                disable_reason: normalizedReason,
                updated_at: decidedAtNow,
            })
            .eq('id', requestId)
            .eq('account_status', 'PENDING_APPROVAL')
            .is('deleted_at', null)
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, updated_at, roles(code)');

        console.log('[decideAccountRequest] update result — error:', error, 'data:', data);

        if (error) throw error;
        const updatedMember = Array.isArray(data) ? data[0] : data;
        if (!updatedMember) throw new Error('Account request not found.');
        return {
            id: updatedMember.id,
            applicantName: composeFullName(updatedMember.first_name, updatedMember.middle_initial, updatedMember.last_name),
            email: updatedMember.email,
            username: updatedMember.username,
            requestedRole: updatedMember.roles?.code === 'SUPER_ADMIN' ? 'Super Admin' : 'Office Staff',
            decided_at: updatedMember.updated_at || decidedAtNow,
            status: decision,
        };
    }

    async createStaff({ firstName, middleInitial, lastName, suffix, email, username, password, roleCode = 'OFFICE_STAFF', adminLevel }, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'MEDIUM')) {
            throw new Error('Your admin access level does not permit creating staff accounts.');
        }

        if (roleCode === 'SUPER_ADMIN') {
            throw new Error('Cannot create Super Admin accounts.');
        }

        if (roleCode === 'ADMIN' && actingStaff.roleCode !== 'SUPER_ADMIN' && actingStaff.adminLevel !== 'HIGH') {
            throw new Error('Your admin access level does not permit creating Admin accounts.');
        }

        if (roleCode === 'ADMIN' && adminLevel && !['HIGH', 'MEDIUM', 'LOW'].includes(adminLevel)) {
            throw new Error('Invalid admin level. Must be HIGH, MEDIUM, or LOW.');
        }

        if (!validatePassword(password)) {
            throw new Error('Password must be at least 6 characters long.');
        }

        const resolvedAdminLevel = roleCode === 'ADMIN' ? (adminLevel || 'LOW') : null;

        if (useMock || !supabase) {
            const existing = MOCK_STAFF.find((s) => s.email === email || s.username === username);
            if (existing) {
                throw new Error('A staff account with that email or username already exists.');
            }

            const created = {
                id: `mock-${Date.now()}`,
                first_name: firstName,
                middle_initial: middleInitial || null,
                last_name: lastName,
                suffix: suffix || null,
                email,
                username,
                account_status: 'ACTIVE',
                created_at: new Date().toISOString(),
                created_by: actingStaff.id,
                admin_level: resolvedAdminLevel,
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
                    middle_initial: middleInitial || null,
                    last_name: lastName,
                    suffix: suffix || null,
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
                middle_initial: middleInitial || null,
                last_name: lastName,
                suffix: suffix || null,
                email,
                username,
                role_id: roleData.id,
                account_status: 'ACTIVE',
                created_by: actingStaff.id,
                admin_level: resolvedAdminLevel,
            }])
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        return data;
    }

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
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)');
        if (error) throw error;
        const updatedMember = Array.isArray(data) ? data[0] : data;
        if (!updatedMember) throw new Error('Staff member not found.');
        return updatedMember;
    }

    _assertCanManageTarget(target, actingStaff) {
        const targetRole = target.roles?.code;

        if (targetRole === 'ADMIN' || targetRole === 'SUPER_ADMIN') {
            if (actingStaff.roleCode !== 'SUPER_ADMIN') {
                throw new Error('Only the Super Admin can manage Admin accounts.');
            }
            return;
        }

        if (actingStaff.roleCode === 'SUPER_ADMIN') return;

        if (actingStaff.roleCode === 'ADMIN') {
            if (actingStaff.adminLevel === 'LOW') {
                throw new Error('Your admin access level does not permit managing staff accounts.');
            }
            if (actingStaff.adminLevel === 'MEDIUM' && target.created_by !== actingStaff.id) {
                throw new Error('You can only manage staff accounts that you created.');
            }
            return;
        }

        throw new Error('You do not have permission to manage staff accounts.');
    }

    _assertCanManageAdminAccess(target, actingStaff) {
        if (actingStaff.roleCode === 'SUPER_ADMIN') return;

        if (actingStaff.roleCode !== 'ADMIN') {
            throw new Error('You do not have permission to manage admin access.');
        }

        if (actingStaff.adminLevel === 'LOW') {
            throw new Error('Your admin access level does not permit managing admin access.');
        }

        if (actingStaff.adminLevel === 'MEDIUM' && target.created_by !== actingStaff.id) {
            throw new Error('You can only manage admin access for staff accounts that you created.');
        }
    }

    async setAdminLevel(staffId, newLevel, actingStaff) {
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(newLevel)) {
            throw new Error('Invalid admin level. Must be HIGH, MEDIUM, or LOW.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'ADMIN') throw new Error('Admin level only applies to Admin accounts.');
            this._assertCanManageAdminAccess(member, actingStaff);
            member.admin_level = newLevel;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code), created_by')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'ADMIN') {
            throw new Error('Admin level only applies to Admin accounts.');
        }

        this._assertCanManageAdminAccess(target, actingStaff);

        const { data, error } = await supabase
            .from('staff')
            .update({ admin_level: newLevel })
            .eq('id', staffId)
            .select('id, first_name, middle_initial, last_name, email, username, account_status, admin_level, roles(code)')
            .single();

        if (error) throw error;
        broadcastStaffRoleUpdate(staffId);
        return data;
    }

    async promoteToAdmin(staffId, adminLevel, actingStaff) {
        if (!['HIGH', 'MEDIUM', 'LOW'].includes(adminLevel)) {
            throw new Error('Invalid admin level. Must be HIGH, MEDIUM, or LOW.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'OFFICE_STAFF') {
                throw new Error('Only Office Staff accounts can be promoted to Admin.');
            }
            this._assertCanManageAdminAccess(member, actingStaff);
            member.roles = { code: 'ADMIN' };
            member.admin_level = adminLevel;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code), created_by')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'OFFICE_STAFF') {
            throw new Error('Only Office Staff accounts can be promoted to Admin.');
        }

        this._assertCanManageAdminAccess(target, actingStaff);

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
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        broadcastStaffRoleUpdate(staffId);
        return data;
    }

    async demoteToStaff(staffId, actingStaff) {
        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            if (member.roles?.code !== 'ADMIN') {
                throw new Error('Only Admin accounts can be demoted.');
            }
            this._assertCanManageAdminAccess(member, actingStaff);
            member.roles = { code: 'OFFICE_STAFF' };
            member.admin_level = null;
            return member;
        }

        const { data: target, error: fetchError } = await supabase
            .from('staff')
            .select('id, roles(code), created_by')
            .eq('id', staffId)
            .single();

        if (fetchError || !target) throw new Error('Staff member not found.');
        if (target.roles?.code !== 'ADMIN') {
            throw new Error('Only Admin accounts can be demoted.');
        }

        this._assertCanManageAdminAccess(target, actingStaff);

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
            .select('id, first_name, middle_initial, last_name, email, username, account_status, created_at, created_by, admin_level, roles(code)')
            .single();

        if (error) throw error;
        broadcastStaffRoleUpdate(staffId);
        return data;
    }

    async setStaffPosition(staffId, position, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'HIGH')) {
            throw new Error('Your admin access level does not permit setting a staff position.');
        }

        const VALID_POSITIONS = [
            'Local Assessment Operations Officer IV',
            'Local Assessment Operations Officer III',
            'Local Assessment Operations Officer II',
            'Tax Mapper IV',
            'Tax Mapper III',
            'Tax Mapper II',
            'Tax Mapper I',
            'Provincial Assessor',
            'Assistant Provincial Assessor',
        ];

        if (!VALID_POSITIONS.includes(position)) {
            throw new Error('Invalid position.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.position = position;
            const fullName = composeFullName(member.first_name, member.middle_initial, member.last_name);
            const existing = MOCK_SIGNATORIES.find(s => s.name === fullName);
            if (existing) existing.position = position;
            return member;
        }

        const { data, error } = await supabase
            .from('staff')
            .update({ position })
            .eq('id', staffId)
            .select('id, first_name, middle_initial, last_name, suffix, email, username, account_status, created_at, created_by, admin_level, is_signatory, position, roles(code)')
            .single();

        if (error) throw error;

        if (data && data.is_signatory) {
            const fullName = composeFullName(data.first_name, data.middle_initial, data.last_name);
            await supabase
                .from('signatories')
                .update({ position })
                .eq('name', fullName);
        }

        return data;
    }

    async assignSignatory(staffId, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'HIGH')) {
            throw new Error('Your admin access level does not permit assigning the signatory.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.is_signatory = true;

            const fullName = composeFullName(member.first_name, member.middle_initial, member.last_name);
            const pos = member.position || 'Local Assessment Operations Officer IV';

            const existing = MOCK_SIGNATORIES.find(s => s.name === fullName);
            if (existing) {
                existing.is_active = true;
                existing.position = pos;
                existing.role = 'AUTHORIZED_REP';
            } else {
                MOCK_SIGNATORIES.push({
                    id: MOCK_SIGNATORIES.length + 1,
                    name: fullName,
                    position: pos,
                    role: 'AUTHORIZED_REP',
                    is_active: true
                });
            }
            return member;
        }

        const { data, error } = await supabase
            .from('staff')
            .update({ is_signatory: true })
            .eq('id', staffId)
            .select('id, first_name, middle_initial, last_name, suffix, email, username, account_status, created_at, created_by, admin_level, is_signatory, position, roles(code)')
            .single();

        if (error) throw error;

        if (data) {
            const fullName = composeFullName(data.first_name, data.middle_initial, data.last_name);
            const pos = data.position || 'Local Assessment Operations Officer IV';

            const { data: existingSig } = await supabase
                .from('signatories')
                .select('id')
                .eq('name', fullName)
                .maybeSingle();

            if (existingSig) {
                await supabase
                    .from('signatories')
                    .update({ is_active: true, position: pos, role: 'AUTHORIZED_REP', suffix: data.suffix || null })
                    .eq('id', existingSig.id);
            } else {
                await supabase
                    .from('signatories')
                    .insert({ name: fullName, position: pos, role: 'AUTHORIZED_REP', is_active: true, suffix: data.suffix || null });
            }
        }

        return data;
    }

    async unassignSignatory(staffId, actingStaff) {
        if (!hasAdminLevel(actingStaff, 'HIGH')) {
            throw new Error('Your admin access level does not permit removing the signatory.');
        }

        if (useMock || !supabase) {
            const member = MOCK_STAFF.find((s) => s.id === staffId);
            if (!member) throw new Error('Staff member not found.');
            member.is_signatory = false;

            const fullName = composeFullName(member.first_name, member.middle_initial, member.last_name);
            const existing = MOCK_SIGNATORIES.find(s => s.name === fullName);
            if (existing) {
                existing.is_active = false;
            }
            return member;
        }

        const { data, error } = await supabase
            .from('staff')
            .update({ is_signatory: false })
            .eq('id', staffId)
            .select('id, first_name, middle_initial, last_name, suffix, email, username, account_status, created_at, created_by, admin_level, is_signatory, roles(code)')
            .single();

        if (error) throw error;

        if (data) {
            const fullName = composeFullName(data.first_name, data.middle_initial, data.last_name);
            await supabase
                .from('signatories')
                .update({ is_active: false })
                .eq('name', fullName);
        }

        return data;
    }

    async getSignatories() {
        if (useMock || !supabase) {
            return MOCK_SIGNATORIES.filter(s => s.is_active);
        }

        const { data, error } = await supabase
            .from('signatories')
            .select('id, name, position, role, is_active, suffix')
            .eq('is_active', true);

        if (error) throw error;

        if (!data || data.length === 0) {
            const { data: staffData } = await supabase
                .from('staff')
                .select('id, first_name, middle_initial, last_name, suffix, admin_level, is_signatory')
                .eq('is_signatory', true)
                .eq('account_status', 'ACTIVE');

            if (staffData && staffData.length > 0) {
                return staffData.map(s => ({
                    id: s.id,
                    name: composeFullName(s.first_name, s.middle_initial, s.last_name),
                    position: s.admin_level ? `${s.admin_level} Admin` : 'Local Assessment Operations Officer IV',
                    role: 'AUTHORIZED_REP',
                    is_active: true,
                    suffix: s.suffix || null
                }));
            }
        }

        return data ?? [];
    }

    async getStaffPerformance(from, to) {
        if (useMock || !supabase) {
            return MOCK_STAFF
                .filter((m) => m.account_status === 'ACTIVE')
                .map((m, i) => ({
                    id: m.id,
                    name: composeFullName(m.first_name, m.middle_initial, m.last_name),
                    initials: `${m.first_name[0]}${m.last_name[0]}`.toUpperCase(),
                    requests: [12, 8, 6, 4][i] ?? 0,
                    avatarBg: ['#3D2E7C', '#00BCD4', '#1976D2', '#4CAF50'][i % 4],
                }))
                .sort((a, b) => b.requests - a.requests);
        }

        let requestsQuery = supabase
            .from('requests')
            .select('encoded_by')
            .not('encoded_by', 'is', null);
        if (from) requestsQuery = requestsQuery.gte('request_date', from);
        if (to)   requestsQuery = requestsQuery.lte('request_date', to);

        const [{ data: staffRows }, { data: requestRows }] = await Promise.all([
            supabase
                .from('staff')
                .select('id, first_name, middle_initial, last_name')
                .eq('account_status', 'ACTIVE')
                .is('deleted_at', null),
            requestsQuery,
        ]);

        const countMap = {};
        for (const row of requestRows ?? []) {
            if (row.encoded_by) {
                countMap[row.encoded_by] = (countMap[row.encoded_by] ?? 0) + 1;
            }
        }

        const AVATAR_COLORS = ['#3D2E7C', '#00BCD4', '#1976D2', '#4CAF50', '#607D8B', '#FF7043'];
        return (staffRows ?? [])
            .map((m, i) => ({
                id: m.id,
                name: composeFullName(m.first_name, m.middle_initial, m.last_name).trim(),
                initials: `${(m.first_name || ' ')[0]}${(m.last_name || ' ')[0]}`.toUpperCase(),
                requests: countMap[m.id] ?? 0,
                avatarBg: AVATAR_COLORS[i % AVATAR_COLORS.length],
            }))
            .sort((a, b) => b.requests - a.requests);
    }
}

export default new UserService();