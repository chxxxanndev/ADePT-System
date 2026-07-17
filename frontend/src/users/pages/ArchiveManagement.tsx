import { useMemo, useState } from "react";
import { Search, ChevronDown, Archive, RotateCcw } from "lucide-react";
import "../styles/ArchiveManagement.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type DocumentType =
  | "Tax Declaration"
  | "Certificate of Land Holding"
  | "No-Landholding Certificate"
  | "Certified True Copy";

type OriginalStatus = "Released" | "Voided";
type ArchiveReason = "Auto" | "Manual";

interface ArchivedRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: DocumentType;
  originalStatus: OriginalStatus;
  archivedDate: string;
  archivedBy: string; // 'System' for auto-archive
  reasonType: ArchiveReason;
  reasonDetail: string;
}

type DocTypeFilter = "All types" | DocumentType;
type ReasonFilter = "All reasons" | ArchiveReason;

/* ------------------------------------------------------------------ */
/*  Mock data — inlined here for now.                                  */
/*  TODO: replace with real data from a useArchiveManagement hook /    */
/*  API once a backend endpoint exists (e.g. GET /api/archive?…).      */
/*  The "Restore" action currently just updates local state — wire it  */
/*  to a real PATCH/POST call once the backend supports un-archiving.  */
/* ------------------------------------------------------------------ */
const initialRecords: ArchivedRecord[] = [
  {
    id: "arc-001",
    reference: "TD-2024-08169",
    declarantName: "Sadie Blair",
    documentType: "Tax Declaration",
    originalStatus: "Released",
    archivedDate: "01 Jun 2026",
    archivedBy: "System",
    reasonType: "Auto",
    reasonDetail: "Auto-archived after 90 days of inactivity",
  },
  {
    id: "arc-002",
    reference: "CTC-2026-04002",
    declarantName: "Elena Ruiz",
    documentType: "Certified True Copy",
    originalStatus: "Released",
    archivedDate: "24 May 2026",
    archivedBy: "Dennis Cruz",
    reasonType: "Manual",
    reasonDetail: "Case closed — no further action needed",
  },
  {
    id: "arc-003",
    reference: "LH-2025-09725",
    declarantName: "Tom Hanson",
    documentType: "Certificate of Land Holding",
    originalStatus: "Voided",
    archivedDate: "18 May 2026",
    archivedBy: "System",
    reasonType: "Auto",
    reasonDetail: "Voided record auto-archived after 60 days",
  },
  {
    id: "arc-004",
    reference: "NLH-2025-00423",
    declarantName: "Sophia Rodriguez",
    documentType: "No-Landholding Certificate",
    originalStatus: "Released",
    archivedDate: "01 Apr 2026",
    archivedBy: "Ana Marquez",
    reasonType: "Manual",
    reasonDetail: "Superseded by a newer certificate",
  },
  {
    id: "arc-005",
    reference: "TD-2023-05512",
    declarantName: "Carlo Gomez",
    documentType: "Tax Declaration",
    originalStatus: "Released",
    archivedDate: "15 Apr 2026",
    archivedBy: "System",
    reasonType: "Auto",
    reasonDetail: "Declarant account marked inactive after 90 days",
  },
  {
    id: "arc-006",
    reference: "CTC-2025-06657",
    declarantName: "Stanley Moore",
    documentType: "Certified True Copy",
    originalStatus: "Voided",
    archivedDate: "10 Mar 2026",
    archivedBy: "Maria Lopez",
    reasonType: "Manual",
    reasonDetail: "Duplicate request, original request retained",
  },
];

const DOC_TYPE_CLASS: Record<DocumentType, string> = {
  "Tax Declaration": "arc-tag--primary",
  "Certificate of Land Holding": "arc-tag--success",
  "No-Landholding Certificate": "arc-tag--secondary",
  "Certified True Copy": "arc-tag--truecopy",
};

const STATUS_CLASS: Record<OriginalStatus, string> = {
  Released: "arc-badge--released",
  Voided: "arc-badge--voided",
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function DocTypeTag({ type }: { type: DocumentType }) {
  return <span className={`arc-tag ${DOC_TYPE_CLASS[type]}`}>{type}</span>;
}

function StatusBadge({ status }: { status: OriginalStatus }) {
  return (
    <span className={`arc-badge ${STATUS_CLASS[status]}`}>
      <span className="arc-badge-dot" />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function ArchiveManagement() {
  const [records, setRecords] = useState<ArchivedRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("All types");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("All reasons");

  const handleRestore = (id: string) => {
    // TODO: call the real restore endpoint here, then remove locally on success.
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesType = docTypeFilter === "All types" || record.documentType === docTypeFilter;
      const matchesReason = reasonFilter === "All reasons" || record.reasonType === reasonFilter;
      const matchesSearch =
        search.trim() === "" ||
        record.reference.toLowerCase().includes(search.toLowerCase()) ||
        record.declarantName.toLowerCase().includes(search.toLowerCase()) ||
        record.reasonDetail.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesReason && matchesSearch;
    });
  }, [records, search, docTypeFilter, reasonFilter]);

  return (
    <div className="arc-page">
      <div className="arc-container">
        {/* Header */}
        <div className="arc-header">
          <div className="arc-header-icon">
            <Archive size={20} />
          </div>
          <div>
            <h1 className="arc-title">Archive Management</h1>
            <p className="arc-subtitle">
              Archived documents across all types, with the reason and who archived them.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="arc-filters">
          <div className="arc-search-field">
            <Search size={16} className="arc-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, declarant, or reason"
              className="arc-search-input"
            />
          </div>
          <div className="arc-select-field">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as DocTypeFilter)}
              className="arc-select"
            >
              <option>All types</option>
              <option>Tax Declaration</option>
              <option>Certificate of Land Holding</option>
              <option>No-Landholding Certificate</option>
              <option>Certified True Copy</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>
          <div className="arc-select-field">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
              className="arc-select"
            >
              <option>All reasons</option>
              <option>Auto</option>
              <option>Manual</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>
        </div>

        {/* Records list */}
        <div className="arc-card">
          <div className="arc-row-list">
            {filteredRecords.map((record) => (
              <div className="arc-row" key={record.id}>
                <div className="arc-row-body">
                  <div className="arc-row-top">
                    <span className="arc-row-reference">#{record.reference}</span>
                    <DocTypeTag type={record.documentType} />
                    <StatusBadge status={record.originalStatus} />
                  </div>
                  <p className="arc-row-name">{record.declarantName}</p>
                  <p className="arc-row-reason">{record.reasonDetail}</p>
                  <p className="arc-row-meta">
                    Archived by {record.archivedBy} · {record.archivedDate}
                  </p>
                </div>
                <button className="arc-restore-btn" onClick={() => handleRestore(record.id)}>
                  <RotateCcw size={14} />
                  Restore
                </button>
              </div>
            ))}
            {filteredRecords.length === 0 && (
              <div className="arc-empty">No archived records match your search or filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}