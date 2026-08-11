import { useEffect, useMemo, useState } from "react";
import { Search, Printer, CheckCircle2, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import "../styles/TransactionRegistry.css";
import "../styles/select.css";
import type { CertifiedCopyRecord, CTCStatus, Transaction, DeclarantGroup } from "../types/transaction";
import { fetchTransactionRegistry } from "../services/transactionService";
import { TransactionDetails } from "./TransactionDetails";
import { ExpandableText } from "../components/common/ExpandableText";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { ADePTSelect } from "../components/ADePTSelect";
import { getDocPillMeta, getDocumentTypeFromReference, matchesDocumentType } from "../../utils/documentType";
import type { DocumentTypeFilterValue } from "../../utils/documentType";
import { formatDateTime } from "../../utils/dateTime";

// Legend icons come from the shared documentType helper — the exact same
// icons the reference-number pills render, so the legend key always matches
// the table (no duplicate SVG copies here), exactly like TransactionRegistry.
const TaxDeclarationIcon = getDocPillMeta('Tax Declaration').Icon;
const LandholdingIcon = getDocPillMeta('Landholding').Icon;
const NoLandholdingIcon = getDocPillMeta('No Land Holding').Icon;

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

const CTC_COLUMNS = [
  "Reference No.", "Declarant", "Original Doc", "OR Number",
  "Justification", "Date Requested", "Date Released", "Released By", "Status", "Action",
];

/** Total minimum table width (px) — below this the shared .tr-table-scroll
 *  container scrolls horizontally (the same pattern TransactionRegistry's
 *  REGISTRY_TABLE_MIN_WIDTH uses) instead of cramming all ten columns into
 *  the viewport and crushing the reference pills and status badges. */
const CTC_TABLE_MIN_WIDTH = 1500;

/* --- Summary skeleton (three compact cards — mirrors VoidAmendSummarySkeleton
   and uses the same tr-summary-grid--multi sizing as the loaded cards) --- */
function CTCSummarySkeleton() {
  return (
    <div className="tr-summary-grid tr-summary-grid--multi">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-card-ghost tr-summary-skeleton-card">
          <div className="skeleton-item" style={{ width: '60%', height: 10 }} />
          <div className="skeleton-item" style={{ width: '30%', height: 20 }} />
        </div>
      ))}
    </div>
  );
}

