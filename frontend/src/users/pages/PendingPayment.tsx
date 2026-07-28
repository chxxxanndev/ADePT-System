import { useState, useEffect, useMemo } from 'react';
import { requestService } from '../services/requestService';
import '../styles/PendingPayment.css';

// --- ICONS ---
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ArchiveIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
const ProcessIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const InboxIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
const CheckSquareIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
const UserIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const StaffIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>;
const XIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="6" y1="18" x2="18" y2="6" /></svg>;
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l3 3v17H6z" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg>;

function getRefTypeIcon(referenceNumber: string) {
    const ref = referenceNumber || "";
    if (ref.startsWith('NLH')) return <NoLandholdingIcon />;
    if (ref.startsWith('LH')) return <LandholdingIcon />;
    if (ref.startsWith('TD')) return <TaxDeclarationIcon />;
    return null;
}

function getRefChipClass(referenceNumber: string): string {
    const ref = referenceNumber || "";
    if (ref.startsWith('NLH')) return 'pp-ref-chip--nlh';
    if (ref.startsWith('LH')) return 'pp-ref-chip--lh';
    if (ref.startsWith('TD')) return 'pp-ref-chip--td';
    return '';
}

function resolveDocTypeName(req: any): string {
    if (req.request_documents && req.request_documents.length > 0) {
        return req.request_documents.map((rd: any) => rd.document_types?.name).filter(Boolean).join(', ');
    }
    const ref = req.reference_number || "";
    if (ref.startsWith('NLH')) return 'Certificate of No Landholding';
    if (ref.startsWith('LH')) return 'Certificate of Landholding';
    return 'Certified True Tax Declaration';
}

