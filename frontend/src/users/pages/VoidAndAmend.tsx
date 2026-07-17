import { useMemo, useState } from "react";
import { Search, ChevronDown, Ban, PencilLine } from "lucide-react";
import "../styles/VoidAndAmend.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type ActionType = "void" | "amended";

interface VoidAmendRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: string;
  actionType: ActionType;
  detail: string; // reason for void, or description of what changed for amended
  actionedBy: string;
  date: string; // 'Today', 'Yesterday', or explicit date label
  time: string; // '9:10 AM'
}

type ActionFilter = "All actions" | "Void" | "Amended";
type TimeRange = "Today" | "This Week" | "This Month" | "All Time";

/* ------------------------------------------------------------------ */
/*  Mock data — inlined here for now.                                  */
/*  TODO: replace with real data from a useVoidAndAmend hook / API     */
/*  once a backend endpoint exists (e.g. GET /api/void-amend?range=…). */
/* ------------------------------------------------------------------ */
const records: VoidAmendRecord[] = [
  {
    id: "va-001",
    reference: "TD-2026-04831",
    declarantName: "Leah Todd",
    documentType: "Tax Declaration",
    actionType: "void",
    detail: "Duplicate filing under the same reference period",
    actionedBy: "Vicente Desoy",
    date: "Today",
    time: "9:10 AM",
  },
  {
    id: "va-002",
    reference: "LH-2026-04791",
    declarantName: "Harriett Johnson",
    documentType: "Certificate of Land Holding",
    actionType: "amended",
    detail: "Corrected property boundary description",
    actionedBy: "John Cruz",
    date: "Today",
    time: "8:45 AM",
  },
  {
    id: "va-003",
    reference: "CTC-2026-02342",
    declarantName: "Allen Hanson",
    documentType: "Certified True Copy",
    actionType: "void",
    detail: "Declarant withdrew request before release",
    actionedBy: "Maria Lopez",
    date: "Yesterday",
    time: "4:30 PM",
  },
  {
    id: "va-004",
    reference: "NLH-2026-00423",
    declarantName: "Sophia Rodriguez",
    documentType: "No-Landholding Certificate",
    actionType: "amended",
    detail: "Updated declarant civil status on record",
    actionedBy: "Dennis Cruz",
    date: "Yesterday",
    time: "2:05 PM",
  },
  {
    id: "va-005",
    reference: "TD-2026-09437",
    declarantName: "Oscar Sullivan",
    documentType: "Tax Declaration",
    actionType: "void",
    detail: "Incorrect declarant name entered at encoding",
    actionedBy: "Ana Marquez",
    date: "Yesterday",
    time: "11:20 AM",
  },
  {
    id: "va-006",
    reference: "LH-2026-09725",
    declarantName: "Tom Hanson",
    documentType: "Certificate of Land Holding",
    actionType: "amended",
    detail: "Corrected total assessed land area",
    actionedBy: "Vicente Desoy",
    date: "This Week",
    time: "3:15 PM",
  },
  {
    id: "va-007",
    reference: "CTC-2026-05155",
    declarantName: "Minerva Duncan",
    documentType: "Certified True Copy",
    actionType: "void",
    detail: "Payment reversed, request cancelled",
    actionedBy: "Maria Lopez",
    date: "This Week",
    time: "10:02 AM",
  },
  {
    id: "va-008",
    reference: "NLH-2026-05553",
    declarantName: "Victor Wilkins",
    documentType: "No-Landholding Certificate",
    actionType: "amended",
    detail: "Updated property location details",
    actionedBy: "John Cruz",
    date: "This Week",
    time: "9:40 AM",
  },
];

const ACTION_FILTER_TO_TYPE: Record<ActionFilter, ActionType | null> = {
  "All actions": null,
  Void: "void",
  Amended: "amended",
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function ActionBadge({ actionType }: { actionType: ActionType }) {
  const isVoid = actionType === "void";
  return (
    <span className={`va-badge ${isVoid ? "va-badge--void" : "va-badge--amended"}`}>
      {isVoid ? <Ban size={14} /> : <PencilLine size={14} />}
      {isVoid ? "Void" : "Amended"}
    </span>
  );
}

function VoidAmendRow({ record }: { record: VoidAmendRecord }) {
  const isVoid = record.actionType === "void";
  return (
    <div className="va-row">
      <ActionBadge actionType={record.actionType} />
      <div className="va-row-body">
        <p className="va-row-title">
          <span className="va-row-reference">{record.reference}</span> — {record.declarantName},{" "}
          {record.documentType}
        </p>
        <p className="va-row-detail">
          {isVoid ? "Reason: " : "Change: "}
          {record.detail}
        </p>
        <p className="va-row-meta">
          Actioned by {record.actionedBy} · {record.date}, {record.time}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function VoidAndAmend() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("All actions");
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time");

  const filteredRecords = useMemo(() => {
    const typeFilter = ACTION_FILTER_TO_TYPE[actionFilter];
    return records.filter((record) => {
      const matchesType = typeFilter === null || record.actionType === typeFilter;
      const matchesSearch =
        search.trim() === "" ||
        record.reference.toLowerCase().includes(search.toLowerCase()) ||
        record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        record.documentType.toLowerCase().includes(search.toLowerCase()) ||
        record.detail.toLowerCase().includes(search.toLowerCase());
      const matchesTimeRange = timeRange === "All Time" || record.date === timeRange;
      return matchesType && matchesSearch && matchesTimeRange;
    });
  }, [search, actionFilter, timeRange]);

  return (
    <div className="va-page">
      <div className="va-container">
        {/* Header */}
        <div className="va-header">
          <div>
            <h1 className="va-title">Void and Amended Records</h1>
            <p className="va-subtitle">
              Every voided or amended document, with the reason and who actioned it.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="va-filters">
          <div className="va-search-field">
            <Search size={16} className="va-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, declarant, or reason"
              className="va-search-input"
            />
          </div>
          <div className="va-select-field">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
              className="va-select"
            >
              <option>All actions</option>
              <option>Void</option>
              <option>Amended</option>
            </select>
            <ChevronDown size={14} className="va-select-chevron" />
          </div>
          <div className="va-select-field">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="va-select"
            >
              <option>All Time</option>
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
            </select>
            <ChevronDown size={14} className="va-select-chevron" />
          </div>
        </div>

        {/* Records list */}
        <div className="va-card">
          <div className="va-row-list">
            {filteredRecords.map((record) => (
              <VoidAmendRow key={record.id} record={record} />
            ))}
            {filteredRecords.length === 0 && (
              <div className="va-empty">No records match your search or filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
// single default export already provided above