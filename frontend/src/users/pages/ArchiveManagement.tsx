import { useMemo, useState, useEffect } from "react";
import type { ReactElement } from "react";
import {
  Search,
  ChevronDown,
  Archive,
  RotateCcw,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { requestService } from "../services/requestService";
import { fetchTransactionRegistry } from "../services/transactionService";
import type { Transaction, RequestedDocumentItem } from "../types/transaction";
import "../styles/ArchiveManagement.css";
import { ExpandableText } from '../components/common/ExpandableText';

/* ------------------------------------------------------------------ */
/*  Reference-number icons — same SVG shapes as TransactionRegistry's  */
/*  TransactionRow.tsx so reference pills read identically.            */
/* ------------------------------------------------------------------ */
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 3 21 9 3 9"></polygon></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>;
const GenericDocIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14H7z" /></svg>;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type DocumentType =
  | "Tax Declaration"
  | "Certificate of Land Holding"
  | "No-Landholding Certificate"
  | "Certified True Copy"
  | "General Document";

type ArchiveReason = "Auto" | "Manual";

interface ArchivedRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: DocumentType;
  archivedDate: string;
  archivedTime: string;
  archivedBy: string;
  reasonType: ArchiveReason;
  reasonDetail: string;
}

type DocTypeFilter = "All types" | DocumentType;
type ReasonFilter = "All reasons" | ArchiveReason;

const DOC_TYPE_CLASS: Record<DocumentType, string> = {
  "Tax Declaration": "arc-doc-pill--td",
  "Certificate of Land Holding": "arc-doc-pill--lh",
  "No-Landholding Certificate": "arc-doc-pill--nlh",
  "Certified True Copy": "arc-doc-pill--tc",
  "General Document": "arc-doc-pill--gen",
};

