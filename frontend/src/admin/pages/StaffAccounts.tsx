import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/StaffAccounts.css';
import type { User } from '../../auth-folder/types/auth';
import { useStaffAccounts, type StaffRow } from '../hooks/useStaffAccounts';
import {
    createStaffAccount,
    promoteToAdmin,
    demoteToStaff,
    setAdminLevel,
    setStaffPosition,
    assignSignatory,
    unassignSignatory,
} from '../services/userManagementService';
import { addAdminAuditEntry } from '../services/auditLogService';
import { hasAdminLevel, isSuperAdmin } from '../../utils/permissions';

interface StaffAccountsProps {
    user: User;
    onAddStaff?: () => void;
    onManageStaff?: (staffId: string) => void;
}

type AdminLevel = 'HIGH' | 'MEDIUM' | 'LOW';

function PersonLockIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8.5" cy="6" r="3.5" fill="currentColor" />
            <path
                d="M2 17c0-3.6 2.9-6.2 6.5-6.2 1 0 1.94.2 2.78.56a4.48 4.48 0 00-.78 2.54v.6c0 .9.28 1.74.76 2.5H2z"
                fill="currentColor"
            />
            <rect x="12.5" y="10.5" width="6" height="5.5" rx="1.2" fill="currentColor" />
            <path
                d="M13.7 10.5v-1.3a1.8 1.8 0 013.6 0v1.3"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
            />
        </svg>
    );
}

function ClipboardArrowIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3.5" width="10" height="13" rx="1.4" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <rect x="6" y="2" width="4" height="2.4" rx="0.6" fill="currentColor" />
            <path d="M6 8h5M6 11h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path
                d="M12.5 13l4 4m0 0v-3m0 3h-3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function BadgeIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="10" cy="2.5" r="1.5" fill="currentColor" />
            <path d="M8.5 2.5h3v2.5h-3z" fill="currentColor" />
        </svg>
    );
}

const menuItemStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#33364A',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #F4F4F8',
    cursor: 'pointer',
};

// Icon button with a custom CSS hover tooltip explaining what the icon does.
function IconTooltipButton({
    label,
    disabled = false,
    onClick,
    background,
    color,
    cursor = 'pointer',
    opacity = 1,
    children,
}: {
    label: string;
    disabled?: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    background: string;
    color: string;
    cursor?: string;
    opacity?: number;
    children: React.ReactNode;
}) {
    return (
        <span className="staff-icon-tooltip-wrap">
            <button
                type="button"
                disabled={disabled}
                onClick={onClick}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '10px',
                    border: 'none',
                    background, color, cursor, opacity,
                }}
            >
                {children}
            </button>
            <span className="staff-icon-tooltip">{label}</span>
        </span>
    );
}

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
    const [roleFilter, setRoleFilter] = useState<'all' | 'staff' | 'admin'>('all');

    // ── Promote / Demote / Change-level flow state ────────────────────────────
    const [confirmPromote, setConfirmPromote] = useState<StaffRow | null>(null);
    const [confirmDemote, setConfirmDemote] = useState<StaffRow | null>(null);
    const [levelPicker, setLevelPicker] = useState<{ member: StaffRow; mode: 'promote' | 'change' } | null>(null);
    const [pickedLevel, setPickedLevel] = useState<AdminLevel>('LOW');
    const [roleActionLoadingId, setRoleActionLoadingId] = useState<string | null>(null);
    const [roleActionError, setRoleActionError] = useState<string | null>(null);

    // ── Signatory flow state ────────────────────────────────────────────────
    const [confirmSignatory, setConfirmSignatory] = useState<StaffRow | null>(null);

    // ── Title picker state ──────────────────────────────────────────────────
    const [positionPicker, setPositionPicker] = useState<StaffRow | null>(null);
    const [pickedPosition, setPickedPosition] = useState<string>('');

    // ── Icon-button menu state ──────────────────────────────────────────────
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Close the portal menu on scroll/resize so it doesn't drift away from its button
    useEffect(() => {
        if (!openMenuId) return;
        const close = () => setOpenMenuId(null);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [openMenuId]);

    // ── Pagination state ───────────────────────────────────────────────────────
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const activeCount = staff.filter((s) => s.status === 'active').length;
    const initials = `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || 'U'}`;

    const canCreateStaff = hasAdminLevel(user, 'MEDIUM');
    const canManageSignatory = hasAdminLevel(user, 'HIGH');
    const superAdmin = isSuperAdmin(user);

    // ── Filtered + paginated derived lists ─────────────────────────────────────
    const filteredStaffList = staff.filter((member) => {
        const statusMatch = statusFilter === 'all' || member.status === statusFilter;
        const roleMatch =
            roleFilter === 'all' ||
            (roleFilter === 'staff' && member.roleCode === 'OFFICE_STAFF') ||
            (roleFilter === 'admin' && (member.roleCode === 'ADMIN' || member.roleCode === 'SUPER_ADMIN'));
        return statusMatch && roleMatch;
    });
    const totalRows = filteredStaffList.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
    const paginatedStaff = filteredStaffList.slice(startIndex, endIndex);

    // Reset to page 1 whenever the filter, rows-per-page, or search changes,
    // so you don't get stuck on an empty page after narrowing the results.
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, roleFilter, rowsPerPage, searchQuery]);

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
                    type: 'staff_promote',
                    description: `promoted ${member.name} to Admin (${pickedLevel})`,
                });
            } else {
                await setAdminLevel(member.id, pickedLevel);
                addAdminAuditEntry({
                    type: 'staff_promote',
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
                type: 'staff_demote',
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

    // ── Signatory flow ──────────────────────────────────────────────────────
    const openSignatoryConfirm = (member: StaffRow) => {
        setRoleActionError(null);
        setConfirmSignatory(member);
    };

    const handleSignatoryConfirmYes = async () => {
        if (!confirmSignatory) return;
        const member = confirmSignatory;
        setRoleActionLoadingId(member.id);
        setRoleActionError(null);
        try {
            if (member.isSignatory) {
                await unassignSignatory(member.id);
                addAdminAuditEntry({
                    type: 'decline',
                    description: `removed ${member.name} as signatory`,
                });
            } else {
                await assignSignatory(member.id);
                addAdminAuditEntry({
                    type: 'approval',
                    description: `assigned ${member.name} as signatory`,
                });
            }
            setConfirmSignatory(null);
            await refresh();
        } catch (err: unknown) {
            setRoleActionError(err instanceof Error ? err.message : 'Failed to update signatory.');
        } finally {
            setRoleActionLoadingId(null);
        }
    };

    // ── Set Position flow ───────────────────────────────────────────────────
    const openPositionPicker = (member: StaffRow) => {
        setRoleActionError(null);
        setPickedPosition(member.position || '');
        setPositionPicker(member);
    };

    const handlePositionSubmit = async () => {
        if (!positionPicker || !pickedPosition) return;
        const member = positionPicker;
        setRoleActionLoadingId(member.id);
        setRoleActionError(null);
        try {
            await setStaffPosition(member.id, pickedPosition);
            addAdminAuditEntry({
                type: 'staff_promote',
                description: `set ${member.name}'s position to "${pickedPosition}"`,
            });
            setPositionPicker(null);
            await refresh();
        } catch (err: unknown) {
            setRoleActionError(err instanceof Error ? err.message : 'Failed to set position.');
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
                            {user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`.trim()} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
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
                            <span>Status</span>
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                            <span>Role</span>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value as 'all' | 'staff' | 'admin')}
                                style={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#ffffff', color: '#0f172a', padding: '6px 10px' }}
                            >
                                <option value="all">All</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
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
                            ) : totalRows === 0 ? (
                                <tr>
                                    <td colSpan={superAdmin ? 8 : 7} style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((member) => {
                                    const allowed = canManageStaffMember(member);
                                    const isInactive = member.status !== 'active';
                                    return (
                                        <tr key={member.id}>
                                            <td>
                                                <strong>{member.name}{member.suffix ? `, ${member.suffix}` : ''}</strong>
                                                {member.isSignatory && (
                                                    <span style={{
                                                        marginLeft: 6,
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        color: '#3D2E7C',
                                                        background: '#EEF0F7',
                                                        borderRadius: '999px',
                                                        padding: '2px 8px',
                                                    }}>
                                                        Signatory
                                                    </span>
                                                )}
                                                {member.position && (
                                                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '2px' }}>
                                                        {member.position}
                                                    </div>
                                                )}
                                            </td>
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
                                                    <div className="staff-icon-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'center', position: 'relative' }}>
                                                        {member.roleCode !== 'SUPER_ADMIN' && (
                                                            <IconTooltipButton
                                                                disabled={isInactive}
                                                                onClick={(e) => {
                                                                    if (member.roleCode === 'ADMIN') {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        const menuWidth = 190;
                                                                        setMenuPosition({
                                                                            top: rect.bottom + 6,
                                                                            left: Math.min(rect.left, window.innerWidth - menuWidth - 12),
                                                                        });
                                                                        setOpenMenuId(openMenuId === member.id ? null : member.id);
                                                                    } else {
                                                                        openPromoteConfirm(member);
                                                                    }
                                                                }}
                                                                label={
                                                                    isInactive
                                                                        ? 'Reactivate this staff member to manage admin access'
                                                                        : member.roleCode === 'ADMIN'
                                                                        ? 'Manage Admin Access'
                                                                        : 'Promote to Admin'
                                                                }
                                                                background={isInactive ? '#FDE2E2' : '#DDF3E4'}
                                                                color={isInactive ? '#DC2626' : '#14532D'}
                                                                cursor={isInactive ? 'not-allowed' : 'pointer'}
                                                                opacity={isInactive ? 0.85 : 1}
                                                            >
                                                                <PersonLockIcon size={15} />
                                                            </IconTooltipButton>
                                                        )}

                                                        {openMenuId === member.id && member.roleCode === 'ADMIN' && !isInactive &&
                                                            createPortal(
                                                                <div
                                                                    onMouseLeave={() => setOpenMenuId(null)}
                                                                    style={{
                                                                        position: 'fixed',
                                                                        top: menuPosition.top,
                                                                        left: menuPosition.left,
                                                                        zIndex: 9999,
                                                                        background: '#FFFFFF', borderRadius: '10px',
                                                                        boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
                                                                        border: '1px solid #EDEEF3', minWidth: '190px',
                                                                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                                                                    }}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setOpenMenuId(null); openChangeLevel(member); }}
                                                                        style={menuItemStyle}
                                                                    >
                                                                        Change Admin Level
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setOpenMenuId(null); openDemoteConfirm(member); }}
                                                                        style={{ ...menuItemStyle, color: '#DC2626', borderBottom: 'none' }}
                                                                    >
                                                                        Demote to Staff
                                                                    </button>
                                                                </div>,
                                                                document.body
                                                            )}

                                                        {canManageSignatory && member.roleCode !== 'SUPER_ADMIN' && (
                                                            <IconTooltipButton
                                                                disabled={isInactive}
                                                                onClick={() => openSignatoryConfirm(member)}
                                                                label={
                                                                    isInactive
                                                                        ? 'Reactivate this staff member to assign as signatory'
                                                                        : member.isSignatory
                                                                        ? 'Remove as Signatory'
                                                                        : 'Assign as Signatory'
                                                                }
                                                                background={member.isSignatory ? '#FEF9C3' : (isInactive ? '#F1F5F9' : '#DDF3E4')}
                                                                color={member.isSignatory ? '#854D0E' : (isInactive ? '#94A3B8' : '#14532D')}
                                                                cursor={isInactive ? 'not-allowed' : 'pointer'}
                                                                opacity={isInactive ? 0.85 : 1}
                                                            >
                                                                <ClipboardArrowIcon size={15} />
                                                            </IconTooltipButton>
                                                        )}

                                                        {canManageSignatory && member.roleCode !== 'SUPER_ADMIN' && (
                                                            <IconTooltipButton
                                                                disabled={isInactive}
                                                                onClick={() => openPositionPicker(member)}
                                                                label={isInactive ? 'Reactivate to set position' : 'Set Position'}
                                                                background={member.position ? '#EDE9FE' : (isInactive ? '#F1F5F9' : '#E0E7FF')}
                                                                color={member.position ? '#5B21B6' : (isInactive ? '#94A3B8' : '#3730A3')}
                                                                cursor={isInactive ? 'not-allowed' : 'pointer'}
                                                                opacity={isInactive ? 0.85 : 1}
                                                            >
                                                                <BadgeIcon size={15} />
                                                            </IconTooltipButton>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {!loading && totalRows > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderTop: '1px solid #EDEEF3',
                        fontSize: '0.85rem',
                        color: '#64748b',
                        flexWrap: 'wrap',
                        gap: '10px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                style={{ borderRadius: '6px', border: '1px solid #e2e8f0', padding: '4px 8px' }}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <span>
                            {startIndex + 1}{'\u2013'}{endIndex} of {totalRows}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: currentPage === 1 ? 'default' : 'pointer',
                                    color: currentPage === 1 ? '#cbd5e1' : '#3D2E7C',
                                    fontWeight: 600,
                                }}
                            >
                                Previous
                            </button>
                            <span>Page {currentPage} of {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: currentPage === totalPages ? 'default' : 'pointer',
                                    color: currentPage === totalPages ? '#cbd5e1' : '#3D2E7C',
                                    fontWeight: 600,
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
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
                            {(['HIGH', 'MEDIUM', 'LOW'] as AdminLevel[]).map((lvl) => {
                                const levelDescriptions: Record<AdminLevel, string> = {
                                    HIGH: 'Full access — create staff accounts, activate or deactivate any staff member, and assign or remove the signatory.',
                                    MEDIUM: 'Can create new staff accounts and activate or deactivate staff members they personally created.',
                                    LOW: 'View-only access — cannot create staff accounts, manage signatories, or activate/deactivate staff.',
                                };
                                const selected = pickedLevel === lvl;
                                return (
                                    <label
                                        key={lvl}
                                        style={{
                                            display: 'block',
                                            cursor: 'pointer',
                                            borderRadius: '10px',
                                            border: `1px solid ${selected ? '#3D2E7C' : '#E2E4EC'}`,
                                            background: selected ? '#F5F3FB' : '#FFFFFF',
                                            padding: '12px 14px',
                                            transition: 'border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
                                            boxShadow: selected ? '0 0 0 3px rgba(61, 46, 124, 0.08)' : 'none',
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="radio"
                                                name="adminLevel"
                                                checked={selected}
                                                onChange={() => setPickedLevel(lvl)}
                                                style={{ accentColor: '#3D2E7C', width: '15px', height: '15px', flexShrink: 0 }}
                                            />
                                            <span
                                                style={{
                                                    fontSize: selected ? '0.9rem' : '0.75rem',
                                                    fontWeight: 700,
                                                    letterSpacing: selected ? 'normal' : '0.4px',
                                                    textTransform: selected ? 'none' : 'uppercase',
                                                    color: selected ? '#1F2333' : '#8A8DA0',
                                                    transition: 'font-size 0.25s ease, color 0.25s ease',
                                                }}
                                            >
                                                {selected ? lvl.charAt(0) + lvl.slice(1).toLowerCase() : lvl}
                                            </span>
                                        </span>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateRows: selected ? '1fr' : '0fr',
                                                transition: 'grid-template-rows 0.25s ease',
                                            }}
                                        >
                                            <div style={{ overflow: 'hidden' }}>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        paddingTop: '8px',
                                                        paddingLeft: '25px',
                                                        fontSize: '0.8rem',
                                                        color: '#6B6F80',
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {levelDescriptions[lvl]}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
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

            {/* ── Signatory confirm modal ─────────────────────────────────────── */}
            {confirmSignatory && (
                <div className="staff-modal-backdrop" onClick={() => setConfirmSignatory(null)}>
                    <div className="staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>{confirmSignatory.isSignatory ? 'Remove Signatory' : 'Assign Signatory'}</h3>
                            </div>
                            <button className="staff-modal-close" onClick={() => setConfirmSignatory(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#33364A' }}>
                                {confirmSignatory.isSignatory ? (
                                    <>Remove <strong>{confirmSignatory.name}</strong> as a signatory? Their name will no longer appear on newly generated documents.</>
                                ) : (
                                    <>Assign <strong>{confirmSignatory.name}</strong> as an authorized signatory? Their name will be added to the available signatory selection list for documents.</>
                                )}
                            </p>
                        </div>
                        <div className="staff-modal-actions">
                            <button type="button" className="staff-manage-btn" onClick={() => setConfirmSignatory(null)} disabled={roleActionLoadingId === confirmSignatory.id}>
                                Cancel
                            </button>
                            <button type="button" className="admin-add-btn" onClick={handleSignatoryConfirmYes} disabled={roleActionLoadingId === confirmSignatory.id}>
                                {roleActionLoadingId === confirmSignatory.id ? 'Saving…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── Position picker modal ──────────────────────────────────── */}
            {positionPicker && (
                <div className="staff-modal-backdrop" onClick={() => setPositionPicker(null)}>
                    <div className="staff-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>Set Official Position</h3>
                                <p>{positionPicker.name}</p>
                            </div>
                            <button className="staff-modal-close" onClick={() => setPositionPicker(null)}>×</button>
                        </div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {([
                                'Local Assessment Operations Officer IV',
                                'Local Assessment Operations Officer III',
                                'Local Assessment Operations Officer II',
                                'Provincial Assessor',
                                'Assistant Provincial Assessor',
                            ] as const).map((t) => {
                                const selected = pickedPosition === t;
                                return (
                                    <label
                                        key={t}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            borderRadius: '10px',
                                            border: `1px solid ${selected ? '#5B21B6' : '#E2E4EC'}`,
                                            background: selected ? '#F5F3FF' : '#FFFFFF',
                                            padding: '12px 14px',
                                            transition: 'border-color 0.2s, background 0.2s',
                                            boxShadow: selected ? '0 0 0 3px rgba(91,33,182,0.08)' : 'none',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="staffPosition"
                                            checked={selected}
                                            onChange={() => setPickedPosition(t)}
                                            style={{ accentColor: '#5B21B6', width: '15px', height: '15px', flexShrink: 0 }}
                                        />
                                        <span style={{
                                            fontSize: '0.88rem',
                                            fontWeight: selected ? 700 : 500,
                                            color: selected ? '#3B0764' : '#374151',
                                        }}>
                                            {t}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="staff-modal-actions">
                            <button type="button" className="staff-manage-btn" onClick={() => setPositionPicker(null)} disabled={roleActionLoadingId === positionPicker.id}>
                                Cancel
                            </button>
                            <button type="button" className="admin-add-btn" onClick={handlePositionSubmit} disabled={!pickedPosition || roleActionLoadingId === positionPicker.id}>
                                {roleActionLoadingId === positionPicker.id ? 'Saving…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}