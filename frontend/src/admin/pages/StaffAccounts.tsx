import { useState } from 'react';
import '../styles/StaffAccounts.css';
import type { User } from '../../auth-folder/types/auth';
import { useStaffAccounts, type StaffRow } from '../hooks/useStaffAccounts';
import { createStaffAccount, promoteToAdmin, demoteToStaff, setAdminLevel } from '../services/userManagementService';
import { addAdminAuditEntry } from '../services/auditLogService';
import { hasAdminLevel, isSuperAdmin } from '../../utils/permissions';

interface StaffAccountsProps {
    user: User;
    onAddStaff?: () => void;
    onManageStaff?: (staffId: string) => void;
}

type AdminLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export function StaffAccounts({ user, onAddStaff }: StaffAccountsProps) {
    const {
        staff,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        toggleStatus,
        updatingId,
        refresh,
    } = useStaffAccounts();

    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        roleCode: 'OFFICE_STAFF' as 'OFFICE_STAFF' | 'ADMIN',
        adminLevel: 'LOW' as AdminLevel,
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // ── Promote / Demote / Change-level flow state ────────────────────────────
    const [confirmPromote, setConfirmPromote] = useState<StaffRow | null>(null);
    const [confirmDemote, setConfirmDemote] = useState<StaffRow | null>(null);
    const [levelPicker, setLevelPicker] = useState<{ member: StaffRow; mode: 'promote' | 'change' } | null>(null);
    const [pickedLevel, setPickedLevel] = useState<AdminLevel>('LOW');
    const [roleActionLoadingId, setRoleActionLoadingId] = useState<string | null>(null);
    const [roleActionError, setRoleActionError] = useState<string | null>(null);

    const activeCount = staff.filter((s) => s.status === 'active').length;
    const initials = `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || 'U'}`;

    const canCreateStaff = hasAdminLevel(user, 'MEDIUM');
    const superAdmin = isSuperAdmin(user);

    /**
     * Can the current user toggle active/inactive on this staff member?
     */
    const canManageStaffMember = (member: StaffRow): boolean => {
        if (member.roleCode === 'ADMIN' || member.roleCode === 'SUPER_ADMIN') {
            return superAdmin;
        }
        if (superAdmin) return true;
        if (user.role === 'ADMIN') {
            if (user.adminLevel === 'LOW') return false;
            if (user.adminLevel === 'MEDIUM') return member.createdBy === user.id;
            return true; // HIGH
        }
        return false;
    };

    const actorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Super Admin';

    // ── Add Staff ───────────────────────────────────────────────────────────
    const handleAddStaff = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            await createStaffAccount({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                username: form.username,
                password: form.password,
                roleCode: form.roleCode,
                adminLevel: form.roleCode === 'ADMIN' ? form.adminLevel : undefined,
            });
            addAdminAuditEntry({
                type: 'approval',
                actor: actorName,
                description: form.roleCode === 'ADMIN'
                    ? `created admin account — ${form.username} (${form.adminLevel})`
                    : `created staff account — ${form.username}`,
            });
            setFormSuccess('Account created successfully.');
            setForm({
                firstName: '',
                lastName: '',
                email: '',
                username: '',
                password: '',
                roleCode: 'OFFICE_STAFF',
                adminLevel: 'LOW',
            });
            await refresh();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Failed to create account.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Promote flow ────────────────────────────────────────────────────────
    const openPromoteConfirm = (member: StaffRow) => {
        setRoleActionError(null);
        setConfirmPromote(member);
    };

    const handlePromoteConfirmYes = () => {
        if (!confirmPromote) return;
        setLevelPicker({ member: confirmPromote, mode: 'promote' });
        setPickedLevel('LOW');
        setConfirmPromote(null);
    };

    // ── Change level flow ───────────────────────────────────────────────────
    const openChangeLevel = (member: StaffRow) => {
        setRoleActionError(null);
        setLevelPicker({ member, mode: 'change' });
        setPickedLevel((member.adminLevel as AdminLevel) || 'LOW');
    };

    const handleLevelSubmit = async () => {
        if (!levelPicker) return;
        const { member, mode } = levelPicker;
        setRoleActionLoadingId(member.id);
        setRoleActionError(null);
        try {
            if (mode === 'promote') {
                await promoteToAdmin(member.id, pickedLevel);
                addAdminAuditEntry({
                    type: 'approval',
                    actor: actorName,
                    description: `promoted ${member.name} to Admin (${pickedLevel})`,
                });
            } else {
                await setAdminLevel(member.id, pickedLevel);
                addAdminAuditEntry({
                    type: 'approval',
                    actor: actorName,
                    description: `changed ${member.name}'s admin level to ${pickedLevel}`,
                });
            }
            setLevelPicker(null);
            await refresh();
        } catch (err: unknown) {
            setRoleActionError(err instanceof Error ? err.message : 'Failed to update admin level.');
        } finally {
            setRoleActionLoadingId(null);
        }
    };

    // ── Demote flow ─────────────────────────────────────────────────────────
    const openDemoteConfirm = (member: StaffRow) => {
        setRoleActionError(null);
        setConfirmDemote(member);
    };

    const handleDemoteConfirmYes = async () => {
        if (!confirmDemote) return;
        const member = confirmDemote;
        setRoleActionLoadingId(member.id);
        setRoleActionError(null);
        try {
            await demoteToStaff(member.id);
            addAdminAuditEntry({
                type: 'decline',
                actor: actorName,
                description: `demoted ${member.name} to Office Staff`,
            });
            setConfirmDemote(null);
            await refresh();
        } catch (err: unknown) {
            setRoleActionError(err instanceof Error ? err.message : 'Failed to demote admin.');
        } finally {
            setRoleActionLoadingId(null);
        }
    };

    return (
        <>
            {/* Page header */}
            <div className="staff-page-header">
                <div className="staff-page-header-row">
                    <div>
                        <h1 className="staff-page-title">Staff Accounts</h1>
                        <p className="staff-page-subtitle">Manage assessor's office staff profiles and access.</p>
                    </div>

                    <div className="admin-profile-widget audit-user-chip">
                        <div className="profile-widget-avatar-container audit-user-avatar">
                            {initials}
                        </div>
                        <div className="profile-widget-info audit-user-info">
                            <span className="profile-widget-name audit-user-name">{`${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
                            <span className="profile-widget-role">
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'ADMIN' ? `Admin · ${user.adminLevel || ''}` : user.role || 'Staff'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="admin-search-bar">
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="admin-search-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </span>
                </div>
            </div>

            <div className="admin-card staff-accounts-card">
                <div className="staff-accounts-header-row">
                    <div className="staff-accounts-title-group">
                        <h2 className="admin-card-title">Staff Accounts</h2>
                        {!loading && <span className="active-count-pill">{activeCount} Active</span>}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            <span>Filter</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                                style={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#ffffff', color: '#0f172a', padding: '6px 10px' }}
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>
                        <button
                            className="staff-manage-btn"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh list"
                        >
                            ↻ Refresh
                        </button>
                        {canCreateStaff && (
                            <button className="admin-add-btn" onClick={() => {
                                if (onAddStaff) onAddStaff();
                                setShowAddModal(true);
                            }}>
                                + Add Staff
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '12px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                    }}>
                        {error} —{' '}
                        <button
                            onClick={refresh}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            retry
                        </button>
                    </div>
                )}

                {roleActionError && (
                    <div style={{
                        padding: '10px 14px',
                        marginBottom: '12px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                    }}>
                        {roleActionError}
                    </div>
                )}

                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Date Added</th>
                                <th>Action</th>
                                {superAdmin && <th>Admin Access</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: superAdmin ? 8 : 7 }).map((__, j) => (
                                            <td key={j}>
                                                <div style={{
                                                    height: '14px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(255,255,255,0.07)',
                                                    animation: 'pulse 1.5s ease-in-out infinite',
                                                    width: j === 5 ? '70px' : '100%',
                                                }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={superAdmin ? 8 : 7} style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                staff
                                    .filter((member) => statusFilter === 'all' || member.status === statusFilter)
                                    .map((member) => {
                                        const allowed = canManageStaffMember(member);
                                        const actingOnThis = roleActionLoadingId === member.id;
                                        return (
                                            <tr key={member.id}>
                                                <td><strong>{member.name}</strong></td>
                                                <td>{member.username}</td>
                                                <td>{member.email}</td>
                                                <td>
                                                    {member.role}
                                                    {member.roleCode === 'ADMIN' && member.adminLevel && (
                                                        <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#8b8fa3' }}>
                                                            · {member.adminLevel}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status-indicator ${member.status}`}>
                                                        <span className="status-dot" />
                                                        {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>{member.dateAdded}</td>
                                                <td>
                                                    {allowed ? (
                                                        <button
                                                            className={`staff-manage-btn ${member.status === 'active' ? 'deactivate' : 'activate'}`}
                                                            disabled={updatingId === member.id || member.status === 'pending'}
                                                            onClick={() => toggleStatus(member.id)}
                                                            title={
                                                                member.status === 'active'
                                                                    ? 'Deactivate this staff member'
                                                                    : 'Reactivate this staff member'
                                                            }
                                                        >
                                                            {updatingId === member.id
                                                                ? 'Saving…'
                                                                : member.status === 'active'
                                                                ? 'Deactivate'
                                                                : 'Activate'}
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No access
                                                        </span>
                                                    )}
                                                </td>
                                                {superAdmin && (
                                                    <td>
                                                        {member.roleCode === 'OFFICE_STAFF' && (
                                                            <button
                                                                className="staff-manage-btn activate"
                                                                disabled={actingOnThis}
                                                                onClick={() => openPromoteConfirm(member)}
                                                            >
                                                                {actingOnThis ? 'Saving…' : 'Promote to Admin'}
                                                            </button>
                                                        )}
                                                        {member.roleCode === 'ADMIN' && (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button
                                                                    className="staff-manage-btn"
                                                                    disabled={actingOnThis}
                                                                    onClick={() => openChangeLevel(member)}
                                                                >
                                                                    Change Level
                                                                </button>
                                                                <button
                                                                    className="staff-manage-btn deactivate"
                                                                    disabled={actingOnThis}
                                                                    onClick={() => openDemoteConfirm(member)}
                                                                >
                                                                    {actingOnThis ? 'Saving…' : 'Demote to Staff'}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {(member.roleCode === 'SUPER_ADMIN') && (
                                                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Add Staff modal ─────────────────────────────────────────────── */}
            {showAddModal && canCreateStaff && (
                <div className="staff-modal-backdrop" onClick={() => setShowAddModal(false)}>
                    <div className="staff-modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>Add New Staff</h3>
                                <p>Create a new staff or admin account and assign access.</p>
                            </div>
                            <button className="staff-modal-close" onClick={() => setShowAddModal(false)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="staff-modal-form">
                            {formError && <div className="staff-form-error">{formError}</div>}
                            {formSuccess && <div className="staff-form-success">{formSuccess}</div>}

                            <div className="staff-form-grid">
                                <label>
                                    First name
                                    <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                                </label>
                                <label>
                                    Last name
                                    <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                                </label>
                                <label>
                                    Email
                                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </label>
                                <label>
                                    Username
                                    <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                                </label>
                                <label>
                                    Password
                                    <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                </label>
                                <label>
                                    Role
                                    {superAdmin ? (
                                        <select
                                            value={form.roleCode}
                                            onChange={(e) => setForm({ ...form, roleCode: e.target.value as 'OFFICE_STAFF' | 'ADMIN' })}
                                        >
                                            <option value="OFFICE_STAFF">Office Staff</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    ) : (
                                        <input value="Office Staff" readOnly />
                                    )}
                                </label>
                                {superAdmin && form.roleCode === 'ADMIN' && (
                                    <label>
                                        Admin level
                                        <select
                                            value={form.adminLevel}
                                            onChange={(e) => setForm({ ...form, adminLevel: e.target.value as AdminLevel })}
                                        >
                                            <option value="HIGH">High</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="LOW">Low</option>
                                        </select>
                                    </label>
                                )}
                            </div>

                            <div className="staff-modal-actions">
                                <button type="button" className="staff-manage-btn" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-add-btn" disabled={submitting}>
                                    {submitting ? 'Creating…' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Promote confirm modal ───────────────────────────────────────── */}
            {confirmPromote && (
                <div className="staff-modal-backdrop" onClick={() => setConfirmPromote(null)}>
                    <div className="staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>Promote to Admin</h3>
                            </div>
                            <button className="staff-modal-close" onClick={() => setConfirmPromote(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#33364A' }}>
                                Do you want to promote <strong>{confirmPromote.name}</strong> to admin?
                            </p>
                        </div>
                        <div className="staff-modal-actions">
                            <button type="button" className="staff-manage-btn" onClick={() => setConfirmPromote(null)}>
                                No
                            </button>
                            <button type="button" className="admin-add-btn" onClick={handlePromoteConfirmYes}>
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Demote confirm modal ────────────────────────────────────────── */}
            {confirmDemote && (
                <div className="staff-modal-backdrop" onClick={() => setConfirmDemote(null)}>
                    <div className="staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>Demote to Staff</h3>
                            </div>
                            <button className="staff-modal-close" onClick={() => setConfirmDemote(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#33364A' }}>
                                Do you want to demote <strong>{confirmDemote.name}</strong> back to Office Staff? They will lose all admin access.
                            </p>
                        </div>
                        <div className="staff-modal-actions">
                            <button type="button" className="staff-manage-btn" onClick={() => setConfirmDemote(null)} disabled={roleActionLoadingId === confirmDemote.id}>
                                No
                            </button>
                            <button type="button" className="admin-add-btn" onClick={handleDemoteConfirmYes} disabled={roleActionLoadingId === confirmDemote.id}>
                                {roleActionLoadingId === confirmDemote.id ? 'Demoting…' : 'Yes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Level picker modal (used for both promote step 2, and change-level) ── */}
            {levelPicker && (
                <div className="staff-modal-backdrop" onClick={() => setLevelPicker(null)}>
                    <div className="staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>{levelPicker.mode === 'promote' ? 'Choose Admin Level' : 'Change Admin Level'}</h3>
                                <p>{levelPicker.member.name}</p>
                            </div>
                            <button className="staff-modal-close" onClick={() => setLevelPicker(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(['HIGH', 'MEDIUM', 'LOW'] as AdminLevel[]).map((lvl) => (
                                <label key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="adminLevel"
                                        checked={pickedLevel === lvl}
                                        onChange={() => setPickedLevel(lvl)}
                                    />
                                    {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                                </label>
                            ))}
                        </div>
                        <div className="staff-modal-actions">
                            <button type="button" className="staff-manage-btn" onClick={() => setLevelPicker(null)} disabled={roleActionLoadingId === levelPicker.member.id}>
                                Cancel
                            </button>
                            <button type="button" className="admin-add-btn" onClick={handleLevelSubmit} disabled={roleActionLoadingId === levelPicker.member.id}>
                                {roleActionLoadingId === levelPicker.member.id ? 'Saving…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}