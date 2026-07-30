import { useEffect, useState, useCallback } from 'react';
import '../styles/RequestQueue.css';
import { SearchIcon } from '../components/icons';
import { RefreshIcon } from '../../users/components/icons';
import type { User } from '../../auth-folder/types/auth';
import { authHeaders } from '../services/userManagementService';

const API_BASE = 'http://localhost:5000/api/requests';

type RequestStatus = 'Pending' | 'Processing' | 'Payment Verified' | 'Released' | 'Void' | 'Cancelled';

interface DocumentRequest {
    id: string;
    referenceNo: string;
    clientName: string;
    documentType: string;
    assignedStaff: string;
    status: RequestStatus;
    date: string;
    isReprint: boolean;
}

type TabKey = 'all' | 'pending' | 'processing' | 'released' | 'void';

interface RequestQueueProps {
    user: User;
}

const STATUS_TAB_MAP: Record<TabKey, RequestStatus[]> = {
    all: [],
    pending: ['Pending', 'Payment Verified'],
    processing: ['Processing'],
    released: ['Released'],
    void: ['Void', 'Cancelled'],
};

function statusPillClass(status: RequestStatus): string {
    switch (status) {
        case 'Released': return 'rq-status-released';
        case 'Processing': return 'rq-status-processing';
        case 'Payment Verified': return 'rq-status-paid';
        case 'Void':
        case 'Cancelled': return 'rq-status-void';
        default: return 'rq-status-pending';
    }
}

export function RequestQueue({ user }: RequestQueueProps) {
    const [requests, setRequests] = useState<DocumentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'A';
    const roleLabel =
        user.role === 'SUPER_ADMIN' ? 'Super Admin' :
        user.role === 'ADMIN' ? 'Admin' :
        user.role === 'OFFICE_STAFF' ? 'Office Staff' :
        user.role || 'Staff';

    const fetchRequests = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const headers = await authHeaders();
            const res = await fetch(`${API_BASE}/dashboard-metrics`, { headers });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();

            const queue: DocumentRequest[] = (data.requestQueue || []).map((r: any) => ({
                id: r.id,
                referenceNo: r.referenceNo || r.reference_number || `REF-${r.id?.slice(0, 6).toUpperCase()}`,
                clientName: r.clientName || r.declarant_name || 'Anonymous Client',
                documentType: r.documentType || 'N/A',
                assignedStaff: r.assignedStaff || 'Unassigned',
                status: (r.status || 'Pending') as RequestStatus,
                date: r.date || '',
                isReprint: !!r.isReprint,
            }));
            setRequests(queue);
        } catch (err: any) {
            setError(err.message || 'Failed to load request queue.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    // Count helpers
    const countForTab = (tab: TabKey) => {
        if (tab === 'all') return requests.length;
        return requests.filter(r => STATUS_TAB_MAP[tab].includes(r.status)).length;
    };

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending / Payment' },
        { key: 'processing', label: 'Processing' },
        { key: 'released', label: 'Released' },
        { key: 'void', label: 'Void / Cancelled' },
    ];

    const filteredRequests = requests.filter((req) => {
        const matchesTab =
            activeTab === 'all' ||
            STATUS_TAB_MAP[activeTab].includes(req.status);
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            req.referenceNo.toLowerCase().includes(query) ||
            req.clientName.toLowerCase().includes(query) ||
            req.documentType.toLowerCase().includes(query) ||
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

                    <div className="admin-profile-widget audit-user-chip">
                        <div className="profile-widget-avatar-container audit-user-avatar">
                            {user.avatarUrl
                                ? <img src={user.avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : initials}
                        </div>
                        <div className="profile-widget-info audit-user-info">
                            <span className="profile-widget-name audit-user-name">{fullName}</span>
                            <span className="profile-widget-role">{roleLabel}</span>
                        </div>
                    </div>
                </div>

                {/* Search + Refresh row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="rq-search-wrapper" style={{ flex: 1 }}>
                        <input
                            type="text"
                            className="rq-search-input"
                            placeholder="Search by reference, client, document or staff…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="rq-search-icon">
                            <SearchIcon size={16} />
                        </span>
                    </div>
                    <button
                        type="button"
                        className={`admin-refresh-btn${refreshing ? ' spinning' : ''}`}
                        onClick={() => void fetchRequests(true)}
                        disabled={refreshing || loading}
                        title="Refresh queue"
                    >
                        <RefreshIcon size={16} />
                    </button>
                </div>
            </div>

            {/* Card */}
            <div className="admin-card rq-card">
                {/* Summary pills */}
                <div className="rq-summary-pills">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`rq-tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                            <span className="rq-tab-count">({countForTab(tab.key)})</span>
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="admin-table-container">
                    {loading ? (
                        <div className="rq-state-message">
                            <div className="rq-spinner" />
                            <span>Loading requests…</span>
                        </div>
                    ) : error ? (
                        <div className="rq-state-message rq-state-error">
                            <span>⚠ {error}</span>
                            <button type="button" className="rq-retry-btn" onClick={() => void fetchRequests()}>
                                Retry
                            </button>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="rq-state-message rq-state-empty">
                            {searchQuery
                                ? `No results for "${searchQuery}".`
                                : activeTab === 'all'
                                    ? 'No document requests found.'
                                    : `No ${tabs.find(t => t.key === activeTab)?.label.toLowerCase()} requests found.`}
                        </div>
                    ) : (
                        <table className="admin-table rq-table">
                            <thead>
                                <tr>
                                    <th>Reference No.</th>
                                    <th>Client</th>
                                    <th>Document Type</th>
                                    <th>Assigned Staff</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="rq-control-no">{req.referenceNo}</td>
                                        <td><strong>{req.clientName}</strong></td>
                                        <td className="rq-document-cell">{req.documentType}</td>
                                        <td>{req.assignedStaff}</td>
                                        <td>
                                            <span className={`status-indicator ${statusPillClass(req.status)}`}>
                                                <span className="status-dot" />
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>{req.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer count */}
                {!loading && !error && (
                    <div className="rq-footer-count">
                        Showing {filteredRequests.length} of {requests.length} total requests
                    </div>
                )}
            </div>
        </div>
    );
}