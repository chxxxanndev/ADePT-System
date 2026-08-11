import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileText,
  FileStack,
  ShieldCheck,
  Search,
  ListChecks,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ClipboardList,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "../styles/ReportsAnalytics.css";
import "../styles/select.css";
import { useReportsAnalytics } from "../hooks/useReportsAnalytics";
import { ExpandableText } from "../components/common/ExpandableText";
import { getDocPillMeta } from "../../utils/documentType";
import type { DocumentTypeFilterValue } from "../../utils/documentType";
import { DocumentTypeFilter } from "../components/DocumentTypeFilter";
import { ADePTSelect } from "../components/ADePTSelect";
import { SkeletonBox } from "../components/common/Skeleton";
import type { TransactionStatus } from "../types/transaction";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

/** Real system statuses shown by the Declarant Records table (TransactionStatus
 *  passed through verbatim by useReportsAnalytics) — grouped in a logical order
 *  for the filter dropdown. "Reprinted" is a special pseudo-status: it isn't a
 *  lifecycle state, it matches transactions whose documents were reprinted
 *  (reprintedDocuments > 0). */
type StatusFilterValue = TransactionStatus | "Reprinted" | "All";

const STATUS_OPTIONS: TransactionStatus[] = [
  "Released",
  "Pending",
  "For Payment",
  "Payment Verified",
  "Processing",
  "Ready for Release",
  "Cancelled",
  "Void",
  "Archived",
];

const STATUS_CLASS: Record<TransactionStatus, string> = {
  Released: "status-badge--released",
  Archived: "status-badge--archived",
  Cancelled: "status-badge--voided",
  Void: "status-badge--voided",
  Pending: "status-badge--pending-payment",
  "For Payment": "status-badge--pending-payment",
  "Payment Verified": "status-badge--pending-payment",
  Processing: "status-badge--pending-payment",
  "Ready for Release": "status-badge--pending-payment",
};

// Per-document-type fill colors for the Reprinted Documents card — each
// declarant's breakdown bar takes the color of its document-type pill so
// the composition reads at a glance (matchers getDocPillMeta's classes).
const REPRINT_FILL_CLASS: Record<string, string> = {
  "tr-doc-pill--td": "reprints-bar-fill--td",
  "tr-doc-pill--lh": "reprints-bar-fill--lh",
  "tr-doc-pill--nlh": "reprints-bar-fill--nlh",
};

/** Two-letter initials from a declarant name (mirrors the hook's avatar logic). */
function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// FIX: pagination options for the Declarant Records table, mirroring
// TransactionTable.tsx's ROWS_PER_PAGE_OPTIONS so behavior/labels match
// across the app (see TransactionRegistry's "Rows per page" control).
const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  const options: Period[] = ["daily", "weekly", "monthly"];
  return (
    <div className="period-toggle">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`period-btn${opt === period ? " active" : ""}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TrendTag({
  direction,
  percentage,
  comparedTo,
}: {
  direction: "up" | "down";
  percentage: number;
  comparedTo: string;
}) {
  const Icon = direction === "up" ? TrendingUp : TrendingDown;
  return (
    <span className={`trend-tag trend-tag--${direction}`}>
      <Icon size={12} />
      {percentage}% vs {comparedTo}
    </span>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  sublabel,
  trend,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  sublabel?: string;
  trend?: { direction: "up" | "down"; percentage: number; comparedTo: string };
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon ${iconClass}`}>{icon}</div>
      </div>
      <div className="stat-value-row">
        <span className="stat-value">{value.toLocaleString()}</span>
        {sublabel && <span className="stat-sublabel">{sublabel}</span>}
      </div>
      {/* Bottom slot exists in EVERY card so the number row sits at the same
          vertical level across the grid: the trend tag fills it when present,
          and cards without a trend keep the reserved space (no per-card
          margins). */}
      <div className="stat-card-footer">
        {trend && (
          <TrendTag
            direction={trend.direction}
            percentage={trend.percentage}
            comparedTo={trend.comparedTo}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span className={`reports-status-badge ${STATUS_CLASS[status]}`}>
      <span className="status-dot" />
      {status.toUpperCase()}
    </span>
  );
}

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{item.payload.label}</div>
      <div style={{ color: item.payload.color }}>
        {item.value.toLocaleString()} documents
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton sections — mirror the Transaction Registry loading kit   */
/*  (common/Skeleton.tsx): real containers + shimmer bars, so the     */
/*  page keeps its full layout (no jump) while the first fetch runs.  */
/* ------------------------------------------------------------------ */

