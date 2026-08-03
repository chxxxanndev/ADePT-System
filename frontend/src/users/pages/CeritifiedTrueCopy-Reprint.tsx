import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, FileStack, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/CertifiedTrueCopy-Reprint.css";
import type { CertifiedCopyRecord, CTCStatus } from "../types/transaction";
import { fetchCertifiedTrueCopies } from "../services/transactionService";
import { TransactionTabs } from "../components/TransactionTabs";

const PAGE_SIZE = 10;

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

/* --- Skeleton pieces (mirrors the real table so columns line up) --- */
const SkeletonBox = ({ width = "100%", height = "12px", borderRadius = "4px" }) => (
  <div className="ctc-skeleton-item" style={{ width, height, borderRadius }} />
);

const CTC_COLUMNS = [
  "Reference No.", "Declarant", "Original Doc", "OR Number",
  "Justification", "Requested", "Released", "Released By", "Status",
];

function CTCTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="ctc-card">
      <div className="ctc-table-scroll">
        <table className="ctc-table">
          <thead>
            <tr>
              {CTC_COLUMNS.map((col) => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className={i % 2 !== 0 ? "ctc-row-alt" : ""}>
                <td><SkeletonBox width="85%" /></td>
                <td><SkeletonBox width="70%" /></td>
                <td><SkeletonBox width="60%" /></td>
                <td><SkeletonBox width="50%" /></td>
                <td><SkeletonBox width="90%" /></td>
                <td><SkeletonBox width="55%" /></td>
                <td><SkeletonBox width="55%" /></td>
                <td><SkeletonBox width="60%" /></td>
                <td><SkeletonBox width="70px" height="20px" borderRadius="999px" /></td>
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
}

export default function CertifiedTrueCopy({
  onNavigateToRegistry,
  onNavigateToVoidAmend,
}: CertifiedTrueCopyProps) {
  const [records, setRecords] = useState<CertifiedCopyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All statuses");
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
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
    }
  };

  useEffect(() => { loadData(); }, []);

  // Reset to page 1 whenever the filter criteria change, so you don't
  // get stranded on e.g. page 4 of a filtered result set that only has 2 pages.
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;

      const term = search.toLowerCase().trim();
      if (!term) return matchesStatus;

      const matchesSearch = [
        r.reference, r.declarantName, r.originalDocument, r.orNumber,
        r.orJustification, r.dateRequested, r.dateReleased, r.releasedBy, r.status
      ].some(value => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, safePage]);

  return (
    <div className="ctc-page">
      <div className="ctc-container">
        {/* Header */}
        <div className="ctc-header">
          <div className="ctc-header-icon"><FileStack size={20} /></div>
          <div>
            <h1 className="ctc-title">Certified True Copy</h1>
            <p className="ctc-subtitle">Connected to Backend • Searchable Reprint Registry</p>
          </div>
        </div>

        <TransactionTabs
          active="reprint"
          onNavigateToRegistry={onNavigateToRegistry ?? (() => {})}
          onNavigateToReprint={() => {}}
          onNavigateToVoidAmend={onNavigateToVoidAmend ?? (() => {})}
        />

        {/* Search and Filters */}
        <div className="ctc-filters">
          <div className="ctc-search-field">
            <Search size={16} className="ctc-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, name, OR number, or justification..."
              className="ctc-search-input"
            />
          </div>
          <div className="ctc-select-field">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ctc-select"
            >
              <option value="All statuses">All statuses</option>
              <option value="Released">Released</option>
              <option value="Pending">Pending</option>
            </select>
            <ChevronDown size={14} className="ctc-select-chevron" />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <CTCTableSkeleton />
        ) : loadError ? (
          <div className="ctc-card ctc-error-state">
            <p>{loadError}</p>
            <button onClick={loadData}>Retry</button>
          </div>
        ) : (
          <>
            <div className="ctc-card">
              <div className="ctc-table-scroll">
                <table className="ctc-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Declarant</th>
                      <th>Original Doc</th>
                      <th>OR Number</th>
                      <th>Justification</th>
                      <th>Requested</th>
                      <th>Released</th>
                      <th>Released By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record, idx) => (
                      <tr key={record.id} className={idx % 2 !== 0 ? "ctc-row-alt" : ""}>
                        <td className="ctc-cell-reference">{record.reference}</td>
                        <td className="ctc-cell-name">{record.declarantName}</td>
                        <td className="ctc-cell-muted">{record.originalDocument}</td>
                        <td className="ctc-cell-or">{record.orNumber}</td>
                        <td className="ctc-cell-justification" title={record.orJustification}>
                          {record.orJustification}
                        </td>
                        <td className="ctc-cell-muted">{record.dateRequested}</td>
                        <td className="ctc-cell-muted">{record.dateReleased}</td>
                        <td className="ctc-cell-muted">{record.releasedBy}</td>
                        <td>
                          <span className={`ctc-badge ctc-badge--${record.status.toLowerCase()}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr className="ctc-empty-row">
                        <td colSpan={9}>No records match your search criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {filteredRecords.length > 0 && (
              <div className="ctc-pagination">
                <span className="ctc-pagination-info">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}
                  –{Math.min(safePage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
                </span>
                <div className="ctc-pagination-controls">
                  <button
                    className="ctc-pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="ctc-pagination-page">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    className="ctc-pagination-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}