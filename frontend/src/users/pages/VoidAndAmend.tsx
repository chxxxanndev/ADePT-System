import { useMemo, useState, useEffect } from "react";
import { Search, Ban, PencilLine, Loader2, CheckCircle2, ArrowLeft, ArrowRight, X } from "lucide-react";
import { fetchTransactionRegistry } from "../services/transactionService";
import { requestService } from "../services/requestService";
import type { Transaction, DeclarantGroup } from "../types/transaction";
import { TransactionDetails } from "./TransactionDetails";
import "../styles/TransactionRegistry.css";
import "../styles/select.css";
import { ExpandableText } from "../components/common/ExpandableText";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { DateRangePicker } from "../components/DateRangePicker";
import { ADePTSelect } from "../components/ADePTSelect";
import { getDocPillMeta, getDocumentTypeFromReference, matchesDocumentType } from "../../utils/documentType";
import type { DocumentTypeFilterValue } from "../../utils/documentType";

const TaxDeclarationIcon = getDocPillMeta('Tax Declaration').Icon;
const LandholdingIcon = getDocPillMeta('Landholding').Icon;
const NoLandholdingIcon = getDocPillMeta('No Land Holding').Icon;

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
  onNavigateToPendingRequests?: () => void;
  onNavigateToPendingPayment?: () => void;
  onNavigateToArchive?: () => void;
  onNavigateToDashboard?: () => void;
}

function toComparableDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Constants

const METADATA_STORAGE_KEY = "voidAmendMetadata";
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100, 150];

interface VoidMetadataEntry {
  actionedBy: string;
  actionedAt: string;
  detail: string;
}
type VoidMetadataStore = Record<string, VoidMetadataEntry>;

// ─── Helpers

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
    // best-effort cache only
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

function ActionBadge() {
  return (
    <span className="tr-badge tr-badge--void" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Ban size={14} />
      Voided
    </span>
  );
}

function AmendedBadge({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <CheckCircle2 size={14} />
      Amended
    </>
  );
  if (!onClick) {
    return (
      <span
        className="tr-badge tr-badge--amend"
        title="An amended copy of this document already exists"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {content}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="tr-badge tr-badge--amend tr-badge--btn"
      title="View the amended copy"
      aria-label="View the amended copy"
      onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      {content}
    </button>
  );
}

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

const VA_COLUMNS = ["Reference No.", "Declarant", "Reason / Change", "Actioned By", "Date & Time", "Status", "Action"];

const VA_TABLE_MIN_WIDTH = 1120;


function VoidAmendSummarySkeleton() {
  return (
    <div className="tr-summary-grid tr-summary-grid--multi">
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-card-ghost tr-summary-skeleton-card">
          <div className="skeleton-item" style={{ width: '60%', height: 10 }} />
          <div className="skeleton-item" style={{ width: '30%', height: 20 }} />
        </div>
      ))}
    </div>
  );
}

