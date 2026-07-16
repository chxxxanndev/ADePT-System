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
} from "lucide-react";
import "../styles/ReportsAnalytics.css";

/* ------------------------------------------------------------------ */
/*  Chart fill colors — SVG fill can't read CSS custom properties,     */
/*  so recharts needs literal hex values. Keep in sync with the        */
/*  --color-* tokens defined in ReportsAnalytics.css.                  */
/* ------------------------------------------------------------------ */
const CHART_FILL = {
  secondary: "#00bcd4",
  truecopy: "#1976d2",
  error: "#d32f2f",
  flagged: "#ef6c6c",
  archived: "#607d8b",
};

type Period = "daily" | "weekly" | "monthly";

/* ------------------------------------------------------------------ */
/*  Mock data — replace with live data from services/                  */
/* ------------------------------------------------------------------ */
const SUMMARY: Record<
  Period,
  {
    released: number;
    requested: number;
    taxDeclarations: number;
    landholding: number;
    noLandholding: number;
    pendingPayment: number;
    pendingVerification: number;
  }
> = {
  daily: {
    released: 42,
    requested: 58,
    taxDeclarations: 15,
    landholding: 20,
    noLandholding: 22,
    pendingPayment: 12,
    pendingVerification: 8,
  },
  weekly: {
    released: 261,
    requested: 340,
    taxDeclarations: 96,
    landholding: 128,
    noLandholding: 133,
    pendingPayment: 64,
    pendingVerification: 41,
  },
  monthly: {
    released: 1084,
    requested: 1392,
    taxDeclarations: 402,
    landholding: 540,
    noLandholding: 544,
    pendingPayment: 219,
    pendingVerification: 157,
  },
};

const REGISTRY_STATUS: Record<
  Period,
  { name: string; value: number; color: string }[]
> = {
  daily: [
    { name: "Transaction Registry", value: 58, color: CHART_FILL.secondary },
    { name: "True Copies", value: 34, color: CHART_FILL.truecopy },
    { name: "Void & Amended", value: 6, color: CHART_FILL.error },
    { name: "Flagged", value: 4, color: CHART_FILL.flagged },
    { name: "Archived", value: 11, color: CHART_FILL.archived },
  ],
  weekly: [
    { name: "Transaction Registry", value: 340, color: CHART_FILL.secondary },
    { name: "True Copies", value: 198, color: CHART_FILL.truecopy },
    { name: "Void & Amended", value: 27, color: CHART_FILL.error },
    { name: "Flagged", value: 19, color: CHART_FILL.flagged },
    { name: "Archived", value: 63, color: CHART_FILL.archived },
  ],
  monthly: [
    { name: "Transaction Registry", value: 1392, color: CHART_FILL.secondary },
    { name: "True Copies", value: 812, color: CHART_FILL.truecopy },
    { name: "Void & Amended", value: 104, color: CHART_FILL.error },
    { name: "Flagged", value: 77, color: CHART_FILL.flagged },
    { name: "Archived", value: 258, color: CHART_FILL.archived },
  ],
};

type DocStatus =
  | "Released"
  | "Pending Payment"
  | "Pending Verification"
  | "Voided"
  | "Flagged"
  | "Archived";

interface Declarant {
  reference: string;
  name: string;
  initials: string;
  avatarColor: string;
  document: string;
  dateReleased: string;
  staffReleased: string;
  encodedBy: string;
  status: DocStatus;
}

const DECLARANTS: Declarant[] = [
  {
    reference: "TD-2026-04831",
    name: "Leah Todd",
    initials: "LT",
    avatarColor: "#7c6fe8",
    document: "Tax Declaration",
    dateReleased: "10 Jul 2026 · 11:21 AM",
    staffReleased: "Martin Philips",
    encodedBy: "Ana Marquez",
    status: "Released",
  },
  {
    reference: "CTC-2026-02342",
    name: "Allen Hanson",
    initials: "AH",
    avatarColor: "#3fb6c7",
    document: "Certified True Copy",
    dateReleased: "—",
    staffReleased: "—",
    encodedBy: "Ana Marquez",
    status: "Pending Payment",
  },
  {
    reference: "LH-2026-04791",
    name: "Harriett Johnson",
    initials: "HJ",
    avatarColor: "#e88c4e",
    document: "Landholding Certificate",
    dateReleased: "26 Jun 2026 · 04:49 PM",
    staffReleased: "Josie Ramos",
    encodedBy: "Dennis Cruz",
    status: "Released",
  },
  {
    reference: "TD-2026-09437",
    name: "Oscar Sullivan",
    initials: "OS",
    avatarColor: "#5e7ce2",
    document: "Tax Declaration",
    dateReleased: "—",
    staffReleased: "—",
    encodedBy: "Dennis Cruz",
    status: "Pending Verification",
  },
  {
    reference: "NLH-2026-05553",
    name: "Victor Wilkins",
    initials: "VW",
    avatarColor: "#4ea8de",
    document: "No-Landholding Certificate",
    dateReleased: "11 Jun 2026 · 10:39 AM",
    staffReleased: "Martin Philips",
    encodedBy: "Ana Marquez",
    status: "Released",
  },
  {
    reference: "CTC-2026-05155",
    name: "Minerva Duncan",
    initials: "MD",
    avatarColor: "#9b7fe0",
    document: "Certified True Copy",
    dateReleased: "23 May 2026 · 12:18 AM",
    staffReleased: "Josie Ramos",
    encodedBy: "Dennis Cruz",
    status: "Voided",
  },
  {
    reference: "LH-2026-09725",
    name: "Tom Hanson",
    initials: "TH",
    avatarColor: "#63a375",
    document: "Landholding Certificate",
    dateReleased: "17 May 2026 · 02:29 PM",
    staffReleased: "Martin Philips",
    encodedBy: "Ana Marquez",
    status: "Released",
  },
  {
    reference: "TD-2026-08169",
    name: "Sadie Blair",
    initials: "SB",
    avatarColor: "#e2698a",
    document: "Tax Declaration",
    dateReleased: "—",
    staffReleased: "—",
    encodedBy: "Josie Ramos",
    status: "Flagged",
  },
  {
    reference: "NLH-2026-00423",
    name: "Sophia Rodriguez",
    initials: "SR",
    avatarColor: "#e8a94e",
    document: "No-Landholding Certificate",
    dateReleased: "01 Apr 2026 · 05:50 PM",
    staffReleased: "Dennis Cruz",
    encodedBy: "Ana Marquez",
    status: "Archived",
  },
  {
    reference: "CTC-2026-06657",
    name: "Stanley Moore",
    initials: "SM",
    avatarColor: "#5eb6a8",
    document: "Certified True Copy",
    dateReleased: "12 Apr 2026 · 07:32 AM",
    staffReleased: "Josie Ramos",
    encodedBy: "Dennis Cruz",
    status: "Released",
  },
];

