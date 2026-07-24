import { useState } from 'react';
import '../styles/RequestQueue.css';
import { SearchIcon, ChevronDownIcon } from './icons';
import type { User } from '../../auth-folder/types/auth';

type RequestStatus = 'Pending' | 'Released';

interface DocumentRequest {
    id: string;
    controlNo: string;
    citizen: string;
    document: string;
    assignedStaff: string;
    status: RequestStatus;
    /** True when this row represents a reprint of a previously released document. */
    isReprint: boolean;
    date: string;
}

// TODO: replace with real data from a useRequestQueue hook / API call
const mockRequests: DocumentRequest[] = [
    { id: '1', controlNo: '2026-ADR', citizen: 'Zacarias Jacob', document: 'Tax declaration', assignedStaff: 'Linda', status: 'Released', isReprint: false, date: 'Jul 11' },
    { id: '2', controlNo: '2027-ADR', citizen: 'Elizabeth Santos', document: 'Landholding', assignedStaff: 'Josephine', status: 'Released', isReprint: true, date: 'Jul 17' },
    { id: '3', controlNo: '2028-ADR', citizen: 'Maria Montoon', document: 'No landholding', assignedStaff: 'Emilio', status: 'Pending', isReprint: false, date: 'Jul 17' },
    { id: '4', controlNo: '2029-ADR', citizen: 'Mister Bean', document: 'Tax declaration', assignedStaff: 'Laurel', status: 'Released', isReprint: false, date: 'Jul 20' },
    { id: '5', controlNo: '2030-ADR', citizen: 'Priscilla Uy', document: 'Cert. true copy', assignedStaff: 'Linda', status: 'Pending', isReprint: true, date: 'Jul 21' },
];

type TabKey = 'all' | 'pending' | 'released' | 'reprints';

interface AdminRequestQueueProps {
    user: User;
}

export function AdminRequestQueue({ user }: AdminRequestQueueProps) {
    const [requests] = useState<DocumentRequest[]>(mockRequests);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fullName = `${user.firstName || 'Vicente'} ${user.lastName || 'Desoy'}`;
    const initials = `${user.firstName?.[0] || 'V'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super admin' : user.role === 'OFFICE_STAFF' ? 'Office staff' : user.role || 'Super admin';

    const countForStatus = (status: RequestStatus) => requests.filter((r) => r.status === status).length;
    const countForReprints = () => requests.filter((r) => r.isReprint).length;

    const tabs: { key: TabKey; label: string; count: number | null }[] = [
        { key: 'all', label: 'All', count: null },
        { key: 'pending', label: 'Pending', count: countForStatus('Pending') },
        { key: 'released', label: 'Released', count: countForStatus('Released') },
        { key: 'reprints', label: 'Reprints', count: countForReprints() },
    ];

    const filteredRequests = requests.filter((req) => {
        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'reprints' ? req.isReprint : req.status === (activeTab === 'pending' ? 'Pending' : 'Released'));
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
            {/* Header */}
            <div className="rq-header-row">
                <div className="rq-header-title-group">
                    <h1 className="rq-page-title">Request queue</h1>
                    <p className="rq-page-subtitle">Track citizen document requests from submission to release.</p>
                </div>

                <div className="rq-header-actions">
                    <div className="rq-search-wrapper">
                        <input
                            type="text"
                            className="rq-search-input"
                            placeholder="Search records"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="rq-search-icon">
                            <SearchIcon size={16} />
                        </span>
                    </div>

                    {/* TODO: wire up to a real date-range control, mirroring AdminHeader's period dropdown */}
                    <button type="button" className="rq-date-btn">
                        <span>Today</span>
                        <ChevronDownIcon size={14} />
                    </button>

                    <div className="rq-profile-compact">
                        <div className="rq-profile-avatar">{initials}</div>
                        <div className="rq-profile-info">
                            <span className="rq-profile-name">{fullName}</span>
                            <span className="rq-profile-role">{roleLabel}</span>
                        </div>
                    </div>
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
                                        {req.isReprint ? (
                                            <div className="rq-status-stack">
                                                <span className={`rq-status-pill rq-status-${req.status.toLowerCase()}`}>
                                                    <span className="status-dot" />
                                                    {req.status}
                                                </span>
                                                <span className="rq-status-pill rq-status-reprint">
                                                    <span className="status-dot" />
                                                    Reprint
                                                </span>
                                            </div>
                                        ) : (
                                            <span className={`status-indicator rq-status-${req.status.toLowerCase()}`}>
                                                <span className="status-dot" />
                                                {req.status}
                                            </span>
                                        )}
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