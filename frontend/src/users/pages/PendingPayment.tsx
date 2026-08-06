import { useState, useEffect, useMemo, Fragment } from 'react';
import { requestService } from '../services/requestService';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import '../styles/PendingPayment.css';
import { ExpandableText } from '../components/common/ExpandableText';

// --- ICONS ---
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const ArchiveIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;
const ProcessIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const InboxIcon = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>;
const CheckSquareIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
const UserIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const XIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

// Stat card icons
const ClientsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const DocumentsIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const AmountIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 6v.01M18 18v-.01" /></svg>;

// Document-type icons — Tax Declaration reads as an institution/records mark (bank/landmark),
// Landholding as a certificate document, No Landholding as a verified/checked document
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 3 21 9 3 9"></polygon></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>;

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

// Splits a queue timestamp (timestamptz from the DB) into a date part and
// a time part ("Aug 5, 2026" / "2:35 PM") so the UI can render the time
// on its own line below the date. Falls back to the plain request date
// when the timestamp is missing (older records) or unparseable.
function splitQueueDateTime(raw: string | null | undefined, fallback: string): { date: string; time: string } {
    if (!raw) return { date: fallback, time: '' };
    const d = new Date(raw);
    if (isNaN(d.getTime())) return { date: fallback, time: '' };
    return {
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
}

export function PendingPayment({ onSelectPayment, onNavigateBack, onSwitchView }: any) {
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
                // Sort the queue by when each request entered it — newest first.
                // Restored/archived records get a fresh pending_payment_at, so
                // they surface at the top instead of falling back to the
                // original request date (created_at) order.
                const pending = rawRequests
                    .filter((r: any) => r.status === 'PENDING_PAYMENT')
                    .sort((a: any, b: any) => {
                        const ta = a.pending_payment_at ? new Date(a.pending_payment_at).getTime() : 0;
                        const tb = b.pending_payment_at ? new Date(b.pending_payment_at).getTime() : 0;
                        return tb - ta;
                    });

                const grouped = pending.reduce((acc: any, req: any) => {
                    const requester = req.requested_by_name || req.requestedByName || 'Unknown Client';
                    const queueDt = splitQueueDateTime(req.pending_payment_at, req.request_date || 'N/A');

                    if (!acc[requester]) {
                        acc[requester] = {
                            groupId: req.id,
                            requesterName: requester,
                            // Show the time the request entered this queue
                            // (pending_payment_at is a timestamptz), not just
                            // the request date.
                            dateRequested: queueDt.date,
                            timeRequested: queueDt.time,
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
            const archivedDeclarants = [...new Set(allDocs.map((d: any) => d.declarantName || 'N/A'))].join(', ');
            const archivedDocTypes = [...new Set(allDocs.map((d: any) => d.documentType || 'N/A'))].join(', ');
            addAdminAuditEntry({
                type: 'document_archived',
                description: `Archived ${groups.length} document group(s)`,
                details: {
                    Declarant: archivedDeclarants,
                    'Document Type': archivedDocTypes,
                },
            }).catch(() => { });
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
            {/* --- BREADCRUMB NAV --- */}
            <div className="pp-breadcrumb">
                <button
                    type="button"
                    className="pp-breadcrumb-link"
                    onClick={() => onNavigateBack && onNavigateBack()}
                >
                    Document Request
                </button>
                <span className="pp-breadcrumb-sep">&gt;</span>
                <span className="pp-breadcrumb-current">Pending Requests</span>
                <span className="pp-breadcrumb-sep">&gt;</span>
                <button
                    type="button"
                    className="pp-breadcrumb-link"
                    onClick={() => onSwitchView && onSwitchView('transaction-registry')}
                >
                    Transaction Management
                </button>
            </div>

            {/* --- PAGE HEADER (no card wrapper) --- */}
            <div className="pp-page-header">
                <div className="pp-header-top">
                    <div className="pp-header-titles">
                        <h1 className="pp-title">Pending Payments Queue</h1>
                        <p className="pp-subtitle">Verify payments using Official Receipts issued by the Treasurer's Office.</p>

                        {/* TAB SEGMENTED CONTROL (Moved to match Pending For Release) */}
                        <div className="pp-tabs-wrapper">
                            <button className="pp-tab-btn active">
                                Pending Payments
                            </button>
                            <button className="pp-tab-btn" onClick={() => onSwitchView && onSwitchView('pending-for-release')}>
                                Pending For Release
                            </button>
                        </div>
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
                    <div className="pp-stat-chip pp-stat-chip--clients">
                        <div className="pp-stat-icon-wrap pp-stat-icon-wrap--clients"><ClientsIcon /></div>
                        <div className="pp-stat-text">
                            <strong>{summary.clients}</strong>
                            <span>Clients waiting</span>
                        </div>
                    </div>
                    <div className="pp-stat-chip pp-stat-chip--docs">
                        <div className="pp-stat-icon-wrap pp-stat-icon-wrap--docs"><DocumentsIcon /></div>
                        <div className="pp-stat-text">
                            <strong>{summary.docs}</strong>
                            <span>Documents</span>
                        </div>
                    </div>
                    <div className="pp-stat-chip pp-stat-chip--amount">
                        <div className="pp-stat-icon-wrap pp-stat-icon-wrap--amount"><AmountIcon /></div>
                        <div className="pp-stat-text">
                            <strong>{currency(summary.amount)}</strong>
                            <span>Total due</span>
                        </div>
                    </div>
                </div>

                <div className="pp-legend-row">
                    <div className="pp-legend-item pp-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
                    <div className="pp-legend-item pp-legend-item--lh"><LandholdingIcon />Landholding</div>
                    <div className="pp-legend-item pp-legend-item--nlh"><NoLandholdingIcon />No Landholding</div>
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
                                <th style={{ width: '14%' }}>Declarant(s)</th>
                                <th style={{ width: '15%' }}>Requested By</th>
                                <th style={{ width: '15%' }}>Encoded By Staff</th>
                                <th style={{ width: '10%', textAlign: 'right' }}>Total Fee</th>
                                <th style={{ width: '16%', textAlign: 'center' }}>Date &amp; Time</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
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
                                paginatedGroups.map((group) => {
                                    const docCount = group.documents.length;
                                    return (
                                        <Fragment key={group.groupId}>
                                            {/* Group label row — replaces the old floating "N documents" label
                                                that used to sit disconnected above the Reference No. column */}
                                            <tr className="pp-group-header-row">
                                                <td colSpan={columnCount} className="pp-group-header-cell">
                                                    {docCount} document{docCount !== 1 && 's'}
                                                </td>
                                            </tr>

                                            {group.documents.map((d: any, docIndex: number) => (
                                                <tr
                                                    key={d.id}
                                                    className={`pp-row${selectionMode ? ' is-selectable' : ''}${selectedIds.has(group.groupId) ? ' is-selected' : ''}${docIndex === docCount - 1 ? '' : ' pp-row-group-mid'}`}
                                                    onClick={selectionMode ? () => toggleSelect(group.groupId) : undefined}
                                                >
                                                    {selectionMode && docIndex === 0 && (
                                                        <td className="pp-cell pp-cell-checkbox" rowSpan={docCount}>
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

                                                    {/* Reference No. and Declarant now live in the SAME <tr> as each
                                                        other, per document — the browser guarantees they line up,
                                                        even if a declarant name wraps onto 2-3 lines. */}
                                                    <td className="pp-cell" data-label="Reference No.">
                                                        <span
                                                            className={`pp-ref-chip ${getRefChipClass(d.referenceNumber)}`}
                                                            title={d.documentType}
                                                        >
                                                            {getRefTypeIcon(d.referenceNumber)}
                                                            {d.referenceNumber}
                                                        </span>
                                                    </td>

                                                    <td className="pp-cell" data-label="Declarant(s)">
                                                        <span className="pp-doc-declarant">
                                                            <UserIcon />
                                                            <ExpandableText text={d.declarantName} />
                                                        </span>
                                                    </td>

                                                    {/* Requested By now repeats per document row, same as Encoded By
                                                        Staff — each row reads as a complete, self-contained line
                                                        (Reference No. → Declarant → Requested By → Staff) without
                                                        needing to look up/down to a merged cell. */}
                                                    <td className="pp-cell" data-label="Requested By">
                                                        <span className="pp-client-name">
                                                            <ExpandableText text={group.requesterName} />
                                                        </span>
                                                    </td>

                                                    <td className="pp-cell" data-label="Encoded By Staff">
                                                        <span className="pp-doc-declarant pp-doc-declarant--staff" title={d.encodedByStaff || 'Not yet recorded'}>
                                                            {d.encodedByStaff || '—'}
                                                        </span>
                                                    </td>

                                                    {docIndex === 0 && (
                                                        <td className="pp-cell pp-cell-top" data-label="Total Fee" style={{ textAlign: 'right' }} rowSpan={docCount}>
                                                            <span className="pp-amount">{currency(group.totalAmountDue)}</span>
                                                        </td>
                                                    )}

                                                    {docIndex === 0 && (
                                                        <td className="pp-cell pp-cell-top" data-label="Date &amp; Time" style={{ textAlign: 'center' }} rowSpan={docCount}>
                                                            <span className="pp-date">
                                                                <span className="pp-date-day">{group.dateRequested}</span>
                                                                {group.timeRequested && <span className="pp-date-time">{group.timeRequested}</span>}
                                                            </span>
                                                        </td>
                                                    )}

                                                    {docIndex === 0 && (
                                                        <td className="pp-cell pp-cell-top" style={{ textAlign: 'right', paddingRight: '24px' }} rowSpan={docCount}>
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
                                                    )}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- PAGINATION FOOTER --- */}
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
                            This will archive <strong>{confirmTarget.label}</strong>. They'll be removed from this queue and moved to <strong>Archive Management</strong>, under Transaction Management — you can restore them from there anytime.
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