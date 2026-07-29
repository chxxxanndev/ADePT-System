import { useMemo, useState, useEffect } from "react";
import { Search, ChevronDown, Ban, PencilLine } from "lucide-react";
import { fetchTransactionRegistry } from "../services/transactionService";
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
  onAmend?: (record: VoidAmendRecord) => void;
}

const INITIAL_MOCK_RECORDS: VoidAmendRecord[] = [
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
];

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
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

const NOW = new Date();

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
  if (isNaN(actionedDate.getTime())) return true;
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
  const [liveRecords, setLiveRecords] = useState<VoidAmendRecord[]>([]);

  useEffect(() => {
    const loadVoided = async () => {
      try {
        const txns = await fetchTransactionRegistry();
        const voidedTxns = txns.filter(t => t.isVoid || t.status === 'Void' || t.status === 'VOID');
        const mapped: VoidAmendRecord[] = voidedTxns.map(t => ({
          id: t.id,
          reference: t.referenceNumber,
          declarantName: t.client.declarantName,
          documentType: t.requestedDocuments.map(d => d.documentType).join(', ') || 'Document Request',
          actionType: 'void',
          detail: t.voidReason || 'Voided by staff',
          actionedBy: t.assignedStaff || 'Staff',
          actionedAt: new Date().toISOString(),
        }));
        setLiveRecords(mapped);
      } catch (err) {
        console.warn('Failed to load voided records from server:', err);
      }
    };
    loadVoided();
  }, []);

  const allRecords = useMemo(() => {
    if (liveRecords.length === 0) return INITIAL_MOCK_RECORDS;
    return [...liveRecords, ...INITIAL_MOCK_RECORDS];
  }, [liveRecords]);

  const filteredRecords = useMemo(() => {
    return allRecords
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
  }, [allRecords, search, timeRange]);

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