const DOC_TYPE_ICON: Record<DocumentType, () => ReactElement> = {
  "Tax Declaration": TaxDeclarationIcon,
  "Certificate of Land Holding": LandholdingIcon,
  "No-Landholding Certificate": NoLandholdingIcon,
  "Certified True Copy": GenericDocIcon,
  "General Document": GenericDocIcon,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maps the normalized `documentType` string(s) coming from the shared
 * Transaction Registry (Title Case, e.g. "Certificate of No Landholding")
 * onto this page's own display labels.
 */
function resolveArchiveDocName(docs: RequestedDocumentItem[]): DocumentType {
  const name = docs[0]?.documentType ?? "";

  if (name.includes("Tax Declaration")) return "Tax Declaration";
  if (name.includes("No Landholding") || name.includes("No-Landholding")) return "No-Landholding Certificate";
  if (name.includes("Landholding") || name.includes("Land Holding")) return "Certificate of Land Holding";
  if (name.includes("True Copy")) return "Certified True Copy";

  return "General Document";
}

function DocTypeTag({ type }: { type: DocumentType }) {
  return <span className={`arc-doc-pill ${DOC_TYPE_CLASS[type]}`}>{type}</span>;
}

function ReferenceBadge({ reference, type }: { reference: string; type: DocumentType }) {
  const Icon = DOC_TYPE_ICON[type];
  return (
    <span className={`arc-ref-pill ${DOC_TYPE_CLASS[type]}`}>
      <Icon />
      {reference}
    </span>
  );
}

/**
 * Transaction has no `archivedAt`/`archivedBy` columns yet — only
 * `dateRequested` and `assignedStaff` are available from the registry.
 * These are used as the best available stand-ins until the backend adds
 * dedicated archive-audit fields (mirrors the same limitation documented
 * for void records in VoidAndAmend.tsx).
 *
 * Cancelled requests (cancelled in Final Verification & Payment) land in
 * this queue too — for those, the backend's `cancelledAt` (the moment the
 * status flipped to CANCELLED) is used for the date/time instead of the
 * original request date.
 */
function toArchivedRecord(t: Transaction): ArchivedRecord {
  const isCancelled = t.status === "Cancelled";
  const actionedAt = isCancelled ? t.cancelledAt : null;
  const requested = actionedAt ? new Date(actionedAt) : new Date(t.dateRequested);
  return {
    id: t.id,
    reference: t.referenceNumber,
    declarantName: t.client.declarantName,
    documentType: resolveArchiveDocName(t.requestedDocuments),
    archivedDate: requested.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    archivedTime: requested.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    archivedBy: t.assignedStaff || "Staff",
    // No archive-reason field exists on the backend yet — every archived
    // transaction is reported as "Manual" until one is added.
    reasonType: "Manual",
    reasonDetail: isCancelled ? "Cancelled from pending payment." : "Manually moved from queue.",
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function ArchiveManagement() {
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("All types");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("All reasons");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchArchivedData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setLoading(true);
      setLoadError(null);
      // Reads from the same registry endpoint as Reports, Transaction Registry,
      // and Void and Amend, so this page's archived count always matches the
      // "Archived" figure shown in Reports & Analytics and on the Dashboard.
      // Cancelled requests (from Final Verification & Payment) also land here.
      const all = await fetchTransactionRegistry();
      const archivedOnly = all
        .filter((t) => t.status === "Archived" || t.status === "Cancelled")
        .map(toArchivedRecord);
      setRecords(archivedOnly);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to fetch archive.");
      setRecords([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchArchivedData();
  }, []);

  const handleRestore = async (id: string, ref: string) => {
    if (confirm(`Restore Reference #${ref} to the Pending Payments queue?`)) {
      try {
        await requestService.updateRequest(id, { status: "PENDING_PAYMENT" });
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        alert("Failed to restore document.");
      }
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesType = docTypeFilter === "All types" || record.documentType === docTypeFilter;
      const matchesReason = reasonFilter === "All reasons" || record.reasonType === reasonFilter;
      const matchesSearch =
        search.trim() === "" ||
        record.reference.toLowerCase().includes(search.toLowerCase()) ||
        record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        record.archivedBy.toLowerCase().includes(search.toLowerCase()) ||
        record.reasonDetail.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesReason && matchesSearch;
    });
  }, [records, search, docTypeFilter, reasonFilter]);

  // â”€â”€â”€ Pagination (mirrors TransactionRegistry's TransactionTable) â”€â”€â”€â”€â”€â”€â”€â”€
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Reset to page 1 when filters, search, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, docTypeFilter, reasonFilter, pageSize]);

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRecords);
  const pageRecords = useMemo(() => filteredRecords.slice(start, end), [filteredRecords, start, end]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  const autoCount = useMemo(() => records.filter((r) => r.reasonType === "Auto").length, [records]);
  const manualCount = useMemo(() => records.filter((r) => r.reasonType === "Manual").length, [records]);

  const hasActiveFilters = search.trim() !== "" || docTypeFilter !== "All types" || reasonFilter !== "All reasons";

  const resetFilters = () => {
    setSearch("");
    setDocTypeFilter("All types");
    setReasonFilter("All reasons");
  };

  return (
    <div className="arc-page">
      {/* ---- Header card ---- */}
      <div className="arc-header">
        <div className="arc-header-top">
          <div className="arc-header-titles">
            <h2>
              Archive Management
            </h2>
            <p>Archived records across all document types.</p>
          </div>
          <button
            className={`arc-refresh-btn ${isRefreshing ? "is-spinning" : ""}`}
            onClick={() => fetchArchivedData(true)}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="arc-summary-grid">
          <div className="arc-summary-card">
            <div className="arc-summary-icon-wrap arc-summary-icon-wrap--total">
              <Archive size={20} />
            </div>
            <div className="arc-summary-card-text">
              <span className="arc-summary-card-value">{records.length}</span>
              <span className="arc-summary-card-label">Total Archived</span>
            </div>
          </div>
          <div className="arc-summary-card">
            <div className="arc-summary-icon-wrap arc-summary-icon-wrap--auto">
              <RefreshCw size={18} />
            </div>
            <div className="arc-summary-card-text">
              <span className="arc-summary-card-value">{autoCount}</span>
              <span className="arc-summary-card-label">Auto-Archived</span>
            </div>
          </div>
          <div className="arc-summary-card">
            <div className="arc-summary-icon-wrap arc-summary-icon-wrap--manual">
              <RotateCcw size={18} />
            </div>
            <div className="arc-summary-card-text">
              <span className="arc-summary-card-value">{manualCount}</span>
              <span className="arc-summary-card-label">Manually Archived</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Table card ---- */}
      <div className="arc-card">
        <div className="arc-table-toolbar">
          <div className="arc-search-wrapper">
            <div className="arc-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference or declarant..."
              />
              {search && (
                <button className="arc-search-clear-btn" onClick={() => setSearch("")}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="arc-filter-select-wrap">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as DocTypeFilter)}
              className="arc-filter-select"
            >
              <option value="All types">All types</option>
              <option value="Tax Declaration">Tax Declaration</option>
              <option value="Certificate of Land Holding">Certificate of Land Holding</option>
              <option value="No-Landholding Certificate">No-Landholding Certificate</option>
              <option value="Certified True Copy">Certified True Copy</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>

          <div className="arc-filter-select-wrap">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
              className="arc-filter-select"
            >
              <option value="All reasons">All reasons</option>
              <option value="Auto">Auto</option>
              <option value="Manual">Manual</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>

          {hasActiveFilters && (
            <button className="arc-filter-reset" onClick={resetFilters}>
              Reset
            </button>
          )}
        </div>

        <div className="arc-table-scroll">
          <table className="arc-table">
            <thead>
              <tr>
                <th>Reference Number</th>
                <th>Declarant</th>
                <th>Document Type</th>
                <th>Reason</th>
                <th>Archived By</th>
                <th>Date &amp; Time</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="arc-table-empty">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <Loader2 size={18} style={{ animation: "arc-spin 1s linear infinite" }} />
                      Loading archives...
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="arc-table-empty">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "8px 0" }}>
                      <strong style={{ color: "var(--db-error)" }}>{loadError}</strong>
                      <button className="arc-restore-btn" onClick={() => fetchArchivedData()}>
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="arc-table-empty">
                    <strong>No archived records found.</strong>
                    Try adjusting your search or filters.
                  </td>
                </tr>
              ) : (
                pageRecords.map((record) => (
                  <tr key={record.id} className="arc-row">
                    <td>
                      <ReferenceBadge reference={record.reference} type={record.documentType} />
                    </td>
                    <td className="arc-declarant"><ExpandableText text={record.declarantName} /></td>
                    <td>
                      <DocTypeTag type={record.documentType} />
                    </td>
                    <td>
                      <div className="arc-reason-cell">
                        {record.reasonDetail && (
                          <span className="arc-reason-detail">{record.reasonDetail}</span>
                        )}
                      </div>
                    </td>
                    <td className="arc-cell-muted">{record.archivedBy}</td>
                    <td className="arc-cell-muted">
                      {record.archivedDate}, {record.archivedTime}
                    </td>
                    <td>
                      <div className="arc-actions">
                        <button
                          className="arc-restore-btn"
                          onClick={() => handleRestore(record.id, record.reference)}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="arc-pagination-footer">
          <div className="arc-pagination-left">
            <span className="arc-pagination-label">Rows per page:</span>
            <select
              className="arc-items-per-page"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              {[5, 10, 20, 50, 100, 150].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div className="arc-pagination-center">
            {totalRecords === 0 ? "0 of 0" : `${start + 1}–${end} of ${totalRecords}`}
          </div>

          <div className="arc-pagination-right">
            <button
              type="button"
              className="arc-page-btn-text"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="arc-page-current">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className="arc-page-btn-text"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}