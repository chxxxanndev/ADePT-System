import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import "../styles/ReportsAnalytics.css";
import {
  documentsReleased,
  totalRequests,
  documentsReleasedTrend,
  totalRequestsTrend,
  documentTypeBreakdown,
  processingQueue,
  transactionManagement,
  declarantRecords,
} from "../data/reportsMockData";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

/**
 * Normalized status taxonomy: every raw status coming out of
 * reportsMockData gets bucketed into exactly one of these 5.
 */
const STATUS_ORDER = ["RELEASED", "ARCHIVED", "VOIDED", "AMENDED", "REPRINTED"] as const;
type NormalizedStatus = (typeof STATUS_ORDER)[number];

const STATUS_CLASS: Record<NormalizedStatus, string> = {
  RELEASED: "status-badge--released",
  ARCHIVED: "status-badge--archived",
  VOIDED: "status-badge--voided",
  AMENDED: "status-badge--pending-payment", // reusing orange theme
  REPRINTED: "status-badge--pending-verification", // reusing purple theme
};

const STATUS_CHART_COLOR: Record<NormalizedStatus, string> = {
  RELEASED: "#4f46e5",
  ARCHIVED: "#64748b",
  VOIDED: "#ef4444",
  AMENDED: "#f59e0b",
  REPRINTED: "#06b6d4",
};

/**
 * Maps a raw status string (whatever shape it comes in as from
 * reportsMockData) onto the 5 normalized buckets above.
 */
function normalizeStatus(raw: string): NormalizedStatus {
  const s = raw.toUpperCase();
  if (s.includes("RELEASED")) return "RELEASED";
  if (s.includes("ARCHIVE") || s.includes("FLAGGED")) return "ARCHIVED";
  if (s.includes("VOID")) return "VOIDED";
  if (s.includes("PAYMENT") || s.includes("AMEND")) return "AMENDED";
  if (s.includes("VERIFICATION") || s.includes("REPRINT")) return "REPRINTED";
  return "RELEASED";
}

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

function StatusBadge({ status }: { status: NormalizedStatus }) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status]}`}>
      <span className="status-dot" />
      {status}
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
export default function Reports() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NormalizedStatus | "All">("All");

  const taxDeclaration = documentTypeBreakdown.find((d) => d.id === "tax-declaration")!;
  const pendingPayment = processingQueue.find((p) => p.id === "pending-payment")!;
  const pendingVerification = processingQueue.find((p) => p.id === "pending-verification")!;

  const mockEncoders = ["Ana Marquez", "Dennis Cruz", "John Cruz", "Maria Lopez"];

  const filteredDeclarants = useMemo(() => {
    return declarantRecords.filter((d) => {
      const normalized = normalizeStatus(d.status);
      const matchesSearch =
        search.trim() === "" ||
        d.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.documentRequested.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || normalized === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const filteredChartData = useMemo(() => {
    const bins: Record<NormalizedStatus, { count: number; color: string }> = {
      RELEASED: { count: 0, color: STATUS_CHART_COLOR.RELEASED },
      ARCHIVED: { count: 0, color: STATUS_CHART_COLOR.ARCHIVED },
      VOIDED: { count: 0, color: STATUS_CHART_COLOR.VOIDED },
      AMENDED: { count: 0, color: STATUS_CHART_COLOR.AMENDED },
      REPRINTED: { count: 0, color: STATUS_CHART_COLOR.REPRINTED },
    };

    transactionManagement.forEach((item) => {
      const normalized = normalizeStatus(item.label);
      bins[normalized].count += item.count;
    });

    return STATUS_ORDER.map((label, idx) => ({
      id: idx,
      label,
      count: bins[label].count,
      color: bins[label].color,
    }));
  }, []);

  return (
    <div className="reports-page">
      <div className="reports-container">
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
            value={documentsReleased[period]}
            sublabel={PERIOD_LABEL[period]}
            trend={documentsReleasedTrend}
          />
          <StatCard
            icon={<FileStack size={18} />}
            iconClass="stat-icon--secondary"
            label="Documents Requested"
            value={totalRequests[period]}
            sublabel={PERIOD_LABEL[period]}
            trend={totalRequestsTrend}
          />
          <StatCard
            icon={<ListChecks size={18} />}
            iconClass="stat-icon--truecopy"
            label="Tax Declarations"
            value={taxDeclaration[period]}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<ShieldCheck size={18} />}
            iconClass="stat-icon--pending"
            label="Total Pending"
            value={pendingPayment.count + pendingVerification.count}
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
              <BarChart data={filteredChartData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
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
                  {filteredChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {filteredChartData.map((r) => (
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
                  onChange={(e) => setStatusFilter(e.target.value as NormalizedStatus | "All")}
                  className="filter-select"
                >
                  <option value="All">All Statuses</option>
                  {STATUS_ORDER.map((s) => (
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
                {filteredDeclarants.map((d, idx) => (
                  <tr key={d.reference} className={idx % 2 !== 0 ? "row-alt" : ""}>
                    <td className="cell-reference">#{d.reference}</td>
                    <td className="cell-name">{d.declarantName}</td>
                    <td>{d.documentRequested}</td>
                    <td className="cell-muted">{d.dateReleased}</td>
                    <td className="cell-muted">{d.staffReleased}</td>
                    <td className="cell-muted">
                      {d.encodedBy || mockEncoders[idx % mockEncoders.length]}
                    </td>
                    <td>
                      <StatusBadge status={normalizeStatus(d.status)} />
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
      </div>
    </div>
  );
}