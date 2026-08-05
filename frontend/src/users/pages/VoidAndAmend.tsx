import { useMemo, useState, useEffect } from "react";
import { Search, Ban, PencilLine, Loader2 } from "lucide-react";
import { fetchTransactionRegistry } from "../services/transactionService";
import { requestService } from "../services/requestService";
import type { Transaction } from "../types/transaction";
import "../styles/TransactionRegistry.css";

export type ActionType = "void";

/** A single row in the Void & Amend table — derived from a voided Transaction. */
export interface VoidAmendRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: string;
  actionType: ActionType;
  detail: string;
  actionedBy: string;
  actionedAt: string;
  hasBeenAmended?: boolean;
}

export interface AmendNavigationPayload {
  id: string;
  reference_number: string;
  declarant_name: string;
  requested_by_name: string;
  request_date: string;
  property_location: string | null;
  authorization_required: boolean;
  action_taken: string;
  documentTypeIds: string[];
  lockedDocType: true;
  amendedFromReference: string;
}

interface VoidAndAmendProps {
  onAmend?: (payload: AmendNavigationPayload) => void;
  pendingItems?: VoidAmendRecord[];
  onPendingItemsConsumed?: () => void;
  onNavigateToRegistry?: () => void;
  onNavigateToReprint?: () => void;
  /** Same two props TransactionRegistry / CertifiedTrueCopy use for their
   * first two breadcrumb links — wire these from Dashboard.tsx the same way
   * (onNavigateToPendingRequests -> 'document-request' view,
   * onNavigateToPendingPayment -> 'pending-payment' view). */
  onNavigateToPendingRequests?: () => void;
  onNavigateToPendingPayment?: () => void;
}

type TimeRange = "Today" | "Yesterday" | "This Week" | "This Month" | "All Time";

// ─── Constants ──────────────────────────────────────────────
// This no longer stores the void records themselves — the registry (via
// fetchTransactionRegistry) is the source of truth for *which* transactions
// are voided, so this list always matches what Reports & Analytics counts.
// It only caches the "who / when" for each void, since the Transaction type
// has no voidedBy column yet (only voidReason and voidedAt). Once the
// backend adds voidedBy too, this cache — and the whole metadata-merge
// dance below — can be shrunk further / removed entirely.
const METADATA_STORAGE_KEY = "voidAmendMetadata";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface VoidMetadataEntry {
  actionedBy: string;
  actionedAt: string;
  detail: string;
}
type VoidMetadataStore = Record<string, VoidMetadataEntry>;

// ─── Helpers ──────────────────────────────────────────────

