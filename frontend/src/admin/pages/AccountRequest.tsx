import { useMemo, useState } from "react";
import { Search, ChevronDown, Bell } from "lucide-react";
import "../styles/AccountRequest.css";

// ---------- Types ----------
type RequestStatus = "pending" | "approved" | "declined";
type IdDocStatus = "verified" | "pending_verification";

interface AccountRequestItem {
  id: string;
  applicantName: string;
  initials: string;
  avatarColor: string; // css class, e.g. "avatar-rose"
  email: string;
  requestedRole: string;
  submitted: string; // display string, e.g. "Jul 14, 8:02 AM"
  idDocument: IdDocStatus;
  status: RequestStatus;
}

// ---------- Mock data (swap for API data once endpoint is confirmed) ----------
const MOCK_REQUESTS: AccountRequestItem[] = [
  {
    id: "req-001",
    applicantName: "Rosario Dalisay",
    initials: "RD",
    avatarColor: "avatar-rose",
    email: "r.dalisay@zamboangadelnorte.gov.ph",
    requestedRole: "Staff — Records officer",
    submitted: "Jul 14, 8:02 AM",
    idDocument: "verified",
    status: "pending",
  },
  {
    id: "req-002",
    applicantName: "Edgar Mendoza",
    initials: "EM",
    avatarColor: "avatar-amber",
    email: "e.mendoza@zamboangadelnorte.gov.ph",
    requestedRole: "Staff — Assessment clerk",
    submitted: "Jul 14, 7:41 AM",
    idDocument: "verified",
    status: "pending",
  },
  {
    id: "req-003",
    applicantName: "Liza Tan",
    initials: "LT",
    avatarColor: "avatar-sky",
    email: "l.tan@gmail.com",
    requestedRole: "Citizen access",
    submitted: "Jul 13, 4:18 PM",
    idDocument: "pending_verification",
    status: "pending",
  },
  {
    id: "req-004",
    applicantName: "Marco Villaruz",
    initials: "MV",
    avatarColor: "avatar-emerald",
    email: "m.villaruz@zamboangadelnorte.gov.ph",
    requestedRole: "Staff — Records officer",
    submitted: "Jul 10, 9:15 AM",
    idDocument: "verified",
    status: "approved",
  },
  {
    id: "req-005",
    applicantName: "Grace Uy",
    initials: "GU",
    avatarColor: "avatar-violet",
    email: "grace.uy@yahoo.com",
    requestedRole: "Citizen access",
    submitted: "Jul 8, 2:30 PM",
    idDocument: "pending_verification",
    status: "declined",
  },
];

const TABS: { key: RequestStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

function IdDocBadge({ status }: { status: IdDocStatus }) {
  if (status === "verified") {
    return (
      <span className="account-request-badge verified">Verified</span>
    );
  }
  return (
    <span className="account-request-badge pending">Pending verification</span>
  );
}

export default function AccountRequest() {
  const [activeTab, setActiveTab] = useState<RequestStatus>("pending");
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<AccountRequestItem[]>(MOCK_REQUESTS);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      declined: requests.filter((r) => r.status === "declined").length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    return requests
      .filter((r) => r.status === activeTab)
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
          r.applicantName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.requestedRole.toLowerCase().includes(q)
        );
      });
  }, [requests, activeTab, query]);

  function handleDecision(id: string, decision: "approved" | "declined") {
    // TODO: replace with actual API call once endpoint is confirmed
    // e.g. await api.patch(`/account-requests/${id}`, { status: decision })
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: decision } : r))
    );
  }

  return (
    <div className="account-request-page">
      {/* Dedicated header for this view */}
      <header className="account-request-header">
        <div className="account-request-header-row">
          <div>
            <h1 className="account-request-title">Account requests</h1>
            <p className="account-request-subtitle">
              Approve or decline new registrations before they can access the
              system.
            </p>
          </div>

          <div className="account-request-header-actions">
            <div className="account-request-search-wrap">
              <Search className="account-request-search-icon" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search records"
                className="account-request-search-input"
              />
            </div>

            <button className="account-request-date-btn">
              Today
              <ChevronDown size={16} />
            </button>

            <button className="account-request-bell-btn">
              <Bell size={16} />
              <span className="account-request-bell-dot" />
            </button>

            <div className="account-request-user-chip">
              <div className="account-request-user-avatar">VD</div>
              <div>
                <p className="account-request-user-name">Vicente Desoy</p>
                <p className="account-request-user-role">Super admin</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="account-request-content">
        <div className="account-request-card">
          {/* Tabs */}
          <div className="account-request-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`account-request-tab ${activeTab === tab.key ? "active" : ""
                  }`}
              >
                {tab.label}
                {tab.key === "pending" && counts.pending > 0 && (
                  <span> ({counts.pending})</span>
                )}
                {activeTab === tab.key && (
                  <span className="account-request-tab-indicator" />
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <table className="account-request-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Requested role</th>
                <th>Submitted</th>
                <th>ID document</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="account-request-empty-row">
                    No {activeTab} requests to show.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="account-request-applicant">
                      <div
                        className={`account-request-applicant-avatar ${r.avatarColor}`}
                      >
                        {r.initials}
                      </div>
                      <span className="account-request-applicant-name">
                        {r.applicantName}
                      </span>
                    </div>
                  </td>
                  <td className="account-request-cell-muted">{r.email}</td>
                  <td>{r.requestedRole}</td>
                  <td className="account-request-cell-muted">{r.submitted}</td>
                  <td>
                    <IdDocBadge status={r.idDocument} />
                  </td>
                  <td>
                    {r.status === "pending" ? (
                      <div className="account-request-actions">
                        <button
                          onClick={() => handleDecision(r.id, "approved")}
                          className="account-request-btn approve"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(r.id, "declined")}
                          className="account-request-btn decline"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`account-request-status-label ${r.status}`}
                      >
                        {r.status === "approved" ? "Approved" : "Declined"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer note */}
          <div className="account-request-footer-note">
            <p>
              Approving a request grants entry to the main system dashboard
              for that account type. Only approve applicants with a verified
              ID document and a legitimate assessor's office role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