/* --- Skeleton (mirrors PendingPayment/TransactionRegistry's shimmer pattern) --- */
function CTCTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="tr-card">
      <div className="tr-table-scroll">
        <table className="tr-table" style={{ minWidth: CTC_TABLE_MIN_WIDTH }}>
          <thead>
            <tr>
              {CTC_COLUMNS.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="tr-row">
                <td><div className="skeleton-item" style={{ width: '85%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '70%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '60%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '50%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '90%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '55%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '55%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '60%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '70px', height: 20, borderRadius: 999 }} /></td>
                <td style={{ textAlign: 'center' }}><div className="skeleton-item" style={{ width: '72px', height: 30, borderRadius: 7 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CertifiedTrueCopyProps {
  onNavigateToRegistry?: () => void;
  onNavigateToVoidAmend?: () => void;
  /** Same two props TransactionRegistry uses for its first two breadcrumb
   * links — wire these from Dashboard.tsx the same way
   * (onNavigateToPendingRequests -> 'document-request' view,
   * onNavigateToPendingPayment -> 'pending-payment' view) so the breadcrumb
   * here matches the registry's exactly. */
  onNavigateToPendingRequests?: () => void;
  onNavigateToPendingPayment?: () => void;
  /** Breadcrumb → Archive Management. */
  onNavigateToArchive?: () => void;
}

export default function CertifiedTrueCopy({
  onNavigateToRegistry,
  onNavigateToVoidAmend,
  onNavigateToPendingRequests,
  onNavigateToPendingPayment,
  onNavigateToArchive,
}: CertifiedTrueCopyProps) {
  const [records, setRecords] = useState<CertifiedCopyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All statuses");
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilterValue>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Full registry (reprints AND originals) kept for the View drawer — the
  // reprint row opens read-only, and a banner cross-links to the original
  // document it was issued from (same voided ⇄ amended pattern Void & Amend
  // uses), so tracking reprint → source is one click away.
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"reprint" | "original">("reprint");

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);
    try {
      const all = await fetchTransactionRegistry();
      const reprints = all.filter((t) => t.requestType === "REPRINT");

      const mapped = reprints.map((t): CertifiedCopyRecord => ({
        id: t.id,
        reference: t.referenceNumber,
        declarantName: t.client.declarantName,
        originalDocument: t.referenceNumber.replace(/-R\d+$/, ""),
        dateRequested: formatDateTime(t.requestedAt ?? t.dateRequested) || "—",
        dateReleased: formatDateTime(t.releasedAt ?? t.dateReleased) || "—",
        releasedBy: t.releasedBy || "—",
        status: (
          t.status === "Released" ? "Released" :
            "Pending"
        ) as CTCStatus,
        orNumber: t.payment?.orNumber || "—",
        orJustification: t.payment?.orJustification || "—",
      }));

      setAllTransactions(all);
      setRecords(mapped);
    } catch (err) {
      setLoadError("Failed to fetch reprint records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Reset to page 1 whenever the filter criteria change, so you don't
  // get stranded on e.g. page 4 of a filtered result set that only has 2 pages.
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, docTypeFilter, rowsPerPage]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;
      const matchesDocType = matchesDocumentType(r.reference, docTypeFilter);

      const term = search.toLowerCase().trim();
      if (!term) return matchesStatus && matchesDocType;

      const matchesSearch = [
        r.reference, r.declarantName, r.originalDocument, r.orNumber,
        r.orJustification, r.dateRequested, r.dateReleased, r.releasedBy
      ].some(value => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch && matchesDocType;
    });
  }, [records, search, statusFilter, docTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  // ─── Summary counts ───────────────────────────────────────
  const releasedCount = useMemo(
    () => records.filter((r) => r.status === "Released").length,
    [records]
  );
  const pendingCount = records.length - releasedCount;

  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, safePage, rowsPerPage]);

  // ─── View drawer resolution ─────────────────────────────
  // The reprint transaction is resolved by the clicked row's id; the
  // original is looked up by stripping the "-R{n}" suffix, so the banner
  // cross-link traces the reprint back to its source document (and back).
  const transactionsByRef = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const t of allTransactions) map.set(t.referenceNumber, t);
    return map;
  }, [allTransactions]);

  const openView = (record: CertifiedCopyRecord) => {
    setViewTab("reprint");
    setViewId(record.id);
  };

  const viewReprintTxn = viewId
    ? allTransactions.find((t) => t.id === viewId) ?? null
    : null;
  const viewOriginalTxn = viewReprintTxn
    ? transactionsByRef.get(viewReprintTxn.referenceNumber.replace(/-R\d+$/, "")) ?? null
    : null;
  const viewingOriginal = viewTab === "original" && !!viewOriginalTxn;
  const viewGroup: DeclarantGroup | null = viewReprintTxn
    ? {
        declarantName:
          viewingOriginal && viewOriginalTxn
            ? viewOriginalTxn.client.declarantName
            : viewReprintTxn.client.declarantName,
        transactions: [viewingOriginal && viewOriginalTxn ? viewOriginalTxn : viewReprintTxn],
      }
    : null;

  return (
    <div className="tr-page">
      <div className="tr-header">
        {/* Document Request > Pending Requests > Reprint/CTC > Archive Management —
            same breadcrumb chain as TransactionRegistry, with "Archive Management" as
            the final crumb. The first two links reuse the same props/wiring
            TransactionRegistry uses; "Archive Management" routes via onNavigateToArchive. */}
        <nav className="tr-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToPendingRequests}
          >
            Document Request
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToPendingPayment}
          >
            Pending Requests
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <span className="tr-breadcrumb-item--current">Reprint/CTC</span>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToArchive ?? (() => {})}
          >
            Archive Management
          </button>
        </nav>

        <div className="tr-header-top">
          <div className="tr-header-titles">
            <h2>Reprint / Certified True Copy</h2>
            <p>Searchable registry of every certified true copy and reprint issued.</p>
          </div>
          <button
            className={`tr-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
            onClick={() => loadData(true)}
            title="Refresh registry"
            aria-label="Refresh registry"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span className="refresh-btn-label">Refresh</span>
          </button>
        </div>

        {/* Pill tab nav — inlined directly here (no separate TransactionTabs.tsx
            import), matching how TransactionRegistry and PendingPayment render
            their own tabs in-page. "reprint" is always the active tab since
            this IS the reprint page. */}
        <div className="tr-tabs" role="tablist" aria-label="Transaction sections">
          <button
            type="button"
            className="tr-tab"
            onClick={onNavigateToRegistry}
          >
            Transaction Registry
          </button>
          <button
            type="button"
            className="tr-tab tr-tab--active"
            aria-current="page"
          >
            Reprint/CTC
          </button>
          <button
            type="button"
            className="tr-tab"
            onClick={onNavigateToVoidAmend}
          >
            Void &amp; Amend
          </button>
        </div>

        {/* Summary cards — same position inside tr-header as TransactionRegistry's
            summary grid (right after the tabs), so the pill → card spacing matches
            the registry exactly (tr-tabs margin-bottom 10px + tr-summary-grid
            margin-top 18px). tr-summary-grid--multi applies the same compact
            card sizing as the registry's single card (flex: 0 0 auto, 220–320px),
            so the three cards sit side-by-side. */}
        {isLoading ? (
          <CTCSummarySkeleton />
        ) : (
          <>
            <div className="tr-summary-grid tr-summary-grid--multi">
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--total">
                  <Printer size={20} strokeWidth={2.3} />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{records.length}</span>
                  <span className="tr-summary-card-label">Total Reprinted Documents</span>
                </div>
              </div>
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--released">
                  <CheckCircle2 size={20} strokeWidth={2.3} />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{releasedCount}</span>
                  <span className="tr-summary-card-label">Released</span>
                </div>
              </div>
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--pending">
                  <Clock size={20} strokeWidth={2.3} />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{pendingCount}</span>
                  <span className="tr-summary-card-label">Pending</span>
                </div>
              </div>
            </div>

            {/* Legend — same key TransactionRegistry shows under its summary
                cards, explaining the reference pill colors in this table. */}
            <div className="tr-legend-row">
              <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
              <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Landholding</div>
              <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Land Holding</div>
            </div>
          </>
        )}
      </div>

      {/* Search + status filter toolbar, styled identically to
          TransactionRegistry's tr-table-toolbar (search left, filter right). */}
      {isLoading ? (
        <CTCTableSkeleton />
      ) : loadError ? (
        <div className="tr-card" style={{ padding: '32px', textAlign: 'center', color: '#B0281C' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{loadError}</p>
          <button className="tr-filter-reset" onClick={() => loadData()}>Retry</button>
        </div>
      ) : (
        <>
          <div className="tr-card">
            <div className="tr-table-toolbar">
              <div className="tr-search-wrapper">
                <div className="tr-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search reference, name, OR number, or justification..."
                  />
                </div>
              </div>
              <ADePTSelect
                ariaLabel="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "All statuses", label: "All statuses" },
                  { value: "Released", label: "Released" },
                  { value: "Pending", label: "Pending" },
                ]}
              />
              <DocumentTypeFilter value={docTypeFilter} onChange={setDocTypeFilter} />
            </div>

            <div className="tr-table-scroll">
              <table className="tr-table" style={{ minWidth: CTC_TABLE_MIN_WIDTH }}>
                <thead>
                  <tr>
                    <th style={{ width: '240px' }}>Reference No.</th>
                    <th style={{ width: '12%' }}>Declarant</th>
                    <th style={{ width: '12%' }}>Original Doc</th>
                    <th style={{ width: '10%' }}>OR Number</th>
                    <th style={{ width: '11%' }}>Justification</th>
                    <th style={{ width: '14%' }}>Date Requested</th>
                    <th style={{ width: '14%' }}>Date Released</th>
                    <th style={{ width: '9%' }}>Released By</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td className="tr-table-empty" colSpan={10}>
                        <strong>No records found</strong>
                        No records match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const docPillMeta = getDocPillMeta(getDocumentTypeFromReference(record.reference) ?? '');
                      return (
                        <tr key={record.id} className="tr-row">
                          <td>
                            <span className={`tr-doc-pill ${docPillMeta.className}`} title={record.reference}>
                              <docPillMeta.Icon />
                              {record.reference}
                            </span>
                          </td>
                          <td><ExpandableText text={record.declarantName} className="tr-declarant" /></td>
                          <td>{record.originalDocument}</td>
                          <td><span className="tr-or-number">{record.orNumber}</span></td>
                          <td>
                            <ExpandableText
                              text={record.orJustification}
                              className={`tr-or-justification${record.orJustification === '—' ? ' tr-or-justification--none' : ''}`}
                            />
                          </td>
                          <td>{record.dateRequested}</td>
                          <td>{record.dateReleased}</td>
                          <td>{record.releasedBy}</td>
                          <td>
                            <span className={`tr-badge tr-badge--${record.status.toLowerCase()}`}>
                              {record.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div className="tr-actions">
                              <button
                                type="button"
                                className="tr-view-details-btn"
                                onClick={() => openView(record)}
                                title={`View ${record.reference} details`}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredRecords.length > 0 && (
              <div className="tr-pagination-footer">
                <div className="tr-pagination-left">
                  <span className="tr-pagination-label">Rows per page:</span>
                  <ADePTSelect
                    variant="sm"
                    ariaLabel="Rows per page"
                    value={String(rowsPerPage)}
                    onChange={(v) => setRowsPerPage(Number(v))}
                    options={ROWS_PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </div>

                <div className="tr-pagination-center">
                  {(safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length}
                </div>

                <div className="tr-pagination-right">
                  <button
                    type="button"
                    className="tr-page-btn-text"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="tr-page-current">Page {safePage} of {totalPages}</span>
                  <button
                    type="button"
                    className="tr-page-btn-text"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── View drawer ──
          Reuses the registry's TransactionDetails panel, opened read-only
          (no Reprint / Void callbacks). When the reprint has a matching
          original on record, a stuck banner cross-links between the two —
          "View Original Document →" from the reprint side, "← Back to
          Reprinted Details" from the original side — so tracing a certified
          true copy back to its source document is one click away. */}
      {viewGroup && viewReprintTxn && (
        <TransactionDetails
          group={viewGroup}
          transactionsByRef={transactionsByRef}
          onClose={() => {
            setViewId(null);
            setViewTab("reprint");
          }}
          subtitle={
            viewingOriginal && viewOriginalTxn
              ? `Original document — reprinted as ${viewReprintTxn.referenceNumber}`
              : `Certified true copy of ${viewReprintTxn.referenceNumber.replace(/-R\d+$/, "")}`
          }
          banner={
            viewOriginalTxn ? (
              viewingOriginal ? (
                <>
                  <span className="td-banner-note">
                    <CheckCircle2 size={14} />
                    This is the original document this reprint was issued from
                  </span>
                  <button
                    type="button"
                    className="td-banner-link"
                    onClick={() => setViewTab("reprint")}
                  >
                    <ArrowLeft size={13} />
                    Back to Reprinted Details
                  </button>
                </>
              ) : (
                <>
                  <span className="td-banner-note">
                    <Printer size={14} />
                    Certified true copy printed against this original
                  </span>
                  <button
                    type="button"
                    className="td-banner-link"
                    onClick={() => setViewTab("original")}
                  >
                    View Original Document
                    <span className="td-banner-ref">{viewOriginalTxn.referenceNumber}</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              )
            ) : undefined
          }
        />
      )}
    </div>
  );
}