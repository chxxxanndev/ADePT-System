import { useMemo, useState, useEffect } from "react";
import { Search, ChevronDown, Archive, RotateCcw } from "lucide-react";
import { requestService } from "../services/requestService";
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
  "General Document": "arc-tag--primary"
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Robust helper to resolve document names.
 * Uses the Database Joined name first, fallbacks to Reference Number Prefix.
 */
function resolveArchiveDocName(req: any): DocumentType {
    // 1. Try to find the name in the joined request_documents array
    if (req.request_documents && req.request_documents.length > 0) {
        // Note: Check the nesting specifically based on your backend merge logic
        const name = req.request_documents[0].document_types?.name || "";
        
        if (name.includes("Tax Declaration")) return "Tax Declaration";
        if (name.includes("No Landholding")) return "No-Landholding Certificate";
        if (name.includes("Landholding")) return "Certificate of Land Holding";
        if (name.includes("Old Tax") || name.includes("True Copy")) return "Certified True Copy";
    }

    // 2. Fallback: Use the Reference Number Prefix (The most reliable source)
    const ref = req.reference_number || "";
    if (ref.startsWith('TD')) return "Tax Declaration";
    if (ref.startsWith('NLH')) return "No-Landholding Certificate";
    if (ref.startsWith('LH')) return "Certificate of Land Holding";
    if (ref.startsWith('CTC')) return "Certified True Copy";

    return "General Document";
}

function DocTypeTag({ type }: { type: DocumentType }) {
  return <span className={`arc-tag ${DOC_TYPE_CLASS[type]}`}>{type}</span>;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function ArchiveManagement() {
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<DocTypeFilter>("All types");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("All reasons");

  const fetchArchivedData = async () => {
    try {
      setLoading(true);
      const rawRequests = await requestService.getRequests();
      
      if (Array.isArray(rawRequests)) {
        const archivedOnly = rawRequests
          .filter((r: any) => r.status === 'ARCHIVED')
          .map((r: any) => ({
            id: r.id,
            reference: r.reference_number || "N/A",
            declarantName: r.declarant_name || "Anonymous",
            documentType: resolveArchiveDocName(r), // Uses the robust helper
            archivedDate: new Date(r.updated_at).toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            }),
            archivedBy: "Staff", 
            reasonType: "Manual" as ArchiveReason,
            reasonDetail: "Manually moved from queue."
          }));
        setRecords(archivedOnly);
      }
    } catch (error) {
      console.error("Failed to fetch archive:", error);
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
            await requestService.updateRequest(id, { status: 'PENDING_PAYMENT' });
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
            <p className="arc-subtitle">
              Archived records across all document types.
            </p>
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
          <div className="arc-row-list">
            {loading ? (
                <div className="arc-empty">⏳ Loading archives...</div>
            ) : filteredRecords.length === 0 ? (
                <div className="arc-empty">No archived records found.</div>
            ) : (
                filteredRecords.map((record) => (
                    <div className="arc-row" key={record.id}>
                        <div className="arc-row-body">
                            <div className="arc-row-top">
                                <span className="arc-row-reference">#{record.reference}</span>
                                <DocTypeTag type={record.documentType} />
                            </div>
                            <p className="arc-row-name">{record.declarantName}</p>
                            <p className="arc-row-reason">{record.reasonDetail}</p>
                            <p className="arc-row-meta">
                                Archived on {record.archivedDate}
                            </p>
                        </div>
                        <button className="arc-restore-btn" onClick={() => handleRestore(record.id, record.reference)}>
                            <RotateCcw size={14} />
                            Restore
                        </button>
                    </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}