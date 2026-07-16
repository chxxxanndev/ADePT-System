import { useState } from 'react';
import '../styles/StaffAccounts.css';

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
    onAddStaff?: () => void;
    onManageStaff?: (staffId: string) => void;
}

export function StaffAccounts({ onAddStaff, onManageStaff }: StaffAccountsProps) {
    const [staff] = useState<StaffAccount[]>(mockStaffAccounts);
    const [searchQuery, setSearchQuery] = useState('');
    const activeCount = staff.filter((s) => s.status === 'active').length;

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
                                <th></th>
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