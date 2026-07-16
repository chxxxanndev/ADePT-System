import { useState } from 'react';
import '../styles/RequestQueue.css';
import { SearchIcon } from '../components/icons';
import type { User } from '../../auth-folder/types/auth';

type RequestStatus = 'Approved' | 'Disapproved' | 'Pending' | 'Certified' | 'Processing';

interface DocumentRequest {
    id: string;
    controlNo: string;
    citizen: string;
    document: string;
    assignedStaff: string;
    status: RequestStatus;
    date: string;
}

// TODO: replace with real data from a useRequestQueue hook / API call
const mockRequests: DocumentRequest[] = [
    { id: '1', controlNo: '2026-ADR', citizen: 'Zacarias Jacob', document: 'Tax declaration', assignedStaff: 'Linda', status: 'Approved', date: 'Jul 11' },
    { id: '2', controlNo: '2027-ADR', citizen: 'Elizabeth Santos', document: 'Landholding', assignedStaff: 'Josephine', status: 'Disapproved', date: 'Jul 17' },
    { id: '3', controlNo: '2028-ADR', citizen: 'Maria Montoon', document: 'No landholding', assignedStaff: 'Emilio', status: 'Pending', date: 'Jul 17' },
    { id: '4', controlNo: '2029-ADR', citizen: 'Mister Bean', document: 'Tax declaration', assignedStaff: 'Laurel', status: 'Approved', date: 'Jul 20' },
    { id: '5', controlNo: '2030-ADR', citizen: 'Priscilla Uy', document: 'Cert. true copy', assignedStaff: 'Linda', status: 'Certified', date: 'Jul 21' },
];

type TabKey = 'all' | 'pending' | 'processing' | 'approved' | 'disapproved';

const TAB_STATUS_MAP: Record<Exclude<TabKey, 'all'>, RequestStatus> = {
    pending: 'Pending',
    processing: 'Processing',
    approved: 'Approved',
    disapproved: 'Disapproved',
};

interface RequestQueueProps {
    user: User;
}

export function RequestQueue({ user }: RequestQueueProps) {
    const [requests] = useState<DocumentRequest[]>(mockRequests);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fullName = `${user.firstName || 'Vicente'} ${user.lastName || 'Desoy'}`;
    const initials = `${user.firstName?.[0] || 'V'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin';
    const countFor = (status: RequestStatus) => requests.filter((r) => r.status === status).length;

    const tabs: { key: TabKey; label: string; count: number | null }[] = [
        { key: 'all', label: 'All', count: null },
        { key: 'pending', label: 'Pending', count: countFor('Pending') },
        { key: 'processing', label: 'Processing', count: countFor('Processing') },
        { key: 'approved', label: 'Approved', count: countFor('Approved') },
        { key: 'disapproved', label: 'Disapproved', count: countFor('Disapproved') },
    ];

    const filteredRequests = requests.filter((req) => {
        const matchesTab = activeTab === 'all' || req.status === TAB_STATUS_MAP[activeTab];
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            req.controlNo.toLowerCase().includes(query) ||
            req.citizen.toLowerCase().includes(query) ||
            req.document.toLowerCase().includes(query) ||
            req.assignedStaff.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
    });

    return (
        <div className="request-queue-page">
            {/* Page header */}
            <div className="rq-page-header">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Request Queue</h1>
                        <p className="rq-page-subtitle">Track citizen document requests from submission to release.</p>
                    </div>

                    <div className="admin-profile-widget">
                        <div className="profile-widget-avatar-container">
                            {initials}
                        </div>
                        <div className="profile-widget-info">
                            <span className="profile-widget-name">{fullName}</span>
                            <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                            <div className="profile-widget-meta">
                                <span className="profile-widget-role">{roleLabel}</span>
                                <span>Last Login : Today • 8:12 AM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search bar */}
                <div className="rq-search-wrapper">
                    <input
                        type="text"
                        className="rq-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="rq-search-icon">
                        <SearchIcon size={16} />
                    </span>
                </div>
            </div>

            {/* Card */}
            <div className="admin-card rq-card">
                <div className="rq-tabs-row">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`rq-tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                            {tab.count !== null && <span className="rq-tab-count"> ({tab.count})</span>}
                        </button>
                    ))}
                </div>

                <div className="admin-table-container">
                    <table className="admin-table rq-table">
                        <thead>
                            <tr>
                                <th>Control No.</th>
                                <th>Citizen</th>
                                <th>Document</th>
                                <th>Assigned Staff</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.map((req) => (
                                <tr key={req.id}>
                                    <td className="rq-control-no">{req.controlNo}</td>
                                    <td><strong>{req.citizen}</strong></td>
                                    <td className="rq-document-cell">{req.document}</td>
                                    <td>{req.assignedStaff}</td>
                                    <td>
                                        <span className={`status-indicator rq-status-${req.status.toLowerCase()}`}>
                                            <span className="status-dot" />
                                            {req.status}
                                        </span>
                                    </td>
                                    <td>{req.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}