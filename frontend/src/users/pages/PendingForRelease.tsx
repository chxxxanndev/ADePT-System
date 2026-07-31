import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import '../styles/PendingPayment.css'; // reusing pp-* classes — layout is identical

// releaseRequest() writes status: 'PAID' when the O.R. is locked in — there's
// no separate "pending release" status in the schema. PAID *is* the release
// queue: RELEASED is what markAsReleased() moves it to afterward.
const RELEASE_QUEUE_STATUS = 'PAID';

const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const InboxIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
const UserIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const StaffIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>;
const ProcessIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const XIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

function resolveDocTypeName(req: any): string {
    if (req.request_documents && req.request_documents.length > 0) {
        return req.request_documents.map((rd: any) => rd.document_types?.name).filter(Boolean).join(', ');
    }
    const ref = req.reference_number || "";
    if (ref.startsWith('NLH')) return 'Certificate of No Landholding';
    if (ref.startsWith('LH')) return 'Certificate of Landholding';
    return 'Certified True Tax Declaration';
}

export function PendingForRelease({ onSelectPayment }: any) {
    const [groupedReleases, setGroupedReleases] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchLiveReleases = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setIsRefreshing(true);
            else setLoading(true);

            const rawRequests = await requestService.getRequests();
            if (Array.isArray(rawRequests)) {
                const pending = rawRequests.filter((r: any) => r.status === RELEASE_QUEUE_STATUS);

                const grouped = pending.reduce((acc: any, req: any) => {
                    const requester = req.requested_by_name || req.requestedByName || 'Unknown Client';

                    if (!acc[requester]) {
                        acc[requester] = {
                            groupId: req.id,
                            requesterName: requester,
                            dateRequested: req.request_date || 'N/A',
                            // Set by releaseRequest() when this request moved out of
                            // the payment queue — lets PaymentDetails skip straight
                            // to the RELEASE step instead of re-asking for an O.R.
                            orNumber: req.or_number || '',
                            documents: []
                        };
                    }

                    acc[requester].documents.push({
                        id: req.id,
                        referenceNumber: req.reference_number || "REF-PENDING",
                        declarantName: req.declarant_name || 'N/A',
                        requestedByName: req.requested_by_name || req.requestedByName || requester,
                        propertyLocation: req.property_location || '',
                        documentType: resolveDocTypeName(req),
                        encodedByStaff: req.encoded_by_staff_name || req.encodedByStaffName || null,
                    });

                    return acc;
                }, {});

                setGroupedReleases(Object.values(grouped));
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchLiveReleases(); }, []);

    const filtered = groupedReleases.filter(p =>
        p.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.orNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.documents.some((d: any) => d.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.declarantName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedGroups = filtered.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const totalDocs = groupedReleases.reduce((sum, g) => sum + g.documents.length, 0);

    return (
        <div className="pp-container page-transition">
            <div className="pp-header-card">
                <div className="pp-header-top">
                    <div className="pp-header-titles">
                        <h1 className="pp-title">Pending for Release</h1>
                        <p className="pp-subtitle">Payments verified and documents generated — awaiting physical release to the client.</p>
                    </div>
                    <button
                        className={`pp-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
                        onClick={() => fetchLiveReleases(true)}
                        title="Refresh queue"
                        aria-label="Refresh queue"
                    >
                        <RefreshIcon />
                    </button>
                </div>

                <div className="pp-stats-row">
                    <div className="pp-stat-chip">
                        <strong>{groupedReleases.length}</strong>
                        <span>Clients waiting</span>
                    </div>
                    <div className="pp-stat-chip">
                        <strong>{totalDocs}</strong>
                        <span>Documents</span>
                    </div>
                </div>
            </div>

            <div className="pp-table-card">
                <div className="pp-table-toolbar">
                    <div className="pp-toolbar-left">
                        <div className="pp-toolbar-search">
                            <SearchIcon />
                            <input
                                id="releaseSearch"
                                name="releaseSearch"
                                type="text"
                                className="pp-toolbar-search-input"
                                placeholder="Search by Client, Declarant, O.R., or Ref No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="pp-search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
                                    <XIcon />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pp-table-scroll">
                    <table className="pp-table">
                        <thead>
                            <tr>
                                <th style={{ width: '16%' }}>Reference No.</th>
                                <th style={{ width: '20%' }}>Declarant(s)</th>
                                <th style={{ width: '15%' }}>Requested By</th>
                                <th style={{ width: '14%' }}>Encoded By Staff</th>
                                <th style={{ width: '13%' }}>O.R. Number</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Date</th>
                                <th style={{ width: '12%', textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: Math.min(itemsPerPage, 4) }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={7} style={{ padding: 0 }}>
                                            <div className="pp-skeleton-row">
                                                <div className="pp-skeleton-block" style={{ width: '18%' }} />
                                                <div className="pp-skeleton-block" style={{ width: '28%' }} />
                                                <div className="pp-skeleton-block" style={{ width: '10%' }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="pp-empty-state">
                                            <InboxIcon />
                                            <span className="pp-empty-title">
                                                {searchQuery ? 'No matching releases' : 'Nothing waiting for release'}
                                            </span>
                                            <span className="pp-empty-sub">
                                                {searchQuery
                                                    ? `Nothing matches "${searchQuery}".`
                                                    : 'Verified payments will appear here once documents are generated.'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedGroups.map((group) => (
                                    <tr key={group.groupId} className="pp-row">
                                        <td className="pp-cell" data-label="Reference No.">
                                            <div className="pp-doc-count-label">
                                                {group.documents.length} document{group.documents.length !== 1 && 's'}
                                            </div>
                                            <div className="pp-ref-list">
                                                {group.documents.map((d: any, i: number) => (
                                                    <div className="pp-doc-line" key={i}>
                                                        <span className="pp-ref-chip" title={d.documentType}>{d.referenceNumber}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="pp-cell" data-label="Declarant(s)">
                                            <div className="pp-doc-count-label pp-doc-count-label--spacer">&nbsp;</div>
                                            <div className="pp-declarant-list">
                                                {group.documents.map((d: any, i: number) => (
                                                    <div className="pp-doc-line" key={i}>
                                                        <span className="pp-doc-declarant" title={d.declarantName}><UserIcon />{d.declarantName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="pp-cell" data-label="Requested By">
                                            <div className="pp-doc-count-label pp-doc-count-label--spacer">&nbsp;</div>
                                            <div className="pp-client-info">
                                                <span className="pp-client-name" title={group.requesterName}>{group.requesterName}</span>
                                            </div>
                                        </td>
                                        <td className="pp-cell" data-label="Encoded By Staff">
                                            <div className="pp-doc-count-label pp-doc-count-label--spacer">&nbsp;</div>
                                            <div className="pp-declarant-list">
                                                {group.documents.map((d: any, i: number) => (
                                                    <div className="pp-doc-line" key={i}>
                                                        <span className="pp-doc-declarant pp-doc-declarant--staff" title={d.encodedByStaff || 'Not yet recorded'}>
                                                            <StaffIcon />{d.encodedByStaff || '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="pp-cell" data-label="O.R. Number">
                                            <span className="pp-amount">{group.orNumber || '—'}</span>
                                        </td>
                                        <td className="pp-cell" data-label="Date" style={{ textAlign: 'center' }}>
                                            <span className="pp-date">{group.dateRequested}</span>
                                        </td>
                                        <td className="pp-cell" style={{ textAlign: 'right', paddingRight: '24px' }}>
                                            <div className="pp-actions">
                                                <button className="pp-btn-process" onClick={() => onSelectPayment(group)}>
                                                    Release <ProcessIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <div className="pp-pagination-footer">
                        <div className="pp-pagination-left">
                            <span className="pp-pagination-label">Rows per page:</span>
                            <select className="pp-items-per-page" value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="pp-pagination-center">
                            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length}
                        </div>
                        <div className="pp-pagination-right">
                            <button className="pp-page-btn-text" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Previous</button>
                            <span className="pp-page-current">Page {currentPage} of {totalPages || 1}</span>
                            <button className="pp-page-btn-text" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0}>Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}