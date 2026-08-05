import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { Search } from "lucide-react";
import "../styles/TransactionRegistry.css";
import type { CertifiedCopyRecord, CTCStatus } from "../types/transaction";
import { fetchCertifiedTrueCopies } from "../services/transactionService";
import { ExpandableText } from '../components/common/ExpandableText';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

/* --- Summary chip icons (same shapes/colors as TransactionRegistry's
    tr-summary-card chips) --- */
const TotalIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const ReleasedIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const PendingIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

/* --- Document-type icons — same shapes/colors as the reference-number pills
    in the registry, so NLH-* reads red here too. --- */
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 3 21 9 3 9"></polygon></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>;
const GenericDocIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /></svg>;

interface RefPillMeta {
  className: string;
  Icon: () => ReactElement;
}

/* Reference numbers encode their document type in the prefix (NLH-/LH-/TD-),
   so the pill color/icon is derived from that — matching the registry. */
function getRefPillMeta(referenceNumber: string): RefPillMeta {
  const ref = (referenceNumber || '').toUpperCase();
  if (ref.startsWith('NLH')) return { className: 'tr-doc-pill--nlh', Icon: NoLandholdingIcon };
  if (ref.startsWith('LH')) return { className: 'tr-doc-pill--lh', Icon: LandholdingIcon };
  if (ref.startsWith('TD')) return { className: 'tr-doc-pill--td', Icon: TaxDeclarationIcon };
  return { className: '', Icon: GenericDocIcon };
}

/* --- Summary skeleton (mirrors RegistrySummarySkeleton, one card per chip) --- */
function SummarySkeleton() {
  return (
    <div className="tr-summary-grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-card-ghost tr-summary-skeleton-card" style={{ flex: 1 }} />
      ))}
    </div>
  );
}

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

  const summary = useMemo(
    () => ({
      total: records.length,
      released: records.filter((r) => r.status === "Released").length,
      pending: records.filter((r) => r.status === "Pending").length,
    }),
    [records]
  );

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

        {/* Summary chips + doc-type legend — same layout/style as the
            TransactionRegistry page (tr-summary-card / tr-legend-row). */}
        {isLoading ? (
          <SummarySkeleton />
        ) : (
          <>
            <div className="tr-summary-grid">
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--total">
                  <TotalIcon />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{summary.total}</span>
                  <span className="tr-summary-card-label">Total Reprints / CTCs</span>
                </div>
              </div>
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--released">
                  <ReleasedIcon />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{summary.released}</span>
                  <span className="tr-summary-card-label">Released</span>
                </div>
              </div>
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--pending">
                  <PendingIcon />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{summary.pending}</span>
                  <span className="tr-summary-card-label">Pending</span>
                </div>
              </div>
            </div>
            <div className="tr-legend-row">
              <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
              <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Landholding</div>
              <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Landholding</div>
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
                      const meta = getRefPillMeta(record.reference);
                      return (
                      <tr key={record.id} className="tr-row">
                        <td>
                          <span className={`tr-doc-pill ${meta.className}`}>
                            <meta.Icon />
                            {record.reference}
                          </span>
                        </td>
                        <td><span className="tr-declarant"><ExpandableText text={record.declarantName} /></span></td>
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