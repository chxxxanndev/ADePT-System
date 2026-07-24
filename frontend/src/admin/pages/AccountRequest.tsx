import { useEffect, useMemo, useState } from "react";
import "../styles/StaffAccounts.css";
import "../styles/AccountRequest.css";
import { addAdminAuditEntry } from '../services/auditLogService';

// ---------- Types ----------
type RequestStatus = "pending" | "approved" | "declined";

interface AccountRequestItem {
  id: string;
  applicantName: string;
  username: string;
  initials: string;
  avatarColor: string; // css class, e.g. "avatar-rose"
  email: string;
  requestedRole: string;
  submitted: string; // display string, e.g. "Jul 14, 8:02 AM"
  status: RequestStatus;
}

const API_BASE_URL = 'http://localhost:5000/api/users';

function formatSubmitted(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toAccountRequestItem(payload: any): AccountRequestItem {
  const fullName = payload.applicantName || `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
  const initials = (fullName || payload.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase() || 'U';

  return {
    id: payload.id,
    applicantName: fullName || payload.username || payload.email,
    username: payload.username || payload.email?.split('@')[0] || '—',
    initials,
    avatarColor: ['avatar-rose', 'avatar-amber', 'avatar-sky', 'avatar-emerald', 'avatar-violet'][Math.abs((payload.id || '').length) % 5],
    email: payload.email,
    requestedRole: payload.requestedRole || 'Office Staff',
    submitted: formatSubmitted(payload.submitted || payload.created_at || new Date().toISOString()),
    status: payload.status === 'approved' ? 'approved' : payload.status === 'declined' ? 'declined' : 'pending',
  };
}

const TABS: { key: RequestStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "declined", label: "Declined" },
];

interface AccountRequestProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
}

export default function AccountRequest({ user }: AccountRequestProps) {
  const [activeTab, setActiveTab] = useState<RequestStatus>("pending");
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<AccountRequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Read the freshest user data directly from localStorage instead of
  // trusting the `user` prop, which can go stale if it was updated
  // elsewhere (e.g. Account Settings) without a shared auth context.
  const storedUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('adept_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const safeUser = storedUser ?? user ?? { firstName: "Admin", lastName: "User", email: "provincialassessor@gmail.com", role: "SUPER_ADMIN" };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/account-requests`);
      if (!res.ok) throw new Error('Unable to load account requests.');
      const data = await res.json();
      const nextRequests = (data.requests || []).map(toAccountRequestItem);
      setRequests(nextRequests);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

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
          r.username.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.requestedRole.toLowerCase().includes(q)
        );
      });
  }, [requests, activeTab, query]);

  async function handleDecision(id: string, decision: "approved" | "declined") {
    const applicant = requests.find((request) => request.id === id);

    try {
      const normalizedDecision = decision === 'declined' ? 'rejected' : decision;
      const res = await fetch(`${API_BASE_URL}/account-requests/${id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: normalizedDecision, reason: decision === 'approved' ? 'Approved by super admin.' : 'Rejected by super admin.' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to complete the decision.');
      }

      addAdminAuditEntry({
        type: decision === 'approved' ? 'approval' : 'decline',
        actor: 'Super Admin',
        description: `${decision === 'approved' ? 'approved' : 'declined'} account request — ${applicant?.applicantName || 'an applicant'}`,
      });

      await loadRequests();
    } catch {
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: decision } : r)));
    }
  }

  return (
    <div className="account-request-page">
      <div className="staff-page-header">
        <div className="staff-page-header-row">
          <div>
            <h1 className="staff-page-title">Account Requests</h1>
            <p className="staff-page-subtitle">
              Review new registrations and decide who can access the system.
            </p>
          </div>

          <div className="admin-profile-widget audit-user-chip">
            <div className="profile-widget-avatar-container">
                {(safeUser.firstName?.[0] ?? 'A')}{(safeUser.lastName?.[0] ?? 'U')}
            </div>
            <div className="profile-widget-info audit-user-info">
                <span className="profile-widget-name audit-user-name">{`${safeUser.firstName || 'Admin'} ${safeUser.lastName || 'User'}`}</span>
                <span className="profile-widget-role">
                    {safeUser.role === 'SUPER_ADMIN' ? 'Super Admin' : safeUser.role === 'OFFICE_STAFF' ? 'Office Staff' : safeUser.role || 'Admin'}
                </span>
            </div>
        </div>
        </div>

        <div className="admin-search-bar">
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search applicants"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="admin-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </div>

      <div className="account-request-content">
        <div className="admin-card staff-accounts-card account-request-card">
          <div className="staff-accounts-header-row account-request-card-header">
            <div className="staff-accounts-title-group">
              <h2 className="admin-card-title">Account Requests</h2>
              {!loading && <span className="active-count-pill">{counts.pending} Pending</span>}
            </div>

            <div className="account-request-card-actions">
              <button
                onClick={() => loadRequests()}
                className="staff-manage-btn"
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

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
                <th>Username</th>
                <th>Email</th>
                <th>Requested role</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="account-request-empty-row">
                    Loading requests...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
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
                  <td className="account-request-cell-muted">{r.username}</td>
                  <td className="account-request-cell-muted">{r.email}</td>
                  <td>{r.requestedRole}</td>
                  <td className="account-request-cell-muted">{r.submitted}</td>
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