import { useMemo, useState, useEffect } from "react";
import { Search, ChevronDown, Archive, RotateCcw, Loader2 } from "lucide-react";
import { requestService } from "../services/requestService";
import { fetchTransactionRegistry } from "../services/transactionService";
import type { Transaction, RequestedDocumentItem } from "../types/transaction";
import "../styles/ArchiveManagement.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type DocumentType =
  | "Tax Declaration"
  | "Certificate of Land Holding"
  | "No-Landholding Certificate"
  | "Certified True Copy"
  | "General Document";

type ArchiveReason = "Auto" | "Manual";

interface ArchivedRecord {
  id: string;
  reference: string;
  declarantName: string;
  documentType: DocumentType;
  archivedDate: string;
  archivedTime: string;
  archivedBy: string;
  reasonType: ArchiveReason;
  reasonDetail: string;
}

type DocTypeFilter = "All types" | DocumentType;
type ReasonFilter = "All reasons" | ArchiveReason;

const DOC_TYPE_CLASS: Record<DocumentType, string> = {
  "Tax Declaration": "arc-tag--primary",
  "Certificate of Land Holding": "arc-tag--success",
  "No-Landholding Certificate": "arc-tag--secondary",
  "Certified True Copy": "arc-tag--truecopy",
  "General Document": "arc-tag--general",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Maps the normalized `documentType` string(s) coming from the shared
 * Transaction Registry (Title Case, e.g. "Certificate of No Landholding")
 * onto this page's own display labels.
 */
function resolveArchiveDocName(docs: RequestedDocumentItem[]): DocumentType {
  const name = docs[0]?.documentType ?? "";

  if (name.includes("Tax Declaration")) return "Tax Declaration";
  if (name.includes("No Landholding") || name.includes("No-Landholding")) return "No-Landholding Certificate";
  if (name.includes("Landholding") || name.includes("Land Holding")) return "Certificate of Land Holding";
  if (name.includes("True Copy")) return "Certified True Copy";

  return "General Document";
}

function DocTypeTag({ type }: { type: DocumentType }) {
  return <span className={`arc-tag ${DOC_TYPE_CLASS[type]}`}>{type}</span>;
}

/**
 * Transaction has no `archivedAt`/`archivedBy` columns yet — only
 * `dateRequested` and `assignedStaff` are available from the registry.
 * These are used as the best available stand-ins until the backend adds
 * dedicated archive-audit fields (mirrors the same limitation documented
 * for void records in VoidAndAmend.tsx).
 */
function toArchivedRecord(t: Transaction): ArchivedRecord {
  const requested = new Date(t.dateRequested);
  return {
    id: t.id,
    reference: t.referenceNumber,
    declarantName: t.client.declarantName,
    documentType: resolveArchiveDocName(t.requestedDocuments),
    archivedDate: requested.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    archivedTime: requested.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    archivedBy: t.assignedStaff || "Staff",
    // No archive-reason field exists on the backend yet — every archived
    // transaction is reported as "Manual" until one is added.
    reasonType: "Manual",
    reasonDetail: "Manually moved from queue.",
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function ArchiveManagement() {
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("All types");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("All reasons");

  const fetchArchivedData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      // Reads from the same registry endpoint as Reports, Transaction Registry,
      // and Void and Amend, so this page's archived count always matches the
      // "Archived" figure shown in Reports & Analytics and on the Dashboard.
      const all = await fetchTransactionRegistry();
      const archivedOnly = all.filter((t) => t.status === "Archived").map(toArchivedRecord);
      setRecords(archivedOnly);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to fetch archive.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedData();
  }, []);

  const handleRestore = async (id: string, ref: string) => {
    if (confirm(`Restore Reference #${ref} to the Pending Payments queue?`)) {
      try {
        await requestService.updateRequest(id, { status: "PENDING_PAYMENT" });
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        alert("Failed to restore document.");
      }
    }
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
        <div className="arc-header">
          <div className="arc-header-icon">
            <Archive size={20} />
          </div>
          <div>
            <h1 className="arc-title">Archive Management</h1>
            <p className="arc-subtitle">Archived records across all document types.</p>
          </div>
        </div>

        <div className="arc-filters">
          <div className="arc-search-field">
            <Search size={16} className="arc-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or declarant..."
              className="arc-search-input"
            />
          </div>
          <div className="arc-select-field">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value as DocTypeFilter)}
              className="arc-select"
            >
              <option value="All types">All types</option>
              <option value="Tax Declaration">Tax Declaration</option>
              <option value="Certificate of Land Holding">Certificate of Land Holding</option>
              <option value="No-Landholding Certificate">No-Landholding Certificate</option>
              <option value="Certified True Copy">Certified True Copy</option>
              <option value="General Document">General Document</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>
          <div className="arc-select-field">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
              className="arc-select"
            >
              <option value="All reasons">All reasons</option>
              <option value="Auto">Auto</option>
              <option value="Manual">Manual</option>
            </select>
            <ChevronDown size={14} className="arc-select-chevron" />
          </div>
        </div>

        <div className="arc-card">
          <div className="arc-table-scroll">
            <table className="arc-table">
              <thead>
                <tr>
                  <th>Control Number</th>
                  <th>Declarant</th>
                  <th>Document Type</th>
                  <th>Reason</th>
                  <th>Archived By</th>
                  <th>Date &amp; Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="arc-empty-row">
                    <td colSpan={7}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="arc-spinner" style={{ animation: 'spin 1s linear infinite' }} /> 
                        Loading archives...
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr className="arc-empty-row">
                    <td colSpan={7} style={{ color: '#B0281C' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
                        <span style={{ fontWeight: 600 }}>{loadError}</span>
                        <button className="arc-restore-btn" onClick={fetchArchivedData}>Retry</button>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr className="arc-empty-row">
                    <td colSpan={7}>No archived records found.</td>
                  </tr>
                ) : (
                  filteredRecords.map((record, idx) => (
                    <tr key={record.id} className={idx % 2 !== 0 ? "arc-row-alt" : ""}>
                      <td className="arc-cell-reference">#{record.reference}</td>
                      <td className="arc-cell-name">{record.declarantName}</td>
                      <td>
                        <DocTypeTag type={record.documentType} />
                      </td>
                      <td className="arc-cell-muted">{record.reasonDetail}</td>
                      <td className="arc-cell-muted">{record.archivedBy}</td>
                      <td className="arc-cell-muted">
                        {record.archivedDate}, {record.archivedTime}
                      </td>
                      <td>
                        <button
                          className="arc-restore-btn"
                          onClick={() => handleRestore(record.id, record.reference)}
                        >
                          <RotateCcw size={14} />
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}