function ReportsStatsSkeleton() {
  return (
    <div className="stats-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="stat-card stat-card--skeleton">
          <div className="stat-card-top">
            <SkeletonBox width="55%" height="10px" />
            <SkeletonBox width="36px" height="36px" borderRadius="12px" />
          </div>
          <SkeletonBox width="35%" height="26px" />
          <SkeletonBox width="45%" height="10px" />
        </div>
      ))}
    </div>
  );
}

function ReportsChartSkeleton() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <SkeletonBox width="220px" height="16px" />
      </div>
      <div className="reports-chart-skeleton-body">
        <SkeletonBox width="100%" height="220px" borderRadius="8px" />
      </div>
    </div>
  );
}

function ReportsReprintSkeleton() {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <SkeletonBox width="240px" height="16px" />
      </div>
      <div className="reports-chart-skeleton-body">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox
            key={i}
            width={i % 3 === 0 ? "58%" : "76%"}
            height="10px"
            margin="0 0 12px 0"
          />
        ))}
      </div>
    </div>
  );
}

const REPORTS_TABLE_COLUMNS = [
  "Reference No.",
  "Declarant",
  "Date Released",
  "Released / Assisted By",
  "Encoded By",
  "Status",
];

function ReportsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="table-card">
      <div className="table-toolbar">
        <div>
          <SkeletonBox width="160px" height="14px" margin="0 0 6px 0" />
          <SkeletonBox width="90px" height="11px" />
        </div>
        <div className="table-controls">
          <SkeletonBox width="180px" height="34px" borderRadius="8px" />
          <SkeletonBox width="140px" height="34px" borderRadius="8px" />
        </div>
      </div>
      <div className="table-scroll">
        <table className="reports-table">
          <thead>
            <tr>
              {REPORTS_TABLE_COLUMNS.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td><SkeletonBox width="80%" height="12px" /></td>
                <td><SkeletonBox width="70%" height="12px" /></td>
                <td><SkeletonBox width="85%" height="12px" /></td>
                <td><SkeletonBox width="60%" height="12px" /></td>
                <td><SkeletonBox width="65%" height="12px" /></td>
                <td><SkeletonBox width="55%" height="12px" /></td>
                <td><SkeletonBox width="80px" height="22px" borderRadius="999px" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
interface ReportsProps {
  // Breadcrumb navigation — the Dashboard link jumps back to the home
  // view (wired by Dashboard.tsx, like the other pages' onNavigateTo*).
  onNavigateToDashboard?: () => void;
}

export default function Reports({ onNavigateToDashboard }: ReportsProps) {
  const [docTypeFilter, setDocTypeFilter] = useState<DocumentTypeFilterValue>("All");
  const analytics = useReportsAnalytics(docTypeFilter);
  const [period, setPeriod] = useState<Period>("monthly");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("All");

  // FIX: pagination state for the Declarant Records table.
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [isExporting, setIsExporting] = useState(false);

  const filteredDeclarants = useMemo(() => {
    return analytics.declarantRows.filter((d) => {
      const matchesSearch =
        search.trim() === "" ||
        d.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.documentRequested.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All"
          ? true
          : statusFilter === "Reprinted"
            ? d.reprintedDocuments > 0
            : d.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [analytics.declarantRows, search, statusFilter]);

  // FIX: whenever the filtered result set changes (new search term, status
  // filter, or document-type filter), jump back to page 1 — otherwise a
  // user filtering down to fewer results could get stranded on a now
  // out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, docTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDeclarants.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDeclarants.slice(start, start + rowsPerPage);
  }, [filteredDeclarants, currentPage, rowsPerPage]);

  const handleRowsPerPageChange = (value: number) => {
    setRowsPerPage(value);
    setPage(1);
  };

  // ── Export to Excel (xlsx, already a dependency — used dynamically so the
  //    ~420 kB sheet library only loads on first export) ──
  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const headers = [
        "Reference No.",
        "Declarant",
        "Document Requested",
        "Date Released",
        "Released / Assisted By",
        "Encoded By",
        "Status",
        "Reprinted Docs",
      ];
      const aoa: (string | number)[][] = [
        ["ADePT System — Reports & Analytics"],
        [
          `Declarant Records — ${analytics.totalRequestsAll} total requests`,
          `Exported: ${new Date().toLocaleString()}`,
        ],
        [
          `Filter: ${docTypeFilter === "All" ? "All document types" : docTypeFilter}`,
          `Subset: ${filteredDeclarants.length} records`,
        ],
        [],
        headers,
        ...filteredDeclarants.map((d) => [
          d.reference,
          d.declarantName,
          d.documentRequested,
          d.dateReleased,
          d.staffReleased,
          d.encodedBy,
          d.status,
          d.reprintedDocuments,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = headers.map((h, i) => ({
        wch: i === 1 ? 28 : Math.min(Math.max(h.length + 2, 12), 34),
      }));
      XLSX.utils.book_append_sheet(wb, ws, "Declarant Records");

      // Second sheet: per-declarant reprint totals broken down by document
      // type (mirrors the card).
      const reprintAoa: (string | number)[][] = [
        ["Reprinted Documents by Declarant"],
        [`Exported: ${new Date().toLocaleString()}`],
        [],
        ["Declarant", "Document Type", "Reprints"],
        ...analytics.reprintedDocumentsByDeclarant.flatMap((r) =>
          r.documents.length > 0
            ? r.documents.map((d) => [r.declarantName, d.documentType, d.count])
            : [[r.declarantName, "—", r.count]]
        ),
        [],
        ["Total Reprints", "", analytics.reprintedCount],
      ];
      const wsReprints = XLSX.utils.aoa_to_sheet(reprintAoa);
      wsReprints["!cols"] = [{ wch: 30 }, { wch: 30 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsReprints, "Reprinted Documents");

      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `adept-reports-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // FIX: pagination for the Reprinted Documents by Declarant card — the
  // list can grow large (one row per declarant with reprints), so cap the
  // visible rows and page through the rest. Each row's breakdown bars are
  // relative to that declarant's own top document type, so bars stay
  // readable regardless of page size.
  const REPRINTS_PER_PAGE = 8;
  const [reprintsPage, setReprintsPage] = useState(1);

  const reprintTotalPages = Math.max(
    1,
    Math.ceil(analytics.reprintedDocumentsByDeclarant.length / REPRINTS_PER_PAGE)
  );
  const currentReprintPage = Math.min(reprintsPage, reprintTotalPages);

  const reprintPageItems = useMemo(() => {
    const start = (currentReprintPage - 1) * REPRINTS_PER_PAGE;
    return analytics.reprintedDocumentsByDeclarant.slice(start, start + REPRINTS_PER_PAGE);
  }, [analytics.reprintedDocumentsByDeclarant, currentReprintPage]);

  // Numbered page window: "1 … (current ±2) … N" — the total page count can
  // grow large with many declarants, so far pages collapse into ellipses.
  const reprintPageNumbers: (number | "…")[] = [];
  for (let p = 1; p <= reprintTotalPages; p++) {
    if (p === 1 || p === reprintTotalPages || Math.abs(p - currentReprintPage) <= 2) {
      reprintPageNumbers.push(p);
    } else if (reprintPageNumbers[reprintPageNumbers.length - 1] !== "…") {
      reprintPageNumbers.push("…");
    }
  }

  // FIX: when the document-type filter changes the reprint list, return to
  // page 1 so the user isn't stranded on an out-of-range page.
  useEffect(() => {
    setReprintsPage(1);
  }, [docTypeFilter]);

  return (
    <div className="reports-page">
      <div className="reports-container">
        {/* Breadcrumb — uses the page's own .reports-breadcrumb classes
            (ReportsAnalytics.css), which mirror the shared tr-breadcrumb
            styling used by Transaction Registry and Archive Management. */}
        <nav className="reports-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="reports-breadcrumb-item--link"
            onClick={onNavigateToDashboard ?? (() => {})}
          >
            Dashboard
          </button>
          <span className="reports-breadcrumb-sep">&gt;</span>
          <span className="reports-breadcrumb-item--current">Reports &amp; Analytics</span>
        </nav>

        {/* Header — always mounted (same as TransactionRegistry: the page
            shell stays visible while content swaps between skeleton/error/data) */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Reports &amp; Analytics</h1>
            <p className="reports-subtitle">
              Track document requests, releases, pending items, and reprints —{" "}
              {PERIOD_LABEL[period]}
            </p>
          </div>
          <div className="reports-header-actions">
            <button
              className={`tr-refresh-btn${analytics.isRefreshing ? " is-spinning" : ""}`}
              onClick={analytics.refetch}
              title="Refresh reports"
              aria-label="Refresh reports"
            >
              <RefreshCw size={16} />
              <span className="refresh-btn-label">Refresh</span>
            </button>
            <PeriodToggle period={period} onChange={setPeriod} />
          </div>
        </div>

        {analytics.loading ? (
          <>
            <ReportsStatsSkeleton />
            <ReportsReprintSkeleton />
            <ReportsChartSkeleton />
            <ReportsTableSkeleton />
          </>
        ) : analytics.error ? (
          <div
            className="table-card"
            style={{ padding: "48px 32px", textAlign: "center", color: "#B0281C" }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{analytics.error}</p>
            <button className="export-btn" onClick={analytics.refetch}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <StatCard
                icon={<FileText size={18} />}
                iconClass="stat-icon--primary"
                label="Documents Released"
                value={analytics.documentsReleased[period]}
                sublabel={PERIOD_LABEL[period]}
                trend={analytics.documentsReleasedTrend[period]}
              />
              <StatCard
                icon={<FileStack size={18} />}
                iconClass="stat-icon--secondary"
                label="Documents Requested"
                value={analytics.totalRequests[period]}
                sublabel={PERIOD_LABEL[period]}
                trend={analytics.totalRequestsTrend[period]}
              />
              <StatCard
                icon={<ListChecks size={18} />}
                iconClass="stat-icon--truecopy"
                label="Tax Declarations"
                value={analytics.taxDeclarationCounts[period]}
                sublabel={PERIOD_LABEL[period]}
              />
              <StatCard
                icon={<ShieldCheck size={18} />}
                iconClass="stat-icon--pending"
                label="Total Pending"
                value={analytics.pendingCount}
                sublabel="Live queue"
              />
              <StatCard
                icon={<ClipboardList size={18} />}
                iconClass="stat-icon--success"
                label="Total Requests"
                value={analytics.totalRequestsAll}
                sublabel="All time"
              />
            </div>

            {/* Reprinted Documents by Declarant — per-declarant reprint
                totals (summed across all of a declarant's transactions)
                so the head can track total issuance. Each row breaks the
                reprints down by document type (color-coded bars). The
                grand total in the header comes from the same
                reprintCounts. */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Reprinted Documents by Declarant</h2>
                <span className="chart-period">
                  {analytics.reprintedCount.toLocaleString()} total reprint
                  {analytics.reprintedCount === 1 ? "" : "s"}
                </span>
              </div>
              {analytics.reprintedDocumentsByDeclarant.length === 0 ? (
                <p className="reprints-empty">No reprinted documents recorded.</p>
              ) : (
                <>
                  <div className="reprints-list">
                    {reprintPageItems.map((r) => {
                      const maxDoc = Math.max(
                        ...r.documents.map((d) => d.count),
                        1
                      );
                      return (
                        <div key={r.declarantName} className="reprints-row">
                          <div className="reprints-head">
                            <span className="reprints-avatar" aria-hidden="true">
                              {initialsOf(r.declarantName)}
                            </span>
                            <span className="reprints-name" title={r.declarantName}>
                              {r.declarantName}
                            </span>
                            <span className="reprints-total" title="Total reprinted documents">
                              {r.count.toLocaleString()}
                              <span className="reprints-total-label">
                                reprint{r.count === 1 ? "" : "s"}
                              </span>
                            </span>
                          </div>
                          {r.documents.length > 0 && (
                            <div className="reprints-docs">
                              {r.documents.map((doc) => {
                                const pill = getDocPillMeta(doc.documentType);
                                const fillClass =
                                  REPRINT_FILL_CLASS[pill.className] ??
                                  "reprints-bar-fill--generic";
                                return (
                                  <div key={doc.documentType} className="reprints-doc">
                                    <div className="reprints-doc-top">
                                      <span
                                        className={`reprints-doc-pill ${pill.className}`}
                                        title={doc.documentType}
                                      >
                                        <pill.Icon />
                                        {doc.documentType}
                                      </span>
                                      <span className="reprints-doc-count">
                                        ×{doc.count.toLocaleString()}
                                      </span>
                                    </div>
                                    <span className="reprints-bar-track">
                                      <span
                                        className={`reprints-bar-fill ${fillClass}`}
                                        style={{
                                          width: `${Math.round(
                                            (doc.count / maxDoc) * 100
                                          )}%`,
                                        }}
                                      />
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {analytics.reprintedDocumentsByDeclarant.length > REPRINTS_PER_PAGE && (
                    <div className="reprints-pagination">
                      <button
                        type="button"
                        className="reprints-page-btn"
                        disabled={currentReprintPage <= 1}
                        onClick={() => setReprintsPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                        title="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {reprintPageNumbers.map((p, i) =>
                        p === "…" ? (
                          <span key={`ellipsis-${i}`} className="reprints-page-ellipsis">
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`reprints-page-btn${p === currentReprintPage ? " active" : ""}`}
                            onClick={() => setReprintsPage(p)}
                            aria-label={`Page ${p}`}
                            aria-current={p === currentReprintPage ? "page" : undefined}
                          >
                            {p}
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        className="reprints-page-btn"
                        disabled={currentReprintPage >= reprintTotalPages}
                        onClick={() =>
                          setReprintsPage((p) => Math.min(reprintTotalPages, p + 1))
                        }
                        aria-label="Next page"
                        title="Next page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h2 className="chart-title">Document Status Distribution</h2>
              </div>
              <div className="chart-canvas">
                <ResponsiveContainer>
                  <BarChart data={analytics.statusChart} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                    <CartesianGrid vertical={false} stroke="rgba(41,35,122,0.08)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#8b8fa3" }}
                      axisLine={{ stroke: "rgba(41,35,122,0.12)" }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#8b8fa3" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(41,35,122,0.04)" }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                      {analytics.statusChart.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-legend">
                {analytics.statusChart.map((r) => (
                  <div key={r.label} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: r.color }} />
                    {r.label}
                    <span className="legend-value">{r.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="table-card">
              <div className="table-toolbar">
                <div>
                  <h2 className="table-title">Declarant Records</h2>
                  <p className="table-count">
                    {filteredDeclarants.length} record
                    {filteredDeclarants.length !== 1 ? "s" : ""} found
                  </p>
                </div>
                <div className="table-controls">
                  <button
                    type="button"
                    className="export-btn"
                    onClick={handleExportExcel}
                    disabled={isExporting || filteredDeclarants.length === 0}
                    title={
                      filteredDeclarants.length === 0
                        ? "No records to export"
                        : "Download Declarant Records as Excel"
                    }
                  >
                    {isExporting ? (
                      <RefreshCw size={14} className="is-spinning" />
                    ) : (
                      <Download size={14} />
                    )}
                    {isExporting ? "Exporting…" : "Export Excel"}
                  </button>
                  <div className="search-field">
                    <Search size={16} className="search-icon" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search records..."
                      className="search-input"
                    />
                  </div>
                  <ADePTSelect
                    ariaLabel="Filter by status"
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilterValue)}
                    options={[
                      { value: "All", label: "All Statuses" },
                      ...STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
                      { value: "Reprinted", label: "Reprinted" },
                    ]}
                  />

                  <DocumentTypeFilter value={docTypeFilter} onChange={setDocTypeFilter} />
                </div>
              </div>

              <div className="table-scroll">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Declarant</th>
                      <th>Date Released</th>
                      <th>Released / Assisted By</th>
                      <th>Encoded By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((d, idx) => {
                      const pill = getDocPillMeta(d.documentRequested.split(", ")[0]);
                      return (
                        <tr key={d.reference} className={idx % 2 !== 0 ? "row-alt" : ""}>
                          <td className="tr-ref">
                            <span className={`tr-doc-pill ${pill.className}`} title={d.reference}>
                              <pill.Icon />
                              {d.reference}
                            </span>
                          </td>
                          <td className="cell-name">
                            <ExpandableText text={d.declarantName} />
                          </td>
                          <td className="cell-muted">{d.dateReleased}</td>
                          <td className="cell-muted">{d.staffReleased}</td>
                          <td className="cell-muted">{d.encodedBy}</td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDeclarants.length === 0 && (
                      <tr className="empty-row">
                        <td colSpan={6}>No records match your search or filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FIX: pagination controls for Declarant Records, mirroring
                TransactionTable.tsx's .tr-pagination layout/behavior. Hidden
                when there are no matching records so the empty-state message
                in the table isn't crowded by a redundant "0 of 0" bar. */}
            {filteredDeclarants.length > 0 && (
              <div className="reports-pagination">
                <div className="reports-pagination-rows">
                  <span>Rows per page:</span>
                  <ADePTSelect
                    variant="sm"
                    ariaLabel="Rows per page"
                    value={String(rowsPerPage)}
                    onChange={(v) => handleRowsPerPageChange(Number(v))}
                    options={ROWS_PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </div>

                <span className="reports-pagination-label">
                  {`${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filteredDeclarants.length)} of ${filteredDeclarants.length}`}
                </span>

                <div className="reports-pagination-controls">
                  <button
                    type="button"
                    className="reports-pagination-btn"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="reports-pagination-label">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="reports-pagination-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
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