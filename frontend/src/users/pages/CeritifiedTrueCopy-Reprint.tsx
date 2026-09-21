import { useEffect, useMemo, useState } from "react";
import { Search, Printer, CheckCircle2, Clock, ArrowLeft, ArrowRight, X } from "lucide-react";
import "../styles/TransactionRegistry.css";
import "../styles/select.css";
import type { CertifiedCopyRecord, CTCStatus, Transaction, DeclarantGroup } from "../types/transaction";
import { fetchTransactionRegistry } from "../services/transactionService";
import { TransactionDetails } from "./TransactionDetails";
import { ExpandableText } from "../components/common/ExpandableText";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { DateRangePicker } from "../components/DateRangePicker";
import { ADePTSelect } from "../components/ADePTSelect";
import { getDocPillMeta, getDocumentTypeFromReference, matchesDocumentType } from "../../utils/documentType";
import type { DocumentTypeFilterValue } from "../../utils/documentType";
import { formatDateTime } from "../../utils/dateTime";

const TaxDeclarationIcon = getDocPillMeta('Tax Declaration').Icon;
const LandholdingIcon = getDocPillMeta('Landholding').Icon;
const NoLandholdingIcon = getDocPillMeta('No Land Holding').Icon;

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

const CTC_COLUMNS = [
  "Reference No.", "Declarant", "Original Doc", "OR Number",
  "Justification", "Date & Time Requested", "Date & Time Released", "Released By", "Status", "Action",
];

const CTC_TABLE_MIN_WIDTH = 1500;

function toComparableDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
  onNavigateToPendingRequests?: () => void;
  onNavigateToPendingPayment?: () => void;
  onNavigateToArchive?: () => void;
  onNavigateToDashboard?: () => void;
}

export default function CertifiedTrueCopy({
  onNavigateToRegistry,
  onNavigateToVoidAmend,
  onNavigateToPendingRequests,
  onNavigateToPendingPayment,
  onNavigateToArchive,
  onNavigateToDashboard,
}: CertifiedTrueCopyProps) {
  const [records, setRecords] = useState<CertifiedCopyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All statuses");
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilterValue>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
        requestedAtISO: toComparableDate(t.requestedAt ?? t.dateRequested),
        dateReleased: formatDateTime(t.releasedAt ?? t.dateReleased) || "—",
        releasedAtISO: toComparableDate(t.releasedAt ?? t.dateReleased),
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

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, docTypeFilter, dateFrom, dateTo, rowsPerPage]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesStatus = statusFilter === "All statuses" || r.status === statusFilter;
      const matchesDocType = matchesDocumentType(r.reference, docTypeFilter);
      const comparable = r.releasedAtISO || r.requestedAtISO;
      const matchesDateFrom = !dateFrom || comparable >= dateFrom;
      const matchesDateTo = !dateTo || comparable <= dateTo;

      const term = search.toLowerCase().trim();
      if (!term) return matchesStatus && matchesDocType && matchesDateFrom && matchesDateTo;

      const matchesSearch = [
        r.reference, r.declarantName, r.originalDocument, r.orNumber,
        r.orJustification, r.dateRequested, r.dateReleased, r.releasedBy
      ].some(value => value.toLowerCase().includes(term));

      return matchesStatus && matchesSearch && matchesDocType && matchesDateFrom && matchesDateTo;
    });
  }, [records, search, statusFilter, docTypeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const releasedCount = useMemo(
    () => records.filter((r) => r.status === "Released").length,
    [records]
  );
  const pendingCount = records.length - releasedCount;

  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, safePage, rowsPerPage]);

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

            <div className="tr-legend-row">
              <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
              <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Landholding</div>
              <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Land Holding</div>
            </div>
          </>
        )}
      </div>

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
              <table className="tr-table" style={{ minWidth: CTC_TABLE_MIN_WIDTH }}>
                <thead>
                  <tr>
                    <th style={{ width: '240px' }}>Reference No.</th>
                    <th style={{ width: '12%' }}>Declarant</th>
                    <th style={{ width: '12%' }}>Original Doc</th>
                    <th style={{ width: '10%' }}>OR Number</th>
                    <th style={{ width: '11%' }}>Justification</th>
                    <th style={{ width: '14%' }}>Date &amp; Time Requested</th>
                    <th style={{ width: '14%' }}>Date &amp; Time Released</th>
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