const STATUS_CLASS: Record<DocStatus, string> = {
  Released: "status-badge--released",
  "Pending Payment": "status-badge--pending-payment",
  "Pending Verification": "status-badge--pending-verification",
  Voided: "status-badge--voided",
  Flagged: "status-badge--flagged",
  Archived: "status-badge--archived",
};

const PERIOD_LABEL: Record<Period, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
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

function StatCard({
  icon,
  iconClass,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: number;
  sublabel?: string;
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
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
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
      <div className="chart-tooltip-label">{item.payload.name}</div>
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
  const [statusFilter, setStatusFilter] = useState<"All" | DocStatus>("All");

  const summary = SUMMARY[period];
  const registryData = REGISTRY_STATUS[period];

  const filteredDeclarants = useMemo(() => {
    return DECLARANTS.filter((d) => {
      const matchesSearch =
        search.trim() === "" ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase()) ||
        d.document.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "All" || d.status === statusFilter;
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

        {/* Documents released / requested / declarations */}
        <div className="stats-grid">
          <StatCard
            icon={<FileText size={18} />}
            iconClass="stat-icon--primary"
            label="Documents Released"
            value={summary.released}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<FileStack size={18} />}
            iconClass="stat-icon--secondary"
            label="Documents Requested"
            value={summary.requested}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<ListChecks size={18} />}
            iconClass="stat-icon--truecopy"
            label="Tax Declarations"
            value={summary.taxDeclarations}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<ShieldCheck size={18} />}
            iconClass="stat-icon--pending"
            label="Pending Payment + Verification"
            value={summary.pendingPayment + summary.pendingVerification}
            sublabel={PERIOD_LABEL[period]}
          />
        </div>

        {/* Landholding / no-landholding / pending breakdown */}
        <div className="stats-grid">
          <StatCard
            icon={<MapPin size={18} />}
            iconClass="stat-icon--success"
            label="Landholding Released"
            value={summary.landholding}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<MapPinOff size={18} />}
            iconClass="stat-icon--secondary"
            label="No-Landholding Released"
            value={summary.noLandholding}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<Clock3 size={18} />}
            iconClass="stat-icon--pending"
            label="Pending Payment"
            value={summary.pendingPayment}
            sublabel={PERIOD_LABEL[period]}
          />
          <StatCard
            icon={<Clock3 size={18} />}
            iconClass="stat-icon--pending"
            label="Pending Verification"
            value={summary.pendingVerification}
            sublabel={PERIOD_LABEL[period]}
          />
        </div>

        {/* Registry status chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h2 className="chart-title">
              Registry &amp; Document Status Overview
            </h2>
            <span className="chart-period">{PERIOD_LABEL[period]}</span>
          </div>
          <p className="chart-description">
            Transaction registry, true copies, void &amp; amended, flagged,
            and archived documents
          </p>
          <div className="chart-canvas">
            <ResponsiveContainer>
              <BarChart
                data={registryData}
                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
              >
                <CartesianGrid vertical={false} stroke="rgba(41,35,122,0.08)" />
                <XAxis
                  dataKey="name"
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
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {registryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {registryData.map((r) => (
              <div key={r.name} className="legend-item">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: r.color }}
                />
                {r.name}
                <span className="legend-value">
                  {r.value.toLocaleString()}
                </span>
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
                    setStatusFilter(e.target.value as "All" | DocStatus)
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
                        <div
                          className="avatar"
                          style={{ backgroundColor: d.avatarColor }}
                        >
                          {d.initials}
                        </div>
                        <span>{d.name}</span>
                      </div>
                    </td>
                    <td>{d.document}</td>
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
                    <td colSpan={7}>
                      No records match your search or filter.
                    </td>
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