import { useMemo, useState } from "react";
import { Search, ChevronDown, Ban, PencilLine } from "lucide-react";
import "../styles/VoidAndAmend.css";

type ActionType = "void";

interface VoidAmendRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: string;
  actionType: ActionType;
  detail: string;
  actionedBy: string;
  actionedAt: string;
}

type TimeRange = "Today" | "Yesterday" | "This Week" | "This Month" | "All Time";

interface VoidAndAmendProps {
  // Called when staff clicks the pencil on a row. The record here only has
  // display fields (reference, declarant, document type, reason) — it does
  // NOT carry the full original request (property info, purpose, payment,
  // document type ids), so this can't clone anything by itself yet. The
  // parent is expected to fetch the full request by reference/id and hand
  // it to RequestFormEntry as prefilled data, generating a fresh reference
  // number the same way handleSelectNewRequest already does in Dashboard.
  onAmend?: (record: VoidAmendRecord) => void;
}

const records: VoidAmendRecord[] = [
  {
    id: "va-001",
    reference: "TD-2026-04831",
    declarantName: "Leah Todd",
    documentType: "Tax Declaration",
    actionType: "void",
    detail: "Duplicate filing under the same reference period",
    actionedBy: "Vicente Desoy",
    actionedAt: "2026-07-20T09:10:00",
  },
  {
    id: "va-002",
    reference: "LH-2026-04791",
    declarantName: "Harriett Johnson",
    documentType: "Certificate of Land Holding",
    actionType: "void",
    detail: "Corrected property boundary description",
    actionedBy: "John Cruz",
    actionedAt: "2026-07-20T08:45:00",
  },
  {
    id: "va-003",
    reference: "CTC-2026-02342",
    declarantName: "Allen Hanson",
    documentType: "Certified True Copy",
    actionType: "void",
    detail: "Declarant withdrew request before release",
    actionedBy: "Maria Lopez",
    actionedAt: "2026-07-19T16:30:00",
  },
  {
    id: "va-004",
    reference: "NLH-2026-00423",
    declarantName: "Sophia Rodriguez",
    documentType: "No-Landholding Certificate",
    actionType: "void",
    detail: "Updated declarant civil status on record",
    actionedBy: "Dennis Cruz",
    actionedAt: "2026-07-19T14:05:00",
  },
  {
    id: "va-005",
    reference: "TD-2026-09437",
    declarantName: "Oscar Sullivan",
    documentType: "Tax Declaration",
    actionType: "void",
    detail: "Incorrect declarant name entered at encoding",
    actionedBy: "Ana Marquez",
    actionedAt: "2026-07-19T11:20:00",
  },
  {
    id: "va-006",
    reference: "LH-2026-09725",
    declarantName: "Tom Hanson",
    documentType: "Certificate of Land Holding",
    actionType: "void",
    detail: "Corrected total assessed land area",
    actionedBy: "Vicente Desoy",
    actionedAt: "2026-07-16T15:15:00",
  },
  {
    id: "va-007",
    reference: "CTC-2026-05155",
    declarantName: "Minerva Duncan",
    documentType: "Certified True Copy",
    actionType: "void",
    detail: "Payment reversed, request cancelled",
    actionedBy: "Maria Lopez",
    actionedAt: "2026-07-15T10:02:00",
  },
  {
    id: "va-008",
    reference: "NLH-2026-05553",
    declarantName: "Victor Wilkins",
    documentType: "No-Landholding Certificate",
    actionType: "void",
    detail: "Updated property location details",
    actionedBy: "John Cruz",
    actionedAt: "2026-07-14T09:40:00",
  },
  {
    id: "va-009",
    reference: "TD-2026-07023",
    declarantName: "Priya Shah",
    documentType: "Tax Declaration",
    actionType: "void",
    detail: "Assessment period expired before payment",
    actionedBy: "Ana Marquez",
    actionedAt: "2026-06-28T13:50:00",
  },
  {
    id: "va-010",
    reference: "LH-2026-03390",
    declarantName: "Miguel Santos",
    documentType: "Certificate of Land Holding",
    actionType: "void",
    detail: "Updated declarant contact information",
    actionedBy: "Dennis Cruz",
    actionedAt: "2026-06-10T10:35:00",
  },
];

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

const NOW = new Date("2026-07-20T12:00:00");

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function matchesTimeRange(isoString: string, range: TimeRange): boolean {
  if (range === "All Time") return true;

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
    <span className="va-badge va-badge--void">
      <Ban size={14} />
      Void
    </span>
  );
}

export default function VoidAndAmend({ onAmend }: VoidAndAmendProps) {
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time");

  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        const matchesSearch =
          search.trim() === "" ||
          record.reference.toLowerCase().includes(search.toLowerCase()) ||
          record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
          record.documentType.toLowerCase().includes(search.toLowerCase()) ||
          record.detail.toLowerCase().includes(search.toLowerCase());
        const matchesTime = matchesTimeRange(record.actionedAt, timeRange);
        return matchesSearch && matchesTime;
      })
      .sort((a, b) => new Date(b.actionedAt).getTime() - new Date(a.actionedAt).getTime());
  }, [search, timeRange]);

  const handleAmendClick = (record: VoidAmendRecord) => {
    if (onAmend) {
      onAmend(record);
    } else {
      alert(
        `Amend "${record.reference}" isn't wired to the backend yet — cloning needs the full original request (property, purpose, document type), not just what's shown in this table.`
      );
    }
  };

  return (
    <div className="va-page">
      <div className="va-container">
        <div className="va-header">
          <div>
            <h1 className="va-title">Void and Amended Records</h1>
            <p className="va-subtitle">
              Every voided document, with the reason and who actioned it.
            </p>
          </div>
        </div>

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
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="va-select"
            >
              <option>All Time</option>
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
            <ChevronDown size={14} className="va-select-chevron" />
          </div>
        </div>

        <div className="va-card">
          <div className="va-table-scroll">
            <table className="va-table">
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
                {filteredRecords.map((record, idx) => (
                  <tr key={record.id} className={idx % 2 !== 0 ? "va-row-alt" : ""}>
                    <td className="va-cell-reference">#{record.reference}</td>
                    <td className="va-cell-name">{record.declarantName}</td>
                    <td className="va-cell-muted">{record.documentType}</td>
                    <td className="va-cell-muted">{record.detail}</td>
                    <td className="va-cell-muted">{record.actionedBy}</td>
                    <td className="va-cell-muted va-cell-nowrap">
                      {formatDateTime(record.actionedAt)}
                    </td>
                    <td>
                      <div className="va-action-cell">
                        <ActionBadge />
                        <button
                          type="button"
                          className="va-amend-btn"
                          title={`Amend ${record.reference}`}
                          aria-label={`Amend ${record.reference}`}
                          onClick={() => handleAmendClick(record)}
                        >
                          <PencilLine size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr className="va-empty-row">
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