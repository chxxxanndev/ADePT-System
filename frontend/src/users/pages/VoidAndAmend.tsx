import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Search, ChevronDown, Ban, PencilLine, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/VoidAndAmend.css";

export type ActionType = "void";

export interface VoidAmendRecord {
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

// ─── Constants ──────────────────────────────────────────────
const STORAGE_KEY = "voidedRecords";
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Helpers ──────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────

export default function VoidAndAmend({ onAmend }: VoidAndAmendProps) {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ─── Persistent state (localStorage) ────────────────────
  const [records, setRecords] = useState<VoidAmendRecord[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Save to localStorage whenever records change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  // ─── Add new voided items from navigation state ──────────
  useEffect(() => {
    const state = location.state as { newVoidedItems?: VoidAmendRecord[] } | null;
    if (state?.newVoidedItems && state.newVoidedItems.length > 0) {
      setRecords((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = state.newVoidedItems!.filter((r) => !existingIds.has(r.id));
        return [...newItems, ...prev];
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // ─── Filtering & Sorting ─────────────────────────────────
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
  }, [records, search, timeRange]);

  // ─── Pagination ───────────────────────────────────────────
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, timeRange, pageSize]);

  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalRecords);
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(start, end);
  }, [filteredRecords, start, end]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
  };

  // ─── Amend callback ──────────────────────────────────────
  const handleAmendClick = (record: VoidAmendRecord) => {
    if (onAmend) {
      onAmend(record);
    } else {
      alert(
        `Amend "${record.reference}" isn't wired to the backend yet — cloning needs the full original request (property, purpose, document type), not just what's shown in this table.`
      );
    }
  };

  // ─── Render ──────────────────────────────────────────────

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
                {paginatedRecords.map((record, idx) => (
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
                {paginatedRecords.length === 0 && (
                  <tr className="va-empty-row">
                    <td colSpan={7}>No voided records match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ─── Pagination Controls ────────────────────────── */}
          {totalRecords > 0 && (
            <div className="va-pagination">
              <div className="va-pagination-left">
                <span className="va-rows-label">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="va-rows-select"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="va-pagination-center">
                <span className="va-range-info">
                  {start + 1}–{end} of {totalRecords}
                </span>
              </div>

              <div className="va-pagination-right">
                <button
                  className="va-page-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="va-page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="va-page-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}