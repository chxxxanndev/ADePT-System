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
  Download,
  ListChecks,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import "../styles/ReportsAnalytics.css";
import { useReportsAnalytics } from "../hooks/useReportsAnalytics";
import type { DeclarantRecord } from "../data/reportsMockData";
import { ExpandableText } from '../components/common/ExpandableText';

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
      {trend && (
        <TrendTag
          direction={trend.direction}
          percentage={trend.percentage}
          comparedTo={trend.comparedTo}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DeclarantStatus }) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status]}`}>
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
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
interface ReportsProps {
  onNavigateToDashboard?: () => void;
}

export default function Reports({ onNavigateToDashboard }: ReportsProps) {
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

  if (analytics.loading) {
    return (
      <div className="reports-page">
        <div className="reports-container">
          <nav className="reports-breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              className="reports-breadcrumb-item--link"
              onClick={onNavigateToDashboard}
            >
              Dashboard
            </button>
            <span className="reports-breadcrumb-sep">&gt;</span>
            <span className="reports-breadcrumb-item--current">Reports &amp; Analytics</span>
          </nav>
          <div
            className="table-card"
            style={{ padding: "64px 32px", textAlign: "center", color: "#8b8fa3" }}
          >
            <Loader2 size={22} className="arc-spinner" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: 12 }}>Loading reports…</p>
          </div>
        </div>
      </div>
    );
  }

  if (analytics.error) {
    return (
      <div className="reports-page">
        <div className="reports-container">
          <nav className="reports-breadcrumb" aria-label="Breadcrumb">
            <button
              type="button"
              className="reports-breadcrumb-item--link"
              onClick={onNavigateToDashboard}
            >
              Dashboard
            </button>
            <span className="reports-breadcrumb-sep">&gt;</span>
            <span className="reports-breadcrumb-item--current">Reports &amp; Analytics</span>
          </nav>
          <div
            className="table-card"
            style={{ padding: "48px 32px", textAlign: "center", color: "#B0281C" }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{analytics.error}</p>
            <button className="export-btn" onClick={analytics.refetch}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-container">
        {/* Breadcrumb — Dashboard > Reports & Analytics */}
        <nav className="reports-breadcrumb" aria-label="Breadcrumb">
          <button
            type="button"
            className="reports-breadcrumb-item--link"
            onClick={onNavigateToDashboard}
          >
            Dashboard
          </button>
          <span className="reports-breadcrumb-sep">&gt;</span>
          <span className="reports-breadcrumb-item--current">Reports &amp; Analytics</span>
        </nav>

        {/* Header */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Reports &amp; Analytics</h1>
            <p className="reports-subtitle">
              Document registry activity — {PERIOD_LABEL[period]}
            </p>
          </div>
          <div className="reports-header-actions">
            <PeriodToggle period={period} onChange={setPeriod} />
            <button className="export-btn">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

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
                {pageItems.map((d, idx) => (
                  <tr key={d.reference} className={idx % 2 !== 0 ? "row-alt" : ""}>
                    <td className="cell-reference">#{d.reference}</td>
                    <td className="cell-name"><ExpandableText text={d.declarantName} /></td>
                    <td>{d.documentRequested}</td>
                    <td className="cell-muted">{d.dateReleased}</td>
                    <td className="cell-muted">{d.staffReleased}</td>
                    <td className="cell-muted">{d.encodedBy}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
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
      </div>
    </div>
  );
}