import { useState } from 'react';
import '../styles/StaffAccounts.css';
import type { User } from '../../auth-folder/types/auth';

interface StaffAccount {
    id: string;
    name: string;
    role: string;
    email: string;
    status: 'active' | 'inactive';
    dateAdded: string;
}

// TODO: replace with real data from a useStaffAccounts hook / API call,
// mirroring the pattern used for accessRequests / requestQueue elsewhere.
const mockStaffAccounts: StaffAccount[] = [
    { id: '1', name: 'Maria Lopez', role: 'Records Officer', email: 'mary@gmail.com', status: 'active', dateAdded: '07-11-26' },
    { id: '2', name: 'John Cruz', role: 'Assessment Clerk', email: 'johnny@gmail.com', status: 'inactive', dateAdded: '04-05-26' },
    { id: '3', name: 'Anne Reyes', role: 'Assessment Clerk', email: 'unnie@gmail.com', status: 'inactive', dateAdded: '07-15-26' },
    { id: '4', name: 'Carlo Gomez', role: 'Records Officer', email: 'olrac@gmail.com', status: 'active', dateAdded: '06-27-26' },
];

interface StaffAccountsProps {
    user: User;
    onAddStaff?: () => void;
    onManageStaff?: (staffId: string) => void;
}

export function StaffAccounts({ user, onAddStaff, onManageStaff }: StaffAccountsProps) {
    const [staff] = useState<StaffAccount[]>(mockStaffAccounts);
    const [searchQuery, setSearchQuery] = useState('');
    const activeCount = staff.filter((s) => s.status === 'active').length;

    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;

    const filteredStaff = staff.filter((member) => {
        const query = searchQuery.toLowerCase();
        return (
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query) ||
            member.role.toLowerCase().includes(query)
        );
    });

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
                        <span className="active-count-pill">{activeCount} Active</span>
                    </div>
                    <button className="admin-add-btn" onClick={onAddStaff}>
                        + Add Staff
                    </button>
                </div>

                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Date Added</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((member) => (
                                <tr key={member.id}>
                                    <td><strong>{member.name}</strong></td>
                                    <td>{member.email}</td>
                                    <td>{member.role}</td>
                                    <td>
                                        <span className={`status-indicator ${member.status}`}>
                                            <span className="status-dot" />
                                            {member.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{member.dateAdded}</td>
                                    <td>
                                        <button
                                            className="staff-manage-btn"
                                            onClick={() => onManageStaff?.(member.id)}
                                        >
                                            Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}