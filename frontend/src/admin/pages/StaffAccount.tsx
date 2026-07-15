import { useState } from 'react';

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
    { id: '1', name: 'Maria Lopez', role: 'Records officer', email: 'm.lopez@zamboangadelnorte.gov.ph', status: 'active', dateAdded: 'Jan 12, 2025' },
    { id: '2', name: 'John Cruz', role: 'Assessment clerk', email: 'j.cruz@zamboangadelnorte.gov.ph', status: 'active', dateAdded: 'Jul 14, 2026' },
    { id: '3', name: 'Anne Reyes', role: 'Records officer', email: 'a.reyes@zamboangadelnorte.gov.ph', status: 'active', dateAdded: 'Mar 3, 2025' },
    { id: '4', name: 'Carlo Gomez', role: 'Assessment clerk', email: 'c.gomez@zamboangadelnorte.gov.ph', status: 'inactive', dateAdded: 'Sep 20, 2024' },
];

interface StaffAccountsProps {
    onAddStaff?: () => void;
    onManageStaff?: (staffId: string) => void;
}

export function StaffAccounts({ onAddStaff, onManageStaff }: StaffAccountsProps) {
    const [staff] = useState<StaffAccount[]>(mockStaffAccounts);
    const activeCount = staff.filter((s) => s.status === 'active').length;

    return (
        <div className="admin-card staff-accounts-card">
            <div className="staff-accounts-header-row">
                <div className="staff-accounts-title-group">
                    <h2 className="admin-card-title">Staff accounts</h2>
                    <span className="active-count-pill">{activeCount} active</span>
                </div>
                <button className="admin-add-btn" onClick={onAddStaff}>
                    + Add staff
                </button>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Date added</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map((member) => (
                            <tr key={member.id}>
                                <td><strong>{member.name}</strong></td>
                                <td>{member.role}</td>
                                <td>{member.email}</td>
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
    );
}