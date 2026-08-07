import { useMemo, useState, useEffect, useRef } from "react";
import {
  Search,
  Archive,
  RotateCcw,
  Loader2,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { requestService } from "../services/requestService";
import { fetchTransactionRegistry } from "../services/transactionService";
import { ExpandableText } from "../components/common/ExpandableText";
import { SkeletonBox } from "../components/common/Skeleton";
import { getDocumentTypeFromReference, getDocPillMeta, matchesDocumentType, type DocumentTypeFilterValue } from "../../utils/documentType";
import { RestoreConfirmModal } from "../components/RestoreConfirmModal";
import { DateRangePicker } from "../components/DateRangePicker";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { ADePTSelect } from "../components/ADePTSelect";
import type { Transaction, RequestedDocumentItem } from "../types/transaction";
import "../styles/ArchiveManagement.css";
import "../styles/select.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
// The system supports exactly three document types (see the shared
// documentType.tsx prefix map: TD / NLH / LH). The archive filter list
// and row labels must only ever surface these three.
type DocumentType = "Tax Declaration" | "No Land Holding" | "Landholding";

type ArchiveReason = "Auto" | "Manual";

// Whether this record landed here because the transaction was manually
// archived (pending payment → Archive Management) or because it was
// cancelled (cancel button in Final Verification & Payment).
type ArchiveStatus = "Cancelled" | "Archived";

interface ArchivedRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: DocumentType;
  status: ArchiveStatus;
  archivedDate: string;
  archivedTime: string;
  archivedDateISO: string;
  archivedBy: string;
  reasonType: ArchiveReason;
  reasonDetail: string;
}

type StatusFilter = "All statuses" | ArchiveStatus;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maps a transaction onto one of the three canonical document types.
 * The reference-number prefix (TD / NLH / LH — via the shared
 * documentType.tsx util) is the most reliable signal; the registry
 * document name is used as a fallback (it also covers the CTC variant
 * of Tax Declarations, which shares the TD prefix family).
 */
function resolveArchiveDocName(docs: RequestedDocumentItem[], referenceNumber: string): DocumentType {
  const fromReference = getDocumentTypeFromReference(referenceNumber);
  if (fromReference) return fromReference as DocumentType;

  const name = docs[0]?.documentType ?? "";
  if (name.includes("Tax Declaration")) return "Tax Declaration";
  if (
    name.includes("No Landholding") ||
    name.includes("No-Landholding") ||
    name.includes("No Land Holding")
  ) {
    return "No Land Holding";
  }
  if (name.includes("Landholding") || name.includes("Land Holding")) return "Landholding";

  return "Tax Declaration";
}

