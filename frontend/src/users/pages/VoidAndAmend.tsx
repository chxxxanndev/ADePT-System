import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronDown, Ban, PencilLine } from "lucide-react";
import { fetchTransactionRegistry } from "../services/transactionService";
import { isAmended } from "../../utils/amendedRecords";
import type { Transaction } from "../types/transaction";
import "../styles/VoidAndAmend.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
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
  originalTransaction?: Transaction;
}

type TimeRange = "Today" | "Yesterday" | "This Week" | "This Month" | "All Time";

interface VoidAndAmendProps {
  onAmend?: (record: VoidAmendRecord) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
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
    case "Today": return isSameCalendarDay(actionedDate, NOW);
    case "Yesterday": return dayDiff === 1;
    case "This Week": return dayDiff >= 0 && dayDiff <= 6;
    case "This Month":
      return actionedDate.getFullYear() === NOW.getFullYear() && 
             actionedDate.getMonth() === NOW.getMonth();
    default: return true;
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

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function VoidAndAmend({ onAmend }: VoidAndAmendProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time");
  const [liveRecords, setLiveRecords] = useState<VoidAmendRecord[]>([]);
  const [justVoided, setJustVoided] = useState<VoidAmendRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceTick] = useState(0);

  // 1. Handle incoming data from 'navigate' (immediate UI update after voiding)
  useEffect(() => {
    const incoming = location.state as { voidedTransactions?: Transaction[]; reason?: string } | undefined;

    if (incoming?.voidedTransactions?.length) {
      const mapped: VoidAmendRecord[] = incoming.voidedTransactions.map((t) => ({
        id: t.id,
        reference: t.referenceNumber,
        declarantName: t.client.declarantName,
        documentType: t.requestedDocuments.map((d) => d.documentType).join(", ") || "Document Request",
        actionType: "void",
        detail: incoming.reason || t.voidReason || "Voided by staff",
        actionedBy: t.assignedStaff || "Staff",
        actionedAt: new Date().toISOString(),
        originalTransaction: t,
      }));
      setJustVoided((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...mapped.filter((r) => !seen.has(r.id)), ...prev];
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 2. Fetch full registry from server
  useEffect(() => {
    const loadVoided = async () => {
      setIsLoading(true);
      try {
        const txns = await fetchTransactionRegistry();
        // Cast status to string to avoid TS type mismatch errors with "VOID"
        const voidedTxns = txns.filter((t) =>
          t.isVoid || (t.status as string) === "Void" || (t.status as string) === "VOID"
        );
        const mapped: VoidAmendRecord[] = voidedTxns.map((t) => ({
          id: t.id,
          reference: t.referenceNumber,
          declarantName: t.client.declarantName,
          documentType: t.requestedDocuments.map((d) => d.documentType).join(", ") || "Document Request",
          actionType: "void",
          detail: t.voidReason || "Voided by staff",
          actionedBy: t.assignedStaff || "Staff",
          actionedAt: t.updatedAt || new Date().toISOString(),
          originalTransaction: t,
        }));
        setLiveRecords(mapped);
      } catch (err) {
        console.warn("Failed to load voided records from server:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadVoided();
  }, []);

  // 3. Refresh "Amended" button state if user returns to this tab
  useEffect(() => {
    const onFocus = () => forceTick((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const allRecords = useMemo(() => {
    const seen = new Set(justVoided.map((r) => r.id));
    return [...justVoided, ...liveRecords.filter((r) => !seen.has(r.id))];
  }, [liveRecords, justVoided]);

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
    if (isAmended(record.id)) return;

    if (onAmend) {
      onAmend(record);
    } else if (record.originalTransaction) {
      navigate("/document-request", {
        state: {
          clonedFrom: record.originalTransaction,
          amendmentSourceId: record.id,
        },
      });
    } else {
      alert(`Cloning failed: Full original request data is missing for ${record.reference}.`);
    }
  };

  return (
    <div className="va-page">
      <div className="va-container">
        <div className="va-header">
          <div>
            <h1 className="va-title">Void and Amended Records</h1>
            <p className="va-subtitle">
              History of voided documents and corrected transactions.
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
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
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
                {isLoading ? (
                  <tr className="va-loading-row">
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <div className="va-loader-text">Loading voided records...</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredRecords.map((record, idx) => {
                      const amended = isAmended(record.id);
                      return (
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
                                className={`va-amend-btn${amended ? " va-amend-btn--disabled" : ""}`}
                                disabled={amended}
                                title={amended ? "Already Amended" : "Amend Record"}
                                onClick={() => handleAmendClick(record)}
                              >
                                <PencilLine size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredRecords.length === 0 && (
                      <tr className="va-empty-row">
                        <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                          No voided records found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}