/* --- Skeleton (mirrors TransactionRegistry / CertifiedTrueCopy's shimmer pattern) --- */
function VoidAmendTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="tr-card">
      <div className="tr-table-scroll">
        <table className="tr-table" style={{ minWidth: VA_TABLE_MIN_WIDTH }}>
          <thead>
            <tr>
              {VA_COLUMNS.map((col) => (
                <th key={col} style={col === "Action" || col === "Status" ? { textAlign: "center" } : undefined}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="tr-row">
                <td><div className="skeleton-item" style={{ width: '85%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '70%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '80%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '55%', height: 12 }} /></td>
                <td><div className="skeleton-item" style={{ width: '65%', height: 12 }} /></td>
                <td style={{ textAlign: "center" }}><div className="skeleton-item" style={{ width: 64, height: 22, borderRadius: 999, margin: "0 auto" }} /></td>
                <td style={{ textAlign: "center" }}><div className="skeleton-item" style={{ width: '100px', height: 30, borderRadius: 7, margin: "0 auto" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Component 

export default function VoidAndAmend({
  onAmend,
  pendingItems = [],
  onPendingItemsConsumed,
  onNavigateToRegistry,
  onNavigateToReprint,
  onNavigateToPendingRequests,
  onNavigateToPendingPayment,
  onNavigateToArchive,
  onNavigateToDashboard,
}: VoidAndAmendProps) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilterValue>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metadataStore, setMetadataStore] = useState<VoidMetadataStore>(() => loadMetadataStore());

  // ─── Amend action state 
  const [amendingId, setAmendingId] = useState<string | null>(null);
  const [amendError, setAmendError] = useState<string | null>(null);

  // ─── View (details drawer) state 

  const [viewId, setViewId] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"voided" | "amended">("voided");

  const loadVoidedTransactions = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const all = await fetchTransactionRegistry();
      setAllTransactions(all);
      setTransactions(all.filter((t) => t.status === "Void"));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load voided records.");
      setTransactions([]);
      setAllTransactions([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadVoidedTransactions();
  }, []);

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

      loadVoidedTransactions();
    }
  }, [pendingItems]);

  const records: VoidAmendRecord[] = useMemo(
    () => transactions.map((t) => toDisplayRecord(t, metadataStore[t.id])),
    [transactions, metadataStore]
  );

  // ─── Amended-copy lookup 
  const transactionsByRef = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const t of allTransactions) map.set(t.referenceNumber, t);
    return map;
  }, [allTransactions]);

  const amendedByOriginal = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const t of allTransactions) {
      if (t.amendedFromId && !map.has(t.amendedFromId)) map.set(t.amendedFromId, t);
    }
    return map;
  }, [allTransactions]);

  const openView = (record: VoidAmendRecord, tab: "voided" | "amended") => {
    setViewTab(tab);
    setViewId(record.id);
  };

  const viewVoidedTxn = viewId ? allTransactions.find((t) => t.id === viewId) ?? null : null;
  const viewAmendedTxn = viewId ? amendedByOriginal.get(viewId) ?? null : null;
  const viewRecord = viewId ? records.find((r) => r.id === viewId) ?? null : null;
  const viewingAmended = viewTab === "amended" && !!viewAmendedTxn;
  const viewGroup: DeclarantGroup | null = viewVoidedTxn
    ? {
        declarantName: viewingAmended && viewAmendedTxn
          ? viewAmendedTxn.client.declarantName
          : viewVoidedTxn.client.declarantName,
        transactions: [viewingAmended && viewAmendedTxn ? viewAmendedTxn : viewVoidedTxn],
      }
    : null;

  // ─── Summary counts 
  const amendedCount = allTransactions.filter((t) => t.amendedFromId).length;
  const voidedCount = transactions.length;

  // ─── Filtering & Sorting 
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

        const comparable = record.actionedAt ? toComparableDate(record.actionedAt) : "";
        const matchesDate =
          (!dateFrom && !dateTo) ||
          (comparable !== "" &&
            (!dateFrom || comparable >= dateFrom) &&
            (!dateTo || comparable <= dateTo));

        const matchesStatus =
          statusFilter === "All statuses" ||
          (statusFilter === "Voided" && !record.hasBeenAmended) ||
          (statusFilter === "Amended" && record.hasBeenAmended);
        const matchesDocType = matchesDocumentType(record.reference, docTypeFilter);
        return matchesSearch && matchesDate && matchesStatus && matchesDocType;
      })
      .sort((a, b) => {
        if (!a.actionedAt && !b.actionedAt) return 0;
        if (!a.actionedAt) return 1;
        if (!b.actionedAt) return -1;
        return new Date(b.actionedAt).getTime() - new Date(a.actionedAt).getTime();
      });
  }, [records, search, dateFrom, dateTo, statusFilter, docTypeFilter]);

  // ─── Pagination 
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFrom, dateTo, statusFilter, docTypeFilter, pageSize]);

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

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
  };

  // ─── Amend callback 
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

  // ─── Render 

  return (
    <div className="tr-page">
      <div className="tr-header">
        <nav className="tr-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="tr-breadcrumb-item--link"
            onClick={onNavigateToDashboard}
          >
            Dashboard
          </button>
          <span className="tr-breadcrumb-sep">&gt;</span>
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
          <span className="tr-breadcrumb-item--current">Void &amp; Amend</span>
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
            <h2>Void and Amended Records</h2>
            <p>Every voided document, with the reason and who actioned it.</p>
          </div>
          <button
            className={`tr-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
            onClick={() => loadVoidedTransactions(true)}
            title="Refresh registry"
            aria-label="Refresh registry"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span className="refresh-btn-label">Refresh</span>
          </button>
        </div>

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

        {loading ? (
          <VoidAmendSummarySkeleton />
        ) : (
          <>
            <div className="tr-summary-grid tr-summary-grid--multi">
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--amend">
                  <PencilLine size={20} strokeWidth={2.3} />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{amendedCount}</span>
                  <span className="tr-summary-card-label">Total Amended Documents</span>
                </div>
              </div>
              <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--void">
                  <Ban size={20} strokeWidth={2.3} />
                </div>
                <div className="tr-summary-card-text">
                  <span className="tr-summary-card-value">{voidedCount}</span>
                  <span className="tr-summary-card-label">Total Voided Documents</span>
                </div>
              </div>
            </div>

            <div className="tr-legend-row">
              <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
              <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Landholding</div>
              <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Land Holding</div>
            </div>
          </>
        )}
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
          <button className="tr-filter-reset" onClick={() => loadVoidedTransactions()}>Retry</button>
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
            <ADePTSelect
              ariaLabel="Filter by status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "All statuses", label: "All statuses" },
                { value: "Voided", label: "Voided" },
                { value: "Amended", label: "Amended" },
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
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="tr-filter-reset tr-filter-reset--danger"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                title="Clear the date range"
                aria-label="Clear the date range"
              >
                <X size={13} />
                Reset
              </button>
            )}
          </div>

          <div className="tr-table-scroll">
            <table className="tr-table" style={{ minWidth: VA_TABLE_MIN_WIDTH }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Reference No.</th>
                  <th style={{ width: '14%' }}>Declarant</th>
                  <th style={{ width: '19%' }}>Reason / Change</th>
                  <th style={{ width: '14%' }}>Actioned By</th>
                  <th style={{ width: '13%' }}>Date &amp; Time</th>
                  <th style={{ width: '11%', textAlign: "center" }}>Status</th>
                  <th style={{ width: '15%', textAlign: "center" }}>Action</th>
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
                  paginatedRecords.map((record) => {
                    const docPillMeta = getDocPillMeta(getDocumentTypeFromReference(record.reference) ?? '');
                    return (
                      <tr
                        key={record.id}
                        className={`tr-row${record.hasBeenAmended ? ' tr-row--amended' : ''}`}
                      >
                        <td>
                          <span className={`tr-doc-pill ${docPillMeta.className}`} title={record.reference}>
                            <docPillMeta.Icon />
                            {record.reference}
                          </span>
                        </td>
                        <td><ExpandableText text={record.declarantName} className="tr-declarant" /></td>
                        <td><ExpandableText text={record.detail} /></td>
                        <td><ExpandableText text={record.actionedBy} /></td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {record.actionedAt ? formatDateTime(record.actionedAt) : "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {record.hasBeenAmended ? (
                            <AmendedBadge onClick={() => openView(record, "amended")} />
                          ) : (
                            <ActionBadge />
                          )}
                        </td>
                        <td>
                          <div className="tr-actions">
                            <button
                              type="button"
                              className="tr-view-details-btn"
                              title={`View ${record.reference}${record.hasBeenAmended ? " voided details" : ""}`}
                              aria-label={`View ${record.reference}`}
                              onClick={() => openView(record, "voided")}
                            >
                              View
                            </button>
                            {!record.hasBeenAmended && (
                              <button
                                type="button"
                                className="tr-action-btn"
                                title={`Amend ${record.reference}`}
                                aria-label={`Amend ${record.reference}`}
                                onClick={() => handleAmendClick(record)}
                                disabled={amendingId === record.id}
                              >
                                {amendingId === record.id ? (
                                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                ) : (
                                  <PencilLine size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalRecords > 0 && (
            <div className="tr-pagination-footer">
              <div className="tr-pagination-left">
                <span className="tr-pagination-label">Rows per page:</span>
                <ADePTSelect
                  variant="sm"
                  ariaLabel="Rows per page"
                  value={String(pageSize)}
                  onChange={(v) => handlePageSizeChange(Number(v))}
                  options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                />
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

      {viewGroup && viewVoidedTxn && (
        <TransactionDetails
          group={viewGroup}
          transactionsByRef={transactionsByRef}
          onClose={() => {
            setViewId(null);
            setViewTab("voided");
          }}
          subtitle={
            viewingAmended && viewAmendedTxn
              ? `Amended copy replacing ${viewVoidedTxn.referenceNumber}`
              : "Voided record"
          }
          banner={
            viewAmendedTxn ? (
              viewingAmended ? (
                <>
                  <span className="td-banner-note">
                    <CheckCircle2 size={14} />
                    Amended copy of voided document {viewVoidedTxn.referenceNumber}
                  </span>
                  <button
                    type="button"
                    className="td-banner-link"
                    onClick={() => setViewTab("voided")}
                  >
                    <ArrowLeft size={13} />
                    Back to Voided Details
                  </button>
                </>
              ) : (
                <>
                  <span className="td-banner-note">
                    <Ban size={14} />
                    Voided on {viewRecord?.actionedAt ? formatDateTime(viewRecord.actionedAt) : "—"}
                    {viewRecord?.actionedBy && viewRecord.actionedBy !== "—"
                      ? ` · by ${viewRecord.actionedBy}`
                      : ""}
                    {viewRecord?.detail ? ` · ${viewRecord.detail}` : ""}
                  </span>
                  <button
                    type="button"
                    className="td-banner-link"
                    onClick={() => setViewTab("amended")}
                  >
                    View Amended Copy
                    <span className="td-banner-ref">{viewAmendedTxn.referenceNumber}</span>
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