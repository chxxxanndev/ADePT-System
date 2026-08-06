import { useEffect, useMemo, useState } from "react";
import { Search, Printer, CheckCircle2, Clock } from "lucide-react";
import "../styles/TransactionRegistry.css";
import type { CertifiedCopyRecord, CTCStatus } from "../types/transaction";
import { fetchCertifiedTrueCopies } from "../services/transactionService";
import { ExpandableText } from "../components/common/ExpandableText";
import { getDocPillMeta, getDocumentTypeFromReference } from "../../utils/documentType";

// Legend icons come from the shared documentType helper — the exact same
// icons the reference-number pills render, so the legend key always matches
// the table (no duplicate SVG copies here), exactly like TransactionRegistry.
const TaxDeclarationIcon = getDocPillMeta('Tax Declaration').Icon;
const LandholdingIcon = getDocPillMeta('Landholding').Icon;
const NoLandholdingIcon = getDocPillMeta('No Land Holding').Icon;

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

/* --- Helper to format dates for table display --- */
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "—") return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", {
      day: "2-digit", month: "short", year: "numeric"
    });
  } catch { return dateStr; }
}

const CTC_COLUMNS = [
  "Reference No.", "Declarant", "Original Doc", "OR Number",
  "Justification", "Requested", "Released", "Released By", "Status",
];

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
        <table className="tr-table">
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
}

export default function CertifiedTrueCopy({
  onNavigateToRegistry,
  onNavigateToVoidAmend,
  onNavigateToPendingRequests,
  onNavigateToPendingPayment,
}: CertifiedTrueCopyProps) {
  const [records, setRecords] = useState<CertifiedCopyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);
    try {
      const reprints = await fetchCertifiedTrueCopies();

      const mapped = reprints.map((t): CertifiedCopyRecord => ({
        id: t.id,
        reference: t.referenceNumber,
        declarantName: t.client.declarantName,
        originalDocument: t.referenceNumber.replace(/-R\d+$/, ""),
        dateRequested: formatDate(t.dateRequested),
        dateReleased: t.dateReleased ? formatDate(t.dateReleased) : "—",
        releasedBy: t.releasedBy || "—",
        status: (
          t.status === "Released" ? "Released" :
            "Pending"
        ) as CTCStatus,
        orNumber: t.payment?.orNumber || "—",
        orJustification: t.payment?.orJustification || "—",
      }));

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
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, rowsPerPage]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;

      const term = search.toLowerCase().trim();
      if (!term) return matchesStatus;

      const matchesSearch = [
        r.reference, r.declarantName, r.originalDocument, r.orNumber,
        r.orJustification, r.dateRequested, r.dateReleased, r.releasedBy
      ].some(value => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

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

  return (
    <div className="tr-page">
      <div className="tr-header">
        {/* Document Request > Pending Requests > Standing Transaction Management > Reprint/CTC —
            same breadcrumb chain as TransactionRegistry, just one level deeper. The first two
            links reuse the same props/wiring TransactionRegistry uses; "Standing Transaction
            Management" reuses the onNavigateToRegistry prop this component already received. */}
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
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToRegistry}
          >
            Transaction Management
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <span className="tr-breadcrumb-item--current">Reprint/CTC</span>
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
              <div style={{ position: 'relative' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="tr-filter-select"
                >
                  <option value="All statuses">All statuses</option>
                  <option value="Released">Released</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="tr-table-scroll">
              <table className="tr-table">
                <thead>
                  <tr>
                    <th style={{ width: '13%' }}>Reference No.</th>
                    <th style={{ width: '15%' }}>Declarant</th>
                    <th style={{ width: '12%' }}>Original Doc</th>
                    <th style={{ width: '9%' }}>OR Number</th>
                    <th style={{ width: '12%' }}>Justification</th>
                    <th style={{ width: '8%' }}>Requested</th>
                    <th style={{ width: '8%' }}>Released</th>
                    <th style={{ width: '11%' }}>Released By</th>
                    <th style={{ width: '12%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td className="tr-table-empty" colSpan={9}>
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
                  <select
                    className="tr-items-per-page"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
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
    </div>
  );
}