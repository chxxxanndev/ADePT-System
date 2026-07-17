import { useMemo, useState } from "react";
import { Search, ChevronDown, FileStack } from "lucide-react";
import "../styles/CertifiedTrueCopy.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type CTCStatus = "Pending Payment" | "Pending Verification" | "Released" | "Voided" | "Archived";

interface CertifiedCopyRecord {
  id: string;
  reference: string;
  declarantName: string;
  initials: string;
  avatarColor: string;
  originalDocument: string; // the document being copied
  purpose: string;
  dateRequested: string;
  dateReleased: string; // '—' if not yet released
  releasedBy: string; // '—' if not yet released
  status: CTCStatus;
}

type StatusFilter = "All statuses" | CTCStatus;

/* ------------------------------------------------------------------ */
/*  Mock data — inlined here for now.                                  */
/*  TODO: replace with real data from a useCertifiedTrueCopy hook /    */
/*  API once a backend endpoint exists (e.g. GET /api/ctc?range=…).    */
/* ------------------------------------------------------------------ */
const records: CertifiedCopyRecord[] = [
  {
    id: "ctc-001",
    reference: "CTC-2026-02342",
    declarantName: "Allen Hanson",
    initials: "AH",
    avatarColor: "#00BCD4",
    originalDocument: "Tax Declaration TD-2024-00221",
    purpose: "Bank loan requirement",
    dateRequested: "10 Jul 2026",
    dateReleased: "—",
    releasedBy: "—",
    status: "Pending Payment",
  },
  {
    id: "ctc-002",
    reference: "CTC-2026-05155",
    declarantName: "Minerva Duncan",
    initials: "MD",
    avatarColor: "#7C6FE8",
    originalDocument: "Certificate of Land Holding LH-2023-00194",
    purpose: "Estate settlement",
    dateRequested: "09 Jul 2026",
    dateReleased: "—",
    releasedBy: "—",
    status: "Voided",
  },
  {
    id: "ctc-003",
    reference: "CTC-2026-06657",
    declarantName: "Stanley Moore",
    initials: "SM",
    avatarColor: "#5EB6A8",
    originalDocument: "Tax Declaration TD-2022-00087",
    purpose: "Court submission",
    dateRequested: "05 Jul 2026",
    dateReleased: "12 Jul 2026",
    releasedBy: "Maria Lopez",
    status: "Released",
  },
  {
    id: "ctc-004",
    reference: "CTC-2026-07781",
    declarantName: "Priya Shah",
    initials: "PS",
    avatarColor: "#E8A94E",
    originalDocument: "No-Landholding Certificate NLH-2025-00033",
    purpose: "Scholarship application",
    dateRequested: "08 Jul 2026",
    dateReleased: "—",
    releasedBy: "—",
    status: "Pending Verification",
  },
  {
    id: "ctc-005",
    reference: "CTC-2026-08120",
    declarantName: "Miguel Santos",
    initials: "MS",
    avatarColor: "#1976D2",
    originalDocument: "Certificate of Land Holding LH-2021-00456",
    purpose: "Property sale",
    dateRequested: "02 Jul 2026",
    dateReleased: "06 Jul 2026",
    releasedBy: "John Cruz",
    status: "Released",
  },
  {
    id: "ctc-006",
    reference: "CTC-2026-04002",
    declarantName: "Elena Ruiz",
    initials: "ER",
    avatarColor: "#4CAF50",
    originalDocument: "Tax Declaration TD-2020-00312",
    purpose: "Business permit renewal",
    dateRequested: "20 May 2026",
    dateReleased: "24 May 2026",
    releasedBy: "Dennis Cruz",
    status: "Archived",
  },
];

const STATUS_CLASS: Record<CTCStatus, string> = {
  "Pending Payment": "ctc-badge--pending",
  "Pending Verification": "ctc-badge--pending",
  Released: "ctc-badge--released",
  Voided: "ctc-badge--voided",
  Archived: "ctc-badge--archived",
};

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All statuses");

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
  }, [search, statusFilter]);

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
              <option>All statuses</option>
              <option>Pending Payment</option>
              <option>Pending Verification</option>
              <option>Released</option>
              <option>Voided</option>
              <option>Archived</option>
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
                    <td>
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr className="ctc-empty-row">
                    <td colSpan={8}>No records match your search or filter.</td>
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