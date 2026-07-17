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
  MapPin,
  MapPinOff,
  Clock3,
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
  type DeclarantStatus,
} from "../data/reportsMockData";

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
};

const STATUS_CLASS: Record<DeclarantStatus, string> = {
  Released: "status-badge--released",
  "Pending Payment": "status-badge--pending-payment",
  "Pending Verification": "status-badge--pending-verification",
  Voided: "status-badge--voided",
  Flagged: "status-badge--flagged",
  Archived: "status-badge--archived",
};

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
  const [statusFilter, setStatusFilter] = useState<"All" | DeclarantStatus>("All");

  const taxDeclaration = documentTypeBreakdown.find((d) => d.id === "tax-declaration")!;
  const landHolding = documentTypeBreakdown.find((d) => d.id === "land-holding")!;
  const noLandHolding = documentTypeBreakdown.find((d) => d.id === "no-land-holding")!;

  const pendingPayment = processingQueue.find((p) => p.id === "pending-payment")!;
  const pendingVerification = processingQueue.find((p) => p.id === "pending-verification")!;

  const filteredDeclarants = useMemo(() => {
    return declarantRecords.filter((d) => {
      const matchesSearch =
        search.trim() === "" ||
        d.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.documentRequested.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div className="reports-page">
      <div className="reports-container">
        {/* Header */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Reports &amp; Analytics</h1>
            <p className="reports-subtitle">
              Document releases, requests, and registry activity —{" "}
              {PERIOD_LABEL[period]}
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

        {/* Documents released / requested / tax declarations / pending total */}
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
            label="Pending Payment + Verification"
            value={pendingPayment.count + pendingVerification.count}
            sublabel="Live queue"
          />
        </div>

        {/* Landholding / no-landholding / pending breakdown */}
        <div className="stats-grid">
          <StatCard
            icon={<MapPin size={18} />}
            iconClass="stat-icon--success"
            label="Landholding Released"
            value={landHolding[period]}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<MapPinOff size={18} />}
            iconClass="stat-icon--secondary"
            label="No-Landholding Released"
            value={noLandHolding[period]}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<Clock3 size={18} />}
            iconClass="stat-icon--pending"
            label="Pending Payment"
            value={pendingPayment.count}
            sublabel="Live queue"
          />
          <StatCard
            icon={<Clock3 size={18} />}
            iconClass="stat-icon--pending"
            label="Pending Verification"
            value={pendingVerification.count}
            sublabel="Live queue"
          />
        </div>

        {/* Transaction management chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">Transaction &amp; Document Status Overview</h2>
          </div>
          <p className="chart-description">
            Transaction registry, certified true copies, void &amp; amended, and
            archived / flagged documents
          </p>
          <div className="chart-canvas">
            <ResponsiveContainer>
              <BarChart
                data={transactionManagement}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(41,35,122,0.08)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8b8fa3" }}
                  axisLine={{ stroke: "rgba(41,35,122,0.12)" }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8b8fa3" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "rgba(41,35,122,0.04)" }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {transactionManagement.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {transactionManagement.map((r) => (
              <div key={r.id} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: r.color }} />
                {r.label}
                <span className="legend-value">{r.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Declarants table */}
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
                  placeholder="Search name, reference, document..."
                  className="search-input"
                />
              </div>
              <div className="filter-field">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "All" | DeclarantStatus)
                  }
                  className="filter-select"
                >
                  <option>All</option>
                  <option>Released</option>
                  <option>Pending Payment</option>
                  <option>Pending Verification</option>
                  <option>Voided</option>
                  <option>Flagged</option>
                  <option>Archived</option>
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
                    <td>
                      <div className="declarant-cell">
                        <div className="avatar" style={{ backgroundColor: d.avatarColor }}>
                          {d.initials}
                        </div>
                        <span>{d.declarantName}</span>
                      </div>
                    </td>
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
      </div>
    </div>
  );
}