function StatusBadge({ status }: { status: ArchiveStatus }) {
  return (
    <span className={`arc-status-badge arc-status-badge--${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

function ReferenceBadge({ reference, type }: { reference: string; type: DocumentType }) {
  const meta = getDocPillMeta(type);
  return (
    <span className={`tr-doc-pill ${meta.className}`} title={reference}>
      <meta.Icon />
      {reference}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton loading — mirrors TransactionRegistry's lazy-load pattern */
/*  (components/common/Skeleton.tsx + the .tr-lazy-load wrapper): the  */
/*  summary cards and the toolbar/table are ghost skeletons while the  */
/*  first fetch runs, then the real cards mount in the same spots, so  */
/*  nothing jumps on load.                                             */
/* ------------------------------------------------------------------ */

function ArchiveSummarySkeleton() {
  return (
    <div className="arc-summary-grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="arc-summary-card">
          <div className="arc-summary-icon-wrap">
            <SkeletonBox width="20px" height="20px" borderRadius="999px" />
          </div>
          <div className="arc-summary-card-text">
            <SkeletonBox width="42%" height="24px" />
            <SkeletonBox width="68%" height="10px" margin="6px 0 0" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchiveToolbarSkeleton() {
  return (
    <div className="arc-table-toolbar">
      <div className="arc-search-wrapper">
        <SkeletonBox width="100%" height="38px" borderRadius="999px" />
      </div>
      <SkeletonBox width="200px" height="38px" borderRadius="999px" />
      <SkeletonBox width="220px" height="38px" borderRadius="999px" />
    </div>
  );
}

const ARCHIVE_TABLE_COLUMNS = [
  "Reference Number",
  "Declarant",
  "Status",
  "Reason",
  "Archived By",
  "Date & Time",
  "Action",
];

function ArchiveTableSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="arc-card">
      <ArchiveToolbarSkeleton />
      <div className="arc-table-scroll">
        <table className="arc-table">
          <thead>
            <tr>
              {ARCHIVE_TABLE_COLUMNS.map((col) => (
                <th key={col} style={col === "Action" ? { textAlign: "center" } : undefined}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td><SkeletonBox width="75%" height="12px" /></td>
                <td><SkeletonBox width="85%" height="12px" /></td>
                <td><SkeletonBox width="55%" height="12px" /></td>
                <td><SkeletonBox width="50%" height="12px" /></td>
                <td><SkeletonBox width="65%" height="12px" /></td>
                <td><SkeletonBox width="60%" height="12px" /></td>
                <td style={{ textAlign: "center" }}><SkeletonBox width="72px" height="30px" borderRadius="7px" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
    documentType: resolveArchiveDocName(t.requestedDocuments, t.referenceNumber),
    status: isCancelled ? "Cancelled" : "Archived",
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
    archivedDateISO: `${requested.getFullYear()}-${String(requested.getMonth() + 1).padStart(2, "0")}-${String(requested.getDate()).padStart(2, "0")}`,
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
interface ArchiveManagementProps {
  // Breadcrumb navigation — mirrors the onNavigateTo* wiring used by
  // TransactionRegistry/CertifiedTrueCopy: the parent (Dashboard) passes
  // the active-view setters so the breadcrumb can jump between screens.
  onNavigateToDashboard?: () => void;
  onNavigateToPendingPayment?: () => void;
}

export default function ArchiveManagement({
  onNavigateToDashboard,
  onNavigateToPendingPayment,
}: ArchiveManagementProps) {
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [reasonFilter, setReasonFilter] = useState<StatusFilter>("All statuses");
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilterValue>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Restore confirmation modal target (replaces the native window.confirm).
  const [restoreTarget, setRestoreTarget] = useState<{ id: string; reference: string } | null>(null);
  // Restore feedback — reuses the system's existing .as-toast design
  // (accountSettings.css): bottom-center, dark pill, 2500ms auto-dismiss.
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimer = useRef<number | null>(null);
  // Prevents duplicate restore requests while one is in flight.
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  };

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
    if (restoringId) return; // don't fire a second restore while one is in flight
    setRestoringId(id);
    try {
      await requestService.updateRequest(id, { status: "PENDING_PAYMENT" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
      // Only claim success after the backend confirms the restore.
      showToast("success", `Document ${ref} restored successfully.`);
      // The restored record lands back in the Pending Payments queue —
      // navigate there so the user sees the request back in the queue.
      onNavigateToPendingPayment?.();
    } catch {
      showToast("error", "Failed to restore document. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesReason = reasonFilter === "All statuses" || record.status === reasonFilter;
      const matchesSearch =
        search.trim() === "" ||
        record.reference.toLowerCase().includes(search.toLowerCase()) ||
        record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        record.archivedBy.toLowerCase().includes(search.toLowerCase()) ||
        record.reasonDetail.toLowerCase().includes(search.toLowerCase());
      // Same ISO-string date comparison the Transaction Registry uses.
      const matchesDateFrom = !dateFrom || record.archivedDateISO >= dateFrom;
      const matchesDateTo = !dateTo || record.archivedDateISO <= dateTo;
      // Same reference-prefix document-type check the Registry uses.
      const matchesDocType = matchesDocumentType(record.reference, docTypeFilter);
      return matchesReason && matchesSearch && matchesDateFrom && matchesDateTo && matchesDocType;
    });
  }, [records, search, reasonFilter, dateFrom, dateTo, docTypeFilter]);

  // ── Pagination (mirrors TransactionRegistry's TransactionTable) ──
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Reset to page 1 when filters, search, or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, reasonFilter, docTypeFilter, dateFrom, dateTo, pageSize]);

  // Same clamp the Registry/Reports use: if data shrinks (e.g. Restoring
  // the last row of the last page, or a filter narrowing the list) the
  // view falls back to the last valid page instead of an empty page.
  const activePage = Math.min(currentPage, totalPages);

  const start = (activePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRecords);
  const pageRecords = useMemo(() => filteredRecords.slice(start, end), [filteredRecords, start, end]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  const cancelledCount = useMemo(() => records.filter((r) => r.status === "Cancelled").length, [records]);
  const archivedCount = useMemo(() => records.filter((r) => r.status === "Archived").length, [records]);

  const hasActiveFilters =
    search.trim() !== "" || reasonFilter !== "All statuses" || docTypeFilter !== "All" || dateFrom !== "" || dateTo !== "";

  const resetFilters = () => {
    setSearch("");
    setReasonFilter("All statuses");
    setDocTypeFilter("All");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="arc-page">
      {/* ---- Header card ---- */}
      <div className="arc-header">
        {/* Breadcrumb — reuses the shared .tr-breadcrumb styles from
            TransactionRegistry.css (same classes Void & Amend and
            Reprint/CTC use), so this reads identically to the registry. */}
        <nav className="tr-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToDashboard ?? (() => {})}
          >
            Dashboard
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToPendingPayment ?? (() => {})}
          >
            Pending Payment
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
          <span className="tr-breadcrumb-item--current">Archive Management</span>
        </nav>

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

        {loading ? (
          <ArchiveSummarySkeleton />
        ) : (
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
              <div className="arc-summary-icon-wrap arc-summary-icon-wrap--cancelled">
                <X size={18} />
              </div>
              <div className="arc-summary-card-text">
                <span className="arc-summary-card-value">{cancelledCount}</span>
                <span className="arc-summary-card-label">Cancelled</span>
              </div>
            </div>
            <div className="arc-summary-card">
              <div className="arc-summary-icon-wrap arc-summary-icon-wrap--archived">
                <Archive size={18} />
              </div>
              <div className="arc-summary-card-text">
                <span className="arc-summary-card-value">{archivedCount}</span>
                <span className="arc-summary-card-label">Archived</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Table card ---- */}
      {loading ? (
        <div className="tr-lazy-load">
          <ArchiveTableSkeleton />
        </div>
      ) : loadError ? (
        <div className="arc-card" style={{ padding: "32px", textAlign: "center", color: "#B0281C" }}>
          <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{loadError}</p>
          <button className="arc-restore-btn" onClick={() => fetchArchivedData()}>
            Retry
          </button>
        </div>
      ) : (
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

          <ADePTSelect
            ariaLabel="Filter by status"
            value={reasonFilter}
            onChange={(v) => setReasonFilter(v as StatusFilter)}
            options={[
              { value: "All statuses", label: "All statuses" },
              { value: "Cancelled", label: "Cancelled" },
              { value: "Archived", label: "Archived" },
            ]}
          />

          <DocumentTypeFilter value={docTypeFilter} onChange={setDocTypeFilter} />

          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />

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
                <th>Status</th>
                <th>Reason</th>
                <th>Archived By</th>
                <th>Date &amp; Time</th>
                <th style={{ textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
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
                    <td className="arc-declarant">
                      <ExpandableText text={record.declarantName} />
                    </td>
                    <td>
                      <StatusBadge status={record.status} />
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
                          onClick={() => setRestoreTarget({ id: record.id, reference: record.reference })}
                          disabled={restoringId === record.id}
                        >
                          {restoringId === record.id ? (
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          {restoringId === record.id ? "Restoring..." : "Restore"}
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
            <ADePTSelect
              variant="sm"
              ariaLabel="Rows per page"
              value={String(pageSize)}
              onChange={(v) => handlePageSizeChange(Number(v))}
              options={[5, 10, 20, 50, 100, 150].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>

          <div className="arc-pagination-center">
            {totalRecords === 0 ? "0 of 0" : `${start + 1}–${end} of ${totalRecords}`}
          </div>

          <div className="arc-pagination-right">
            <button
              type="button"
              className="arc-page-btn-text"
              onClick={() => handlePageChange(activePage - 1)}
              disabled={activePage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            <span className="arc-page-current">Page {activePage} of {totalPages}</span>
            <button
              type="button"
              className="arc-page-btn-text"
              onClick={() => handlePageChange(activePage + 1)}
              disabled={activePage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Restore confirmation modal — system rc-modal design (same as the
          logout confirm), replacing the old native window.confirm(). */}
      <RestoreConfirmModal
        open={!!restoreTarget}
        reference={restoreTarget?.reference ?? ""}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (!restoreTarget) return;
          const { id, reference } = restoreTarget;
          setRestoreTarget(null);
          void handleRestore(id, reference);
        }}
      />

      {/* Restore feedback toast — same .as-toast design as the rest of ADePT
          (bottom-center, dark pill, 2500ms auto-dismiss), with a success/error
          icon variant. */}
      {toast && (
        <div
          className={`as-toast as-toast--${toast.type}`}
          role={toast.type === "error" ? "alert" : "status"}
        >
          {toast.type === "success"
            ? <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            : <X size={16} strokeWidth={2.5} aria-hidden="true" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}