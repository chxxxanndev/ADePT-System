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
  ChevronDown,
  ListChecks,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import "../styles/ReportsAnalytics.css";
import { useReportsAnalytics } from "../hooks/useReportsAnalytics";
import { getDocPillMeta } from "../../utils/documentType";
import { SkeletonBox } from "../components/common/Skeleton";
import type { DeclarantRecord } from "../data/reportsMockData";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

/** The 5 statuses a declarant row can carry — mirrors the mapping done in useReportsAnalytics. */
type DeclarantStatus = DeclarantRecord["status"];
const STATUS_OPTIONS: DeclarantStatus[] = [
  "Released",
  "Pending Payment",
  "Pending Verification",
  "Voided",
  "Archived",
  "Flagged",
];

const STATUS_CLASS: Record<DeclarantStatus, string> = {
  Released: "status-badge--released",
  Archived: "status-badge--archived",
  Voided: "status-badge--voided",
  "Pending Payment": "status-badge--pending-payment",
  "Pending Verification": "status-badge--pending-verification",
   Flagged: "status-badge--flagged",
};

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

function StatusBadge({ status }: { status: DeclarantStatus }) {
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
      {Array.from({ length: 4 }).map((_, i) => (
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

const REPORTS_TABLE_COLUMNS = [
  "Reference No.",
  "Declarant",
  "Document Requested",
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
export default function Reports() {
  const analytics = useReportsAnalytics();
  const [period, setPeriod] = useState<Period>("monthly");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeclarantStatus | "All">("All");

  // FIX: pagination state for the Declarant Records table.
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const filteredDeclarants = useMemo(() => {
    return analytics.declarantRows.filter((d) => {
      const matchesSearch =
        search.trim() === "" ||
        d.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.documentRequested.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || d.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [analytics.declarantRows, search, statusFilter]);

  // FIX: whenever the filtered result set changes (new search term or
  // status filter), jump back to page 1 — otherwise a user filtering down
  // to fewer results could get stranded on a now out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

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

  return (
    <div className="reports-page">
      <div className="reports-container">
        {/* Header — always mounted (same as TransactionRegistry: the page
            shell stays visible while content swaps between skeleton/error/data) */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Reports &amp; Analytics</h1>
            <p className="reports-subtitle">
              Document registry activity — {PERIOD_LABEL[period]}
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
            </button>
            <PeriodToggle period={period} onChange={setPeriod} />
          </div>
        </div>

        {analytics.loading ? (
          <>
            <ReportsStatsSkeleton />
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
                  <div className="search-field">
                    <Search size={16} className="search-icon" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search records..."
                      className="search-input"
                    />
                  </div>
                  <div className="filter-field">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as DeclarantStatus | "All")}
                      className="filter-select"
                    >
                      <option value="All">All Statuses</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="filter-chevron" />
                  </div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Declarant</th>
                      <th>Document Requested</th>
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
                          <td className="cell-name">{d.declarantName}</td>
                          <td>{d.documentRequested}</td>
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
                        <td colSpan={7}>No records match your search or filter.</td>
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
                  <select
                    value={rowsPerPage}
                    onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                  >
                    {ROWS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
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