function loadMetadataStore(): VoidMetadataStore {
  try {
    const stored = localStorage.getItem(METADATA_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveMetadataStore(store: VoidMetadataStore) {
  try {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // best-effort cache only — safe to ignore write failures
  }
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

const NOW = new Date();

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function matchesTimeRange(isoString: string | null, range: TimeRange): boolean {
  if (range === "All Time") return true;
  // If we don't actually know when this was voided (no voidedAt from the
  // backend and no cached metadata for it), it can only ever match
  // "All Time" rather than guessing.
  if (!isoString) return false;

  const actionedDate = new Date(isoString);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor(
    (new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime() -
      new Date(actionedDate.getFullYear(), actionedDate.getMonth(), actionedDate.getDate()).getTime()) /
    msPerDay
  );

  switch (range) {
    case "Today":
      return isSameCalendarDay(actionedDate, NOW);
    case "Yesterday":
      return dayDiff === 1;
    case "This Week":
      return dayDiff >= 0 && dayDiff <= 6;
    case "This Month":
      return (
        actionedDate.getFullYear() === NOW.getFullYear() &&
        actionedDate.getMonth() === NOW.getMonth()
      );
    default:
      return true;
  }
}

function ActionBadge() {
  return (
    <span className="tr-badge tr-badge--void" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Ban size={14} />
      Void
    </span>
  );
}

/**
 * Maps a live Void-status Transaction + whatever metadata we have cached
 * for it into a display record.
 *
 * actionedAt prefers t.voidedAt — the real timestamp the backend recorded
 * (requests.updated_at) at the moment voidRequest() ran — since that's
 * accurate regardless of which browser/session performed the void. The
 * local metadata cache is only used as a fallback for records voided
 * before voidedAt existed on the backend response.
 */
function toDisplayRecord(t: Transaction, metadata: VoidMetadataEntry | undefined): VoidAmendRecord {
  return {
    id: t.id,
    reference: t.referenceNumber,
    declarantName: t.client.declarantName,
    documentType: t.requestedDocuments.map((d) => d.documentType).join(", ") || "N/A",
    actionType: "void",
    detail: metadata?.detail || t.voidReason || "Voided from registry",
    actionedBy: metadata?.actionedBy || t.assignedStaff || "—",
    actionedAt: t.voidedAt || metadata?.actionedAt || "",
    hasBeenAmended: !!t.hasBeenAmended,
  };
}

const VA_COLUMNS = ["Reference No.", "Declarant", "Document Type", "Reason / Change", "Actioned By", "Date & Time", "Action"];

/* --- Skeleton (mirrors TransactionRegistry / CertifiedTrueCopy's shimmer pattern) --- */
function VoidAmendTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="tr-card">
      <div className="tr-table-scroll">
        <table className="tr-table">
          <thead>
            <tr>
              {VA_COLUMNS.map((col) => <th key={col} style={col === "Action" ? { textAlign: "center" } : undefined}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="tr-row">
                <td><div className="skeleton-item" style={{ width: '85%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '70%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '60%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '80%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '55%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '65%', height: 12 }} /></td>
                <td style={{ textAlign: "center" }}><div className="skeleton-item" style={{ width: '32px', height: 32, borderRadius: 7, margin: "0 auto" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────

export default function VoidAndAmend({
  onAmend,
  pendingItems = [],
  onPendingItemsConsumed,
  onNavigateToRegistry,
  onNavigateToReprint,
  onNavigateToPendingRequests,
  onNavigateToPendingPayment,
}: VoidAndAmendProps) {
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metadataStore, setMetadataStore] = useState<VoidMetadataStore>(() => loadMetadataStore());

  // ─── Amend action state ──────────────────────────────────
  const [amendingId, setAmendingId] = useState<string | null>(null);
  const [amendError, setAmendError] = useState<string | null>(null);

  const loadVoidedTransactions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const all = await fetchTransactionRegistry();
      setTransactions(all.filter((t) => t.status === "Void"));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load voided records.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVoidedTransactions();
  }, []);

  // ─── Seed the metadata cache from items just voided in this session ─────
  useEffect(() => {
    if (pendingItems && pendingItems.length > 0) {
      setMetadataStore((prev) => {
        const next = { ...prev };
        for (const item of pendingItems) {
          next[item.id] = {
            actionedBy: item.actionedBy,
            actionedAt: item.actionedAt,
            detail: item.detail,
          };
        }
        saveMetadataStore(next);
        return next;
      });
      if (onPendingItemsConsumed) onPendingItemsConsumed();
      // A void was just confirmed elsewhere — make sure our live list reflects it
      // even if this component was already mounted.
      loadVoidedTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingItems]);

  const records: VoidAmendRecord[] = useMemo(
    () => transactions.map((t) => toDisplayRecord(t, metadataStore[t.id])),
    [transactions, metadataStore]
  );

  // ─── Filtering & Sorting ─────────────────────────────────
  // Sorted newest void first — records.actionedAt is now backend-sourced
  // (t.voidedAt) for any transaction voided after this fix shipped, so this
  // sort is accurate across sessions/devices, not just the current browser.
  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        const matchesSearch =
          search.trim() === "" ||
          record.reference.toLowerCase().includes(search.toLowerCase()) ||
          record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
          record.documentType.toLowerCase().includes(search.toLowerCase()) ||
          record.detail.toLowerCase().includes(search.toLowerCase()) ||
          record.actionedBy.toLowerCase().includes(search.toLowerCase());
        const matchesTime = matchesTimeRange(record.actionedAt || null, timeRange);
        return matchesSearch && matchesTime;
      })
      .sort((a, b) => {
        // Records with a known actionedAt sort newest-first; unknown ones sink to the bottom.
        if (!a.actionedAt && !b.actionedAt) return 0;
        if (!a.actionedAt) return 1;
        if (!b.actionedAt) return -1;
        return new Date(b.actionedAt).getTime() - new Date(a.actionedAt).getTime();
      });
  }, [records, search, timeRange]);

  // ─── Pagination ───────────────────────────────────────────
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, timeRange, pageSize]);

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRecords);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(start, end);
  }, [filteredRecords, start, end]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  // ─── Amend callback ──────────────────────────────────────
  const handleAmendClick = async (record: VoidAmendRecord) => {
    if (record.hasBeenAmended || amendingId) return;

    setAmendError(null);
    setAmendingId(record.id);
    try {
      const result = await requestService.amendRequest(record.id);
      const req = result.request;

      if (onAmend) {
        onAmend({
          id: req.id,
          reference_number: req.reference_number,
          declarant_name: req.declarant_name,
          requested_by_name: req.requested_by_name,
          request_date: req.request_date,
          property_location: req.property_location,
          authorization_required: req.authorization_required,
          action_taken: req.action_taken,
          documentTypeIds: [result.documentTypeId],
          lockedDocType: true,
          amendedFromReference: record.reference,
        });
      } else {
        console.warn("VoidAndAmend: onAmend prop not provided — cannot navigate after amend.");
      }
    } catch (err) {
      setAmendError(
        err instanceof Error ? err.message : `Failed to start amendment for ${record.reference}.`
      );
    } finally {
      setAmendingId(null);
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="tr-page">
      <div className="tr-header">
        {/* Document Request > Pending Requests > Standing Transaction Management > Void & Amend —
            same breadcrumb chain as TransactionRegistry / CertifiedTrueCopy. The first two links
            reuse the same props/wiring those pages use; "Standing Transaction Management" reuses
            the onNavigateToRegistry prop this component already received. */}
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
          <span className="tr-breadcrumb-item--current">Void &amp; Amend</span>
        </nav>

        <div className="tr-header-top">
          <div className="tr-header-titles">
            <h2>Void and Amended Records</h2>
            <p>Every voided document, with the reason and who actioned it.</p>
          </div>
        </div>

        {/* Pill tab nav — inlined directly here (no separate TransactionTabs.tsx
            import), matching how TransactionRegistry and CertifiedTrueCopy render
            their own tabs in-page. "voidAmend" is always the active tab since
            this IS the void & amend page. */}
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
            className="tr-tab"
            onClick={onNavigateToReprint}
          >
            Reprint/CTC
          </button>
          <button
            type="button"
            className="tr-tab tr-tab--active"
            aria-current="page"
          >
            Void &amp; Amend
          </button>
        </div>
      </div>

      {amendError && (
        <div
          style={{
            padding: "10px 16px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#b91c1c",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          {amendError}
        </div>
      )}

      {loading ? (
        <VoidAmendTableSkeleton />
      ) : loadError ? (
        <div className="tr-card" style={{ padding: '32px', textAlign: 'center', color: '#B0281C' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{loadError}</p>
          <button className="tr-filter-reset" onClick={loadVoidedTransactions}>Retry</button>
        </div>
      ) : (
        <div className="tr-card">
          <div className="tr-table-toolbar">
            <div className="tr-search-wrapper">
              <div className="tr-search">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, declarant, or reason"
                />
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="tr-filter-select"
              >
                <option>All Time</option>
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>
          </div>

          <div className="tr-table-scroll">
            <table className="tr-table">
              <thead>
                <tr>
                  <th>Reference No.</th>
                  <th>Declarant</th>
                  <th>Document Type</th>
                  <th>Reason / Change</th>
                  <th>Actioned By</th>
                  <th>Date &amp; Time</th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td className="tr-table-empty" colSpan={7}>
                      <strong>No voided records found</strong>
                      No voided records match your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
                    <tr key={record.id} className="tr-row">
                      <td><span className="tr-ref">#{record.reference}</span></td>
                      <td><span className="tr-declarant" title={record.declarantName}>{record.declarantName}</span></td>
                      <td>{record.documentType}</td>
                      <td>{record.detail}</td>
                      <td>{record.actionedBy}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {record.actionedAt ? formatDateTime(record.actionedAt) : "—"}
                      </td>
                      <td>
                        <div className="tr-actions">
                          <ActionBadge />
                          <button
                            type="button"
                            className="tr-action-btn"
                            title={
                              record.hasBeenAmended
                                ? `${record.reference} has already been amended`
                                : `Amend ${record.reference}`
                            }
                            aria-label={`Amend ${record.reference}`}
                            onClick={() => handleAmendClick(record)}
                            disabled={amendingId === record.id || record.hasBeenAmended}
                            style={
                              record.hasBeenAmended
                                ? { opacity: 0.4, cursor: "not-allowed" }
                                : undefined
                            }
                          >
                            {amendingId === record.id ? (
                              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                              <PencilLine size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalRecords > 0 && (
            <div className="tr-pagination-footer">
              <div className="tr-pagination-left">
                <span className="tr-pagination-label">Rows per page:</span>
                <select
                  className="tr-items-per-page"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="tr-pagination-center">
                {totalRecords === 0 ? "0 of 0" : `${start + 1}–${end} of ${totalRecords}`}
              </div>

              <div className="tr-pagination-right">
                <button
                  type="button"
                  className="tr-page-btn-text"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="tr-page-current">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  className="tr-page-btn-text"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}