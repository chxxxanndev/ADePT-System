import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, FileStack, Loader2 } from "lucide-react";
import "../styles/CertifiedTrueCopy.css";
import type { Transaction, TransactionStatus } from "../types/transaction";
import { fetchTransactionRegistry } from "../services/transactionService";
import { mergeReprintCounts } from "../services/reprintStore";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type CTCStatus = "Released" | "Voided" | "Archived";

interface CertifiedCopyRecord {
  id: string;
  reference: string;
  declarantName: string;
  initials: string;
  avatarColor: string;
  originalDocument: string;
  purpose: string;
  dateRequested: string;
  dateReleased: string;
  releasedBy: string;
  status: CTCStatus;
  reprintCount: number;
}

type StatusFilter = "All statuses" | CTCStatus;

const STATUS_CLASS: Record<CTCStatus, string> = {
  Released: "ctc-badge--released",
  Voided: "ctc-badge--voided",
  Archived: "ctc-badge--archived",
};

const AVATAR_PALETTE = ["#00BCD4", "#7C6FE8", "#5EB6A8", "#E8A94E", "#1976D2", "#4CAF50", "#D32F2F", "#8B5CF6"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function mapToCTCStatus(status: TransactionStatus): CTCStatus {
  if (status === "Void") return "Voided";
  if (status === "Archived") return "Archived";
  return "Released";
}

/** Finds the activity log entry that marks when/by-whom a transaction was released. */
function findReleaseInfo(t: Transaction): { date: string; by: string } {
  const releaseEntry = t.activityTimeline?.find((e) =>
    e.action?.toLowerCase().includes("released")
  );
  if (!releaseEntry) return { date: "—", by: "—" };
  return { date: releaseEntry.date || "—", by: releaseEntry.actor || "—" };
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: CTCStatus }) {
  return (
    <span className={`ctc-badge ${STATUS_CLASS[status]}`}>
      <span className="ctc-badge-dot" />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function CertifiedTrueCopy() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All statuses");

  const loadTransactions = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchTransactionRegistry();
      // Same overlay TransactionRegistry.tsx uses — the backend always
      // returns reprintCount: 0, so the real counts live in reprintStore.
      setTransactions(mergeReprintCounts(data));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load certified true copy records.");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // A CTC record isn't its own entity — it's any requested document, from
  // any transaction, that has been reprinted at least once via the
  // "Reprint" button in the Transaction Registry / Transaction Details view.
  const records: CertifiedCopyRecord[] = useMemo(() => {
    const out: CertifiedCopyRecord[] = [];
    for (const t of transactions) {
      for (const doc of t.requestedDocuments) {
        if (doc.reprintCount <= 0) continue;
        const { date: dateReleased, by: releasedBy } = findReleaseInfo(t);
        out.push({
          id: doc.id,
          reference: t.referenceNumber,
          declarantName: t.client.declarantName,
          initials: getInitials(t.client.declarantName),
          avatarColor: getAvatarColor(t.client.declarantName),
          originalDocument: `${doc.documentType} ${t.referenceNumber}`,
          purpose: t.reasonPurpose || "—",
          dateRequested: formatDate(t.dateRequested),
          dateReleased: dateReleased === "—" ? "—" : formatDate(dateReleased),
          releasedBy,
          status: mapToCTCStatus(t.status),
          reprintCount: doc.reprintCount,
        });
      }
    }
    return out.sort((a, b) => b.reprintCount - a.reprintCount);
  }, [transactions]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesStatus = statusFilter === "All statuses" || record.status === statusFilter;
      const matchesSearch =
        search.trim() === "" ||
        record.reference.toLowerCase().includes(search.toLowerCase()) ||
        record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        record.originalDocument.toLowerCase().includes(search.toLowerCase()) ||
        record.purpose.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  return (
    <div className="ctc-page">
      <div className="ctc-container">
        {/* Header */}
        <div className="ctc-header">
          <div className="ctc-header-icon">
            <FileStack size={20} />
          </div>
          <div>
            <h1 className="ctc-title">Certified True Copy</h1>
            <p className="ctc-subtitle">
              Requests for certified true copies of released documents.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="ctc-card" style={{ padding: "64px 32px", textAlign: "center", color: "#8b8fa3" }}>
            <Loader2 size={22} className="ctc-spinner" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ marginTop: 12 }}>Loading certified true copy records…</p>
          </div>
        ) : loadError ? (
          <div className="ctc-card" style={{ padding: "48px 32px", textAlign: "center", color: "#B0281C" }}>
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{loadError}</p>
            <button className="ctc-select" onClick={loadTransactions}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="ctc-filters">
              <div className="ctc-search-field">
                <Search size={16} className="ctc-search-icon" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reference, declarant, or purpose"
                  className="ctc-search-input"
                />
              </div>
              <div className="ctc-select-field">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="ctc-select"
                >
                  <option value="All statuses">All statuses</option>
                  <option value="Released">Released</option>
                  <option value="Voided">Voided</option>
                  <option value="Archived">Archived</option>
                </select>
                <ChevronDown size={14} className="ctc-select-chevron" />
              </div>
            </div>

            {/* Table */}
            <div className="ctc-card">
              <div className="ctc-table-scroll">
                <table className="ctc-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Declarant</th>
                      <th>Original Document</th>
                      <th>Purpose</th>
                      <th>Date Requested</th>
                      <th>Date Released</th>
                      <th>Released By</th>
                      <th>Times Reprinted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, idx) => (
                      <tr key={record.id} className={idx % 2 !== 0 ? "ctc-row-alt" : ""}>
                        <td className="ctc-cell-reference">#{record.reference}</td>
                        <td>
                          <div className="ctc-declarant-cell">
                            <div
                              className="ctc-avatar"
                              style={{ backgroundColor: record.avatarColor }}
                            >
                              {record.initials}
                            </div>
                            <span>{record.declarantName}</span>
                          </div>
                        </td>
                        <td className="ctc-cell-muted">{record.originalDocument}</td>
                        <td className="ctc-cell-muted">{record.purpose}</td>
                        <td className="ctc-cell-muted">{record.dateRequested}</td>
                        <td className="ctc-cell-muted">{record.dateReleased}</td>
                        <td className="ctc-cell-muted">{record.releasedBy}</td>
                        <td className="ctc-cell-muted">{record.reprintCount}</td>
                        <td>
                          <StatusBadge status={record.status} />
                        </td>
                      </tr>
                    ))}
                    {filteredRecords.length === 0 && (
                      <tr className="ctc-empty-row">
                        <td colSpan={9}>
                          No documents have been reprinted yet. Reprint a document from the
                          Transaction Registry to see it appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}