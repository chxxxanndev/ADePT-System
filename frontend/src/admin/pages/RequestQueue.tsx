import { useEffect, useState, useCallback } from 'react';
import '../styles/RequestQueue.css';
import { SearchIcon } from '../components/icons';
import { RefreshIcon } from '../../users/components/icons';
import type { User } from '../../auth-folder/types/auth';
// 1. Updated Imports: Removed authHeaders, Added api
import { api, requestService } from '../../users/services/requestService';

// 2. Removed hardcoded API_BASE

type RequestStatus = 'Pending' | 'Processing' | 'Payment Verified' | 'Released' | 'Void' | 'Cancelled';

interface DocumentRequest {
    id: string;
    referenceNo: string;
    clientName: string;
    documentType: string;
    assignedStaff: string;
    releasedStaff: string;
    status: RequestStatus;
    date: string;
    isReprint: boolean;
    voidReason?: string;
    voidedAt?: string | null;
    cancelledAt?: string | null;
    hasBeenAmended?: boolean;
    amendedFromId?: string | null;
}

type TabKey = 'all' | 'pending' | 'processing' | 'released' | 'void' | 'amend';

interface RequestQueueProps {
    user: User;
}

const STATUS_TAB_MAP: Record<TabKey, RequestStatus[]> = {
    all: [],
    pending: ['Pending', 'Payment Verified'],
    processing: ['Processing'],
    released: ['Released'],
    void: ['Void', 'Cancelled'],
    amend: [],
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
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
    const [amending, setAmending] = useState(false);
    const [amendError, setAmendError] = useState<string | null>(null);
    const [amendResult, setAmendResult] = useState<string | null>(null);

    const openReasonPopup = (req: DocumentRequest) => {
        setAmendError(null);
        setAmendResult(null);
        setSelectedRequest(req);
    };

    const closeReasonPopup = () => setSelectedRequest(null);

    const handleAmend = async () => {
        if (!selectedRequest || selectedRequest.hasBeenAmended || amending) return;
        setAmending(true);
        setAmendError(null);
        try {
            const result = await requestService.amendRequest(selectedRequest.id);
            setAmendResult(result?.request?.reference_number || selectedRequest.referenceNo);
            void fetchRequests(true);
        } catch (err: any) {
            setAmendError(
                err?.response?.data?.error || err?.message || 'Failed to amend the request.'
            );
        } finally {
            setAmending(false);
        }
    };

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'A';
    const roleLabel =
        user.role === 'SUPER_ADMIN' ? 'Super Admin' :
        user.role === 'ADMIN' ? 'Admin' :
        user.role === 'OFFICE_STAFF' ? 'Office Staff' :
        user.role || 'Staff';

    /**
     * 3. Updated fetchRequests to use standardized 'api'
     */
    const fetchRequests = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            // Standardized call to /requests/dashboard-metrics
            const res = await api.get('/requests/dashboard-metrics');
            const data = res.data;

            const queue: DocumentRequest[] = (data.requestQueue || []).map((r: any) => ({
                id: r.id,
                referenceNo: r.referenceNo || r.reference_number || `REF-${r.id?.slice(0, 6).toUpperCase()}`,
                clientName: r.clientName || r.declarant_name || 'Anonymous Declarant',
                documentType: r.documentType || 'N/A',
                assignedStaff: r.assignedStaff || 'Unassigned',
                releasedStaff: r.releasedStaff || 'Not Released',
                status: (r.status || 'Pending') as RequestStatus,
                date: r.date || '',
                isReprint: !!r.isReprint,
                voidReason: r.voidReason || undefined,
                voidedAt: r.voidedAt ?? null,
                cancelledAt: r.cancelledAt ?? null,
                hasBeenAmended: !!r.hasBeenAmended,
                amendedFromId: r.amendedFromId ?? null,
            }));
            setRequests(queue);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed to load request queue.';
            setError(errorMsg);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    // ... (Keep all mapping logic, pagination, and JSX exactly the same)
    
    // Count helpers
    const countForTab = (tab: TabKey) => {
        if (tab === 'all') return requests.length;
        if (tab === 'amend') return requests.filter(r => r.amendedFromId).length;
        return requests.filter(r => STATUS_TAB_MAP[tab].includes(r.status)).length;
    };

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending / Payment' },
        { key: 'processing', label: 'Processing' },
        { key: 'released', label: 'Released' },
        { key: 'void', label: 'Void / Cancelled' },
        { key: 'amend', label: 'Amend' },
    ];

    const filteredRequests = requests.filter((req) => {
        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'amend'
                ? !!req.amendedFromId
                : STATUS_TAB_MAP[activeTab].includes(req.status));
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            req.referenceNo.toLowerCase().includes(query) ||
            req.clientName.toLowerCase().includes(query) ||
            req.documentType.toLowerCase().includes(query) ||
            req.assignedStaff.toLowerCase().includes(query) ||
            req.releasedStaff.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredRequests.length);
    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

    useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery, rowsPerPage]);

    return (
        <div className="request-queue-page">
            <div className="rq-page-header">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Transaction Queue</h1>
                        <p className="rq-page-subtitle">Track the complete lifecycle of citizen document transactions — from request and processing through release, void or cancellation, and amendments.</p>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="rq-search-wrapper" style={{ flex: 1 }}>
                        <input
                            type="text"
                            className="rq-search-input"
                            placeholder="Search by reference, declarant, document or staff…"
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

            <div className="admin-card rq-card">
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
                                    <th>Declarant</th>
                                    <th>Document Type</th>
                                    <th>Released Staff</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRequests.map((req) => (
                                    <tr key={req.id}>
                                        <td className="rq-control-no">{req.referenceNo}</td>
                                        <td><strong>{req.clientName}</strong></td>
                                        <td className="rq-document-cell">{req.documentType}</td>
                                        <td>{req.releasedStaff}</td>
                                        <td>
                                            {req.status === 'Void' || req.status === 'Cancelled' ? (
                                                <button
                                                    type="button"
                                                    className={`status-indicator rq-status-link ${statusPillClass(req.status)}`}
                                                    onClick={() => openReasonPopup(req)}
                                                    title={`View reason for ${req.status}`}
                                                >
                                                    <span className="status-dot" />
                                                    {req.status}
                                                </button>
                                            ) : (
                                                <span className={`status-indicator ${statusPillClass(req.status)}`}>
                                                    <span className="status-dot" />
                                                    {req.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="rq-date-cell">{req.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination footer */}
                {!loading && !error && filteredRequests.length > 0 && (
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
                            {startIndex + 1}{'\u2013'}{endIndex} of {filteredRequests.length}
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

            {selectedRequest && (
                <div className="rq-modal-overlay" onClick={() => setSelectedRequest(null)}>
                    <div
                        className="rq-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selectedRequest.status} reason`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="rq-modal-header">
                            <div>
                                <h2 className="rq-modal-title">
                                    {selectedRequest.status === 'Void' ? 'Voided Request' : 'Cancelled Request'}
                                </h2>
                                <p className="rq-modal-subtitle">
                                    {selectedRequest.referenceNo} · {selectedRequest.clientName}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rq-modal-close"
                                onClick={closeReasonPopup}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="rq-modal-section">
                            <p className="rq-modal-label">Reason</p>
                            <p className="rq-modal-reason">
                                {selectedRequest.voidReason || (
                                    selectedRequest.status === 'Cancelled'
                                        ? 'Cancelled from pending payment.'
                                        : 'No reason provided.'
                                )}
                            </p>
                        </div>

                        <div className="rq-modal-fields">
                            <div className="rq-modal-field">
                                <p className="rq-modal-label">Status</p>
                                <p className="rq-modal-value">
                                    <span className={`status-indicator ${statusPillClass(selectedRequest.status)}`}>
                                        <span className="status-dot" />
                                        {selectedRequest.status}
                                    </span>
                                </p>
                            </div>
                            <div className="rq-modal-field">
                                <p className="rq-modal-label">Document Type</p>
                                <p className="rq-modal-value">{selectedRequest.documentType}</p>
                            </div>
                            <div className="rq-modal-field">
                                <p className="rq-modal-label">Assigned Staff</p>
                                <p className="rq-modal-value">{selectedRequest.assignedStaff}</p>
                            </div>
                            <div className="rq-modal-field">
                                <p className="rq-modal-label">Released Staff</p>
                                <p className="rq-modal-value">{selectedRequest.releasedStaff}</p>
                            </div>
                            {(selectedRequest.voidedAt || selectedRequest.cancelledAt) && (
                                <div className="rq-modal-field">
                                    <p className="rq-modal-label">Date {selectedRequest.status === 'Void' ? 'Voided' : 'Cancelled'}</p>
                                    <p className="rq-modal-value">
                                        {new Date(selectedRequest.voidedAt || selectedRequest.cancelledAt || '').toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedRequest.status === 'Void' || selectedRequest.status === 'Cancelled' ? (
                            <div className="rq-modal-actions">
                                {amendResult ? (
                                    <div className="rq-modal-success">
                                        Amended as <strong>{amendResult}</strong> — a new draft request was created. Review and complete it to re-release the document.
                                    </div>
                                ) : (
                                    <>
                                        {amendError && <div className="rq-modal-error">{amendError}</div>}
                                        <button
                                            type="button"
                                            className="rq-modal-amend"
                                            onClick={handleAmend}
                                            disabled={amending || selectedRequest.hasBeenAmended}
                                        >
                                            {amending
                                                ? 'Amending…'
                                                : selectedRequest.hasBeenAmended
                                                    ? 'Already Amended'
                                                    : 'Amend Request'}
                                        </button>
                                    </>
                                )}
                                <button type="button" className="rq-modal-done" onClick={closeReasonPopup}>
                                    Done
                                </button>
                            </div>
                        ) : (
                            <button type="button" className="rq-modal-done" onClick={closeReasonPopup}>
                                Done
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}