export function PendingPayment({ onSelectPayment }: any) {
    const [groupedPayments, setGroupedPayments] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Selection states
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmTarget, setConfirmTarget] = useState<{ groups: any[]; label: string } | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchLivePayments = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setIsRefreshing(true);
            else setLoading(true);

            const rawRequests = await requestService.getRequests();
            if (Array.isArray(rawRequests)) {
                const pending = rawRequests.filter((r: any) => r.status === 'PENDING_PAYMENT');

                const grouped = pending.reduce((acc: any, req: any) => {
                    const requester = req.requested_by_name || req.requestedByName || 'Unknown Client';

                    if (!acc[requester]) {
                        acc[requester] = {
                            groupId: req.id,
                            requesterName: requester,
                            dateRequested: req.request_date || 'N/A',
                            totalAmountDue: 0,
                            documents: []
                        };
                    }

                    acc[requester].documents.push({
                        id: req.id,
                        referenceNumber: req.reference_number || "REF-PENDING",
                        declarantName: req.declarant_name || 'N/A',
                        requestedByName: req.requested_by_name || req.requestedByName || requester, // ADDED THIS
                        propertyLocation: req.property_location || '', // ADDED THIS
                        documentType: resolveDocTypeName(req),
                        encodedByStaff: req.encoded_by_staff_name || req.encodedByStaffName || null,
                        amountDue: 40.00
                    });

                    acc[requester].totalAmountDue += 40.00;
                    return acc;
                }, {});

                setGroupedPayments(Object.values(grouped));
                // Only reset selection if it's a hard fresh load, otherwise keep selected (for UX)
                if (!isManualRefresh) setSelectedIds(new Set());
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchLivePayments(); }, []);

    // Filter by search
    const filtered = groupedPayments.filter(p =>
        p.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.documents.some((d: any) => d.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.declarantName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Reset pagination when search query or items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedGroups = filtered.slice(startIndex, startIndex + itemsPerPage);

    // Fix edge case where archiving the last item on a page leaves you on an empty page
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const summary = useMemo(() => {
        const totalDocs = groupedPayments.reduce((sum, g) => sum + g.documents.length, 0);
        const totalAmount = groupedPayments.reduce((sum, g) => sum + g.totalAmountDue, 0);
        return { clients: groupedPayments.length, docs: totalDocs, amount: totalAmount };
    }, [groupedPayments]);

    const columnCount = selectionMode ? 8 : 7;

    const toggleSelect = (groupId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
            return next;
        });
    };

    // SMART SELECT ALL: Only toggles visible items on the current page
    const toggleSelectCurrentPage = () => {
        const allVisibleSelected = paginatedGroups.every(g => selectedIds.has(g.groupId));

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                // Deselect visible
                paginatedGroups.forEach(g => next.delete(g.groupId));
            } else {
                // Select visible
                paginatedGroups.forEach(g => next.add(g.groupId));
            }
            return next;
        });
    };

    const enterSelectionMode = () => setSelectionMode(true);
    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const runArchive = async (groups: any[]) => {
        setIsArchiving(true);
        try {
            const allDocs = groups.flatMap(g => g.documents);
            await Promise.all(allDocs.map((doc: any) =>
                requestService.updateRequest(doc.id, { status: 'ARCHIVED' })
            ));
            const archivedIds = new Set(groups.map(g => g.groupId));
            setGroupedPayments(prev => prev.filter(p => !archivedIds.has(p.groupId)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                archivedIds.forEach(id => next.delete(id));
                return next;
            });
        } catch (error) {
            alert("Archive failed. Please check your connection and try again.");
        } finally {
            setIsArchiving(false);
            setConfirmTarget(null);
        }
    };

    const requestArchiveOne = (e: React.MouseEvent, group: any) => {
        e.stopPropagation();
        setConfirmTarget({ groups: [group], label: `all ${group.documents.length} pending document(s) for ${group.requesterName}` });
    };

    const requestArchiveSelected = () => {
        const groups = groupedPayments.filter(g => selectedIds.has(g.groupId));
        const docCount = groups.reduce((sum, g) => sum + g.documents.length, 0);
        setConfirmTarget({ groups, label: `${docCount} document(s) across ${groups.length} client(s)` });
    };

    const selectedCount = selectedIds.size;
    const allVisibleSelected = paginatedGroups.length > 0 && paginatedGroups.every(g => selectedIds.has(g.groupId));
    const currency = (n: number) => `\u20B1 ${n.toFixed(2)}`;

    return (
        <div className="pp-container page-transition">
            {/* --- HEADER CARD --- */}
            <div className="pp-header-card">
                <div className="pp-header-top">
                    <div className="pp-header-titles">
                        <span className="pp-suptitle">Verify payments using Official Receipts issued by the Treasurer's Office.</span>
                        <h1 className="pp-title">Payment Verification Queue</h1>
                        <p className="pp-subtitle">Process bulk payments grouped by client request</p>
                    </div>
                    <button
                        className={`pp-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
                        onClick={() => fetchLivePayments(true)}
                        title="Refresh queue"
                        aria-label="Refresh queue"
                    >
                        <RefreshIcon />
                    </button>
                </div>

                <div className="pp-stats-row">
                    <div className="pp-stat-chip">
                        <strong>{summary.clients}</strong>
                        <span>Clients waiting</span>
                    </div>
                    <div className="pp-stat-chip">
                        <strong>{summary.docs}</strong>
                        <span>Documents</span>
                    </div>
                    <div className="pp-stat-chip pp-stat-chip--amount">
                        <strong>{currency(summary.amount)}</strong>
                        <span>Total due</span>
                    </div>
                </div>

                <div className="pp-legend-row">
                    <div className="pp-legend-item pp-legend-item--lh"><LandholdingIcon />Landholding</div>
                    <div className="pp-legend-item pp-legend-item--nlh"><NoLandholdingIcon />No Landholding</div>
                    <div className="pp-legend-item pp-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
                </div>
            </div>

            {/* --- TABLE CARD --- */}
            <div className="pp-table-card">
                <div className={`pp-table-toolbar${selectionMode ? ' is-active' : ''}`}>
                    <div className="pp-toolbar-left">
                        <div className="pp-toolbar-search">
                            <SearchIcon />
                            <input
                                id="paymentSearch"
                                name="paymentSearch"
                                type="text"
                                className="pp-toolbar-search-input"
                                placeholder="Search by Client, Declarant, or Ref No..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="pp-search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
                                    <XIcon />
                                </button>
                            )}
                        </div>
                        {selectionMode && (
                            <span className="pp-table-toolbar-text">
                                {selectedCount > 0
                                    ? `${selectedCount} client${selectedCount !== 1 ? 's' : ''} selected across all pages`
                                    : 'Tap a row to select it for archiving'}
                            </span>
                        )}
                    </div>
                    <div className="pp-table-toolbar-actions">
                        {selectionMode ? (
                            <>
                                <button className="pp-bulk-btn pp-bulk-btn--clear" onClick={exitSelectionMode}>
                                    Cancel
                                </button>
                                <button
                                    className="pp-bulk-btn pp-bulk-btn--archive"
                                    onClick={requestArchiveSelected}
                                    disabled={selectedCount === 0}
                                >
                                    <ArchiveIcon /> Archive selected
                                </button>
                            </>
                        ) : (
                            <button className="pp-select-toggle-btn" onClick={enterSelectionMode}>
                                <CheckSquareIcon />
                                Select
                            </button>
                        )}
                    </div>
                </div>

                <div className="pp-table-scroll">
                    <table className="pp-table">
                        <thead>
                            <tr>
                                {selectionMode && (
                                    <th className="pp-th-checkbox">
                                        <input
                                            type="checkbox"
                                            className="pp-checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectCurrentPage}
                                            aria-label="Select visible"
                                            title="Select all on this page"
                                        />
                                    </th>
                                )}
                                <th style={{ width: '15%' }}>Reference No.</th>
                                <th style={{ width: '19%' }}>Declarant(s)</th>
                                <th style={{ width: '15%' }}>Requested By</th>
                                <th style={{ width: '15%' }}>Encoded By Staff</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>Total Fee</th>
                                <th style={{ width: '10%', textAlign: 'center' }}>Date</th>
                                <th style={{ width: '16%', textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: Math.min(itemsPerPage, 4) }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={columnCount} style={{ padding: 0 }}>
                                            <div className="pp-skeleton-row">
                                                <div className="pp-skeleton-block" style={{ width: '18%' }} />
                                                <div className="pp-skeleton-block" style={{ width: '28%' }} />
                                                <div className="pp-skeleton-block" style={{ width: '10%' }} />
                                                <div className="pp-skeleton-block" style={{ width: '10%' }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : paginatedGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={columnCount}>
                                        <div className="pp-empty-state">
                                            <InboxIcon />
                                            <span className="pp-empty-title">
                                                {searchQuery ? 'No matching payments' : 'All caught up'}
                                            </span>
                                            <span className="pp-empty-sub">
                                                {searchQuery
                                                    ? `Nothing matches "${searchQuery}". Try a different name or reference number.`
                                                    : 'There are no pending payments in the queue right now.'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedGroups.map((group) => (
                                    <tr
                                        key={group.groupId}
                                        className={`pp-row${selectionMode ? ' is-selectable' : ''}${selectedIds.has(group.groupId) ? ' is-selected' : ''}`}
                                        onClick={selectionMode ? () => toggleSelect(group.groupId) : undefined}
                                    >
                                        {selectionMode && (
                                            <td className="pp-cell pp-cell-checkbox">
                                                <input
                                                    type="checkbox"
                                                    className="pp-checkbox"
                                                    checked={selectedIds.has(group.groupId)}
                                                    onChange={() => toggleSelect(group.groupId)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={`Select ${group.requesterName}`}
                                                />
                                            </td>
                                        )}

                                        <td className="pp-cell" data-label="Reference No.">
                                            <div className="pp-doc-count-label">
                                                {group.documents.length} document{group.documents.length !== 1 && 's'}
                                            </div>
                                            <div className="pp-ref-list">
                                                {group.documents.map((d: any, i: number) => (
                                                    <div className="pp-doc-line" key={i}>
                                                        <span
                                                            className={`pp-ref-chip ${getRefChipClass(d.referenceNumber)}`}
                                                            title={d.documentType}
                                                        >
                                                            {getRefTypeIcon(d.referenceNumber)}
                                                            {d.referenceNumber}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="pp-cell" data-label="Declarant(s)">
                                            <div className="pp-doc-count-label pp-doc-count-label--spacer">&nbsp;</div>
                                            <div className="pp-declarant-list">
                                                {group.documents.map((d: any, i: number) => (
                                                    <div className="pp-doc-line" key={i}>
                                                        <span className="pp-doc-declarant" title={d.declarantName}>
                                                            <UserIcon />
                                                            {d.declarantName}
                                                        </span>
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
                                                            <StaffIcon />
                                                            {d.encodedByStaff || '—'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="pp-cell" data-label="Total Fee" style={{ textAlign: 'right' }}>
                                            <span className="pp-amount">{currency(group.totalAmountDue)}</span>
                                        </td>

                                        <td className="pp-cell" data-label="Date" style={{ textAlign: 'center' }}>
                                            <span className="pp-date">{group.dateRequested}</span>
                                        </td>

                                        <td className="pp-cell" style={{ textAlign: 'right', paddingRight: '24px' }}>
                                            <div className="pp-actions">
                                                <button
                                                    className="pp-btn-archive"
                                                    onClick={(e) => requestArchiveOne(e, group)}
                                                    title="Archive group"
                                                    aria-label="Archive group"
                                                >
                                                    <ArchiveIcon />
                                                </button>
                                                <button
                                                    className="pp-btn-process"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectPayment(group);
                                                    }}
                                                >
                                                    Process <ProcessIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINATION FOOTER (REDESIGNED) --- */}
                {!loading && filtered.length > 0 && (
                    <div className="pp-pagination-footer">

                        <div className="pp-pagination-left">
                            <span className="pp-pagination-label">Rows per page:</span>
                            <select
                                className="pp-items-per-page"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={150}>150</option>
                            </select>
                        </div>

                        <div className="pp-pagination-center">
                            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length}
                        </div>

                        <div className="pp-pagination-right">
                            <button
                                className="pp-page-btn-text"
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>

                            <span className="pp-page-current">Page {currentPage} of {totalPages || 1}</span>

                            <button
                                className="pp-page-btn-text"
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                Next
                            </button>
                        </div>

                    </div>
                )}
            </div>

            {/* --- ARCHIVE CONFIRM MODAL --- */}
            {confirmTarget && (
                <div className="pp-modal-backdrop" onClick={() => !isArchiving && setConfirmTarget(null)}>
                    <div className="pp-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="pp-modal-title">Archive pending payment{confirmTarget.groups.length !== 1 && 's'}?</h3>
                        <p className="pp-modal-body">
                            This will archive {confirmTarget.label}. Archived requests are removed from this queue and can be restored from Transaction Management.
                        </p>
                        <div className="pp-modal-actions">
                            <button className="pp-modal-btn pp-modal-btn--cancel" onClick={() => setConfirmTarget(null)} disabled={isArchiving}>
                                Cancel
                            </button>
                            <button className="pp-modal-btn pp-modal-btn--confirm" onClick={() => runArchive(confirmTarget.groups)} disabled={isArchiving}>
                                {isArchiving ? 'Archiving...' : 'Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}