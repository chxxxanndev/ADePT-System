import { useEffect, useState } from 'react';
import '../styles/RequestQueue.css';
import { SearchIcon, ChevronDownIcon } from './icons';
import type { User } from '../../auth-folder/types/auth';
// 1. Updated Imports: Removed authHeaders, Added api
import { api } from '../../users/services/requestService';

type RequestStatus = 'Pending' | 'Processing' | 'Payment Verified' | 'Released' | 'Void' | 'Cancelled';

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

type TabKey = 'all' | 'pending' | 'released' | 'reprints';

interface AdminRequestQueueProps {
    user: User;
}

export function AdminRequestQueue({ user }: AdminRequestQueueProps) {
    const [requests, setRequests] = useState<DocumentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLiveQueue = async () => {
            try {
                setLoading(true);

                const res = await api.get('/requests/registry');
                const data = res.data;
                
                if (data.transactions && Array.isArray(data.transactions)) {
                    const mapped: DocumentRequest[] = data.transactions.map((t: any) => {
                        let status: RequestStatus = 'Pending';
                        if (t.status === 'Released' || t.status === 'RELEASED') status = 'Released';
                        else if (t.status === 'Processing' || t.status === 'IN_PROGRESS') status = 'Processing';
                        else if (t.status === 'Payment Verified' || t.status === 'PAID') status = 'Payment Verified';
                        else if (t.status === 'Void' || t.status === 'VOID') status = 'Void';
                        else if (t.status === 'Cancelled' || t.status === 'CANCELLED') status = 'Cancelled';

                        return {
                            id: t.id,
                            controlNo: t.referenceNumber || `REF-${t.id.slice(0, 6).toUpperCase()}`,
                            citizen: t.client?.declarantName || t.client?.requestedBy || 'Anonymous',
                            document: (t.requestedDocuments && t.requestedDocuments.length > 0)
                                ? t.requestedDocuments.join(', ')
                                : 'No-Landholding Certificate',
                            assignedStaff: t.assignedStaff || 'Unassigned',
                            status,
                            isReprint: Boolean(t.isReprint),
                            date: t.dateRequested ? new Date(t.dateRequested).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today',
                        };
                    });
                    if (mapped.length > 0) {
                        setRequests(mapped);
                    }
                }
            } catch (err) {
                console.error("Admin Queue load failed:", err);
            } finally {
                setLoading(false);
            }
        };

        void fetchLiveQueue();
    }, []);

    // ... (All other logic and JSX remains exactly as you wrote it)
    const fullName = `${user.firstName || 'Vicente'} ${user.lastName || 'Desoy'}`;
    const initials = `${user.firstName?.[0] || 'V'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super admin' : user.role === 'OFFICE_STAFF' ? 'Office staff' : user.role || 'Super admin';

    const isPendingLike = (status: RequestStatus) =>
        status === 'Pending' || status === 'Processing' || status === 'Payment Verified';

    const countForStatusTab = (tab: TabKey) => {
        if (tab === 'all') return requests.length;
        if (tab === 'pending') return requests.filter((r) => isPendingLike(r.status)).length;
        if (tab === 'released') return requests.filter((r) => r.status === 'Released').length;
        if (tab === 'reprints') return requests.filter((r) => r.isReprint).length;
        return 0;
    };

    const tabs: { key: TabKey; label: string; count: number | null }[] = [
        { key: 'all', label: 'All', count: countForStatusTab('all') },
        { key: 'pending', label: 'Pending', count: countForStatusTab('pending') },
        { key: 'released', label: 'Released', count: countForStatusTab('released') },
        { key: 'reprints', label: 'Reprints', count: countForStatusTab('reprints') },
    ];

    const filteredRequests = requests.filter((req) => {
        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'reprints'
                ? req.isReprint
                : activeTab === 'pending'
                ? isPendingLike(req.status)
                : req.status === 'Released');

        const query = searchQuery.toLowerCase();
        const matchesSearch =
            req.controlNo.toLowerCase().includes(query) ||
            req.citizen.toLowerCase().includes(query) ||
            req.document.toLowerCase().includes(query) ||
            req.assignedStaff.toLowerCase().includes(query) ||
            req.status.toLowerCase().includes(query);

        return matchesTab && matchesSearch;
    });

    const getStatusCssClass = (status: RequestStatus) => {
        switch (status) {
            case 'Released': return 'rq-status-released';
            case 'Processing': return 'rq-status-processing';
            case 'Payment Verified': return 'rq-status-payment-verified';
            case 'Void': return 'rq-status-void';
            case 'Cancelled': return 'rq-status-cancelled';
            default: return 'rq-status-pending';
        }
    };

    return (
        <div className="request-queue-page">
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
                            {loading && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#9aa0af' }}>
                                        Loading document requests...
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#9aa0af' }}>
                                        No document requests match your filter or search query.
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredRequests.map((req) => (
                                <tr key={req.id}>
                                    <td className="rq-control-no">{req.controlNo}</td>
                                    <td><strong>{req.citizen}</strong></td>
                                    <td className="rq-document-cell">{req.document}</td>
                                    <td>{req.assignedStaff}</td>
                                    <td>
                                        {req.isReprint ? (
                                            <div className="rq-status-stack">
                                                <span className={`rq-status-pill ${getStatusCssClass(req.status)}`}>
                                                    <span className="status-dot" />
                                                    {req.status}
                                                </span>
                                                <span className="rq-status-pill rq-status-reprint">
                                                    <span className="status-dot" />
                                                    Reprint
                                                </span>
                                            </div>
                                        ) : (
                                            <span className={`status-indicator ${getStatusCssClass(req.status)}`}>
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