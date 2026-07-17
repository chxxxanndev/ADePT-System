import { useEffect, useMemo, useState, useCallback } from "react";
import { SearchIcon } from "../components/icons";
import "../styles/AccountRequest.css";
import type { User } from "../../auth-folder/types/auth";
import { fetchAllStaff, updateStaffStatus, type StaffMember } from "../services/userManagementService";

// ---------- Types ----------
type TabKey = "pending" | "approved" | "declined";

interface StaffRequestItem {
  id: string;
  applicantName: string;
  initials: string;
  avatarColor: string;
  email: string;
  submitted: string;
  status: StaffMember["account_status"];
}

const AVATAR_COLORS = ["avatar-rose", "avatar-amber", "avatar-sky", "avatar-emerald", "avatar-violet"];

function avatarColorForId(id: string) {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function formatSubmitted(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapRow(row: StaffMember): StaffRequestItem {
  return {
    id: row.id,
    applicantName: `${row.first_name} ${row.last_name}`,
    initials: `${row.first_name[0] ?? ""}${row.last_name[0] ?? ""}`.toUpperCase(),
    avatarColor: avatarColorForId(row.id),
    email: row.email,
    submitted: formatSubmitted(row.created_at),
    status: row.account_status,
  };
}

const TABS: { key: TabKey; label: string; status: StaffMember["account_status"] }[] = [
  { key: "pending", label: "Pending", status: "PENDING_APPROVAL" },
  { key: "approved", label: "Approved", status: "ACTIVE" },
  { key: "declined", label: "Declined", status: "REJECTED" },
];

interface AccountRequestProps {
  user: User;
}

export default function AccountRequest({ user }: AccountRequestProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<StaffRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const fullName = `${user.firstName || "Mommy"} ${user.lastName || "Dionisia"}`;
  const initials = `${user.firstName?.[0] || "M"}${user.lastName?.[0] || "D"}`;
  const roleLabel =
    user.role === "SUPER_ADMIN" ? "Super Admin" : user.role === "OFFICE_STAFF" ? "Office Staff" : user.role || "Super Admin";

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const staff = await fetchAllStaff();
      const relevant = staff.filter((s) =>
        ["PENDING_APPROVAL", "ACTIVE", "REJECTED"].includes(s.account_status)
      );
      setRequests(relevant.map(mapRow));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "PENDING_APPROVAL").length,
      approved: requests.filter((r) => r.status === "ACTIVE").length,
      declined: requests.filter((r) => r.status === "REJECTED").length,
    }),
    [requests]
  );

  const activeStatus = TABS.find((t) => t.key === activeTab)!.status;

  const filtered = useMemo(() => {
    return requests
      .filter((r) => r.status === activeStatus)
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return r.applicantName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      });
  }, [requests, activeStatus, query]);

  async function handleDecision(id: string, decision: "approved" | "declined") {
    setDecidingId(id);
    const newStatus = decision === "approved" ? "ACTIVE" : "REJECTED";

    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));

    try {
      await updateStaffStatus(id, newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
      loadRequests();
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="account-request-page">
      <div className="rq-page-header">
        <div className="rq-page-header-row">
          <div>
            <h1 className="rq-page-title">Account requests</h1>
            <p className="rq-page-subtitle">
              Approve or decline new staff registrations before they can access the system.
            </p>
          </div>

          <div className="account-request-user-chip">
            <div className="account-request-user-avatar">{initials}</div>
            <div>
              <p className="account-request-user-name">{fullName}</p>
              <p className="account-request-user-role">{roleLabel}</p>
            </div>
          </div>
        </div>

        <div className="rq-search-wrapper">
          <input
            type="text"
            className="rq-search-input"
            placeholder="Search records"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="rq-search-icon">
            <SearchIcon size={16} />
          </span>
        </div>
      </div>

      <div className="account-request-content">
        <div className="account-request-card">
          <div className="account-request-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`account-request-tab ${activeTab === tab.key ? "active" : ""}`}
              >
                {tab.label}
                {tab.key === "pending" && counts.pending > 0 && <span> ({counts.pending})</span>}
                {activeTab === tab.key && <span className="account-request-tab-indicator" />}
              </button>
            ))}
          </div>

          {error && <div className="account-request-error-banner">{error}</div>}

          <table className="account-request-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="account-request-empty-row">Loading requests…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="account-request-empty-row">No {activeTab} requests to show.</td>
                </tr>
              )}
              {!loading &&
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="account-request-applicant">
                        <div className={`account-request-applicant-avatar ${r.avatarColor}`}>{r.initials}</div>
                        <span className="account-request-applicant-name">{r.applicantName}</span>
                      </div>
                    </td>
                    <td className="account-request-cell-muted">{r.email}</td>
                    <td className="account-request-cell-muted">{r.submitted}</td>
                    <td>
                      {r.status === "PENDING_APPROVAL" ? (
                        <div className="account-request-actions">
                          <button
                            onClick={() => handleDecision(r.id, "approved")}
                            disabled={decidingId === r.id}
                            className="account-request-btn approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecision(r.id, "declined")}
                            disabled={decidingId === r.id}
                            className="account-request-btn decline"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className={`account-request-status-label ${r.status === "ACTIVE" ? "approved" : "declined"}`}>
                          {r.status === "ACTIVE" ? "Approved" : "Declined"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="account-request-footer-note">
            <p>Approving a request grants entry to the main system dashboard. Only approve applicants with a legitimate assessor's office role.</p>
          </div>
        </div>
      </div>
    </div>
  );
}