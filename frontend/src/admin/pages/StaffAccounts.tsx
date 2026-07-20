import { useState } from 'react';
import '../styles/StaffAccounts.css';
import type { User } from '../../auth-folder/types/auth';
import { useStaffAccounts } from '../hooks/useStaffAccounts';
import { createStaffAccount } from '../services/userManagementService';
import { addAdminAuditEntry } from '../services/auditLogService';



interface StaffAccountsProps {
    user: User;
    onAddStaff?: () => void;
    /** @deprecated Replaced by live toggle — kept for API compatibility */
    onManageStaff?: (staffId: string) => void;
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
        roleCode: 'OFFICE_STAFF',
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');

    const activeCount = staff.filter((s) => s.status === 'active').length;

    const fullName = `${user.firstName || 'Admin'} ${user.lastName || 'User'}`;
    const initials = `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || 'U'}`;

    const handleAddStaff = async (event: React.FormEvent) => {
        event.preventDefault();
        setSubmitting(true);
        setFormError(null);
        setFormSuccess(null);

        try {
            await createStaffAccount(form);
            addAdminAuditEntry({
                type: 'approval',
                actor: 'Super Admin',
                description: `created staff account — ${form.username}`,
            });
            setFormSuccess('Staff account created successfully.');
            setForm({
                firstName: '',
                lastName: '',
                email: '',
                username: '',
                password: '',
                roleCode: 'OFFICE_STAFF',
            });
            await refresh();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Failed to create staff account.');
        } finally {
            setSubmitting(false);
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

                    <div className="admin-profile-widget">
                        <div className="profile-widget-avatar-container">
                            {initials}
                        </div>
                        <div className="profile-widget-info">
                            <span className="profile-widget-name">{fullName}</span>
                            <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                            <div className="profile-widget-meta">
                                <span className="profile-widget-role">
                                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin'}
                                </span>
                                <span>Last Login : Today • 8:12 AM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search bar */}
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
                                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'pending')}
                                style={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: '#ffffff', color: '#0f172a', padding: '6px 10px' }}
                            >
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                            </select>
                        </label>
                        {/* Refresh button */}
                        <button
                            className="staff-manage-btn"
                            onClick={refresh}
                            disabled={loading}
                            title="Refresh list"
                        >
                            ↻ Refresh
                        </button>
                        <button className="admin-add-btn" onClick={() => {
                            if (onAddStaff) {
                                onAddStaff();
                            }
                            setShowAddModal(true);
                        }}>
                            + Add Staff
                        </button>
                    </div>
                </div>

                 {/* Error banner */}
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
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                /* Loading skeleton rows */
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 7 }).map((__, j) => (
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
                                    <td colSpan={7} style={{ textAlign: 'center', opacity: 0.5, padding: '24px' }}>
                                        No staff members found.
                                    </td>
                                   
                                </tr>
     
                             ) : (
                                staff
                                    .filter((member) => statusFilter === 'all' || member.status === statusFilter)
                                    .map((member) => (
                                    <tr key={member.id}>
                                        <td><strong>{member.name}</strong></td>
                                        <td>{member.username}</td>
                                        <td>{member.email}</td>
                                        <td>{member.role}</td>
                                        <td>
                                            <span className={`status-indicator ${member.status}`}>
                                                <span className="status-dot" />
                                                {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>{member.dateAdded}</td>
                                        <td>
                                            <button
                                                className={`staff-manage-btn ${member.status === 'active' ? 'deactivate' : 'activate'}`}
                                                disabled={updatingId === member.id || member.status === 'pending'}
                                                onClick={() => toggleStatus(member.id)}
                                                title={
                                                    member.status === 'pending'
                                                        ? 'Approve account via Account Requests first'
                                                        : member.status === 'active'
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div className="staff-modal-backdrop" onClick={() => setShowAddModal(false)}>
                    <div className="staff-modal-card" onClick={(event) => event.stopPropagation()}>
                        <div className="staff-modal-header">
                            <div>
                                <h3>Add New Staff</h3>
                                <p>Create a new staff account and assign access.</p>
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
                                    <input value="Office Staff" readOnly />
                                </label>
                            </div>

                            <div className="staff-modal-actions">
                                <button type="button" className="staff-manage-btn" onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="admin-add-btn" disabled={submitting}>
                                    {submitting ? 'Creating…' : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );

}
