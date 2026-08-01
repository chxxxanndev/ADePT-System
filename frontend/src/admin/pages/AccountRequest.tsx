import { useEffect, useMemo, useState } from "react";
import "../styles/StaffAccounts.css";
import "../styles/AccountRequest.css";
import { addAdminAuditEntry } from '../services/auditLogService';
// 1. Updated Imports: removed authHeaders, added api
import { api } from '../../users/services/requestService';
import { useAuth } from "../../users/hooks/useAuth";

// ---------- Types ----------
type RequestStatus = "pending" | "approved" | "disapproved";

interface AccountRequestItem {
  id: string;
  applicantName: string;
  username: string;
  initials: string;
  avatarColor: string; 
  email: string;
  requestedRole: string;
  submitted: string; 
  status: RequestStatus;
  decidedOn: string | null;
  accountStatus: string | null;
}

// 2. Removed hardcoded API_BASE_URL

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

  const status: RequestStatus =
    payload.status === 'approved' ? 'approved'
      : payload.status === 'declined' || payload.status === 'disapproved' || payload.status === 'rejected' ? 'disapproved'
      : 'pending';

  return {
    id: payload.id,
    applicantName: fullName || payload.username || payload.email,
    username: payload.username || payload.email?.split('@')[0] || '—',
    initials,
    avatarColor: ['avatar-rose', 'avatar-amber', 'avatar-sky', 'avatar-emerald', 'avatar-violet'][Math.abs((payload.id || '').length) % 5],
    email: payload.email,
    requestedRole: payload.requestedRole || 'Office Staff',
    submitted: formatSubmitted(payload.submitted || payload.created_at || new Date().toISOString()),
    status,
    decidedOn: payload.decided_at || payload.reviewed_at
      ? formatSubmitted(payload.decided_at || payload.reviewed_at)
      : null,
    accountStatus: status === 'approved' ? (payload.account_status || 'ACTIVE') : null,
  };
}

const TABS: { key: RequestStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "disapproved", label: "Disapproved" },
];

interface AccountRequestProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    adminLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    id?: string;
    avatarUrl?: string;
  };
}

export default function AccountRequest({ user }: AccountRequestProps) {
  const [activeTab, setActiveTab] = useState<RequestStatus>("pending");
  const [query, setQuery] = useState("");
  const [requests, setRequests] = useState<AccountRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const safeUser = currentUser ?? user ?? { firstName: "Admin", lastName: "User", email: "provincialassessor@gmail.com", role: "SUPER_ADMIN" };

  /**
   * 3. Updated loadRequests to use standardized 'api'
   */
  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/account-requests');
      const nextRequests = (res.data.requests || []).map(toAccountRequestItem);
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
      disapproved: requests.filter((r) => r.status === "disapproved").length,
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

  /**
   * 4. Updated handleDecision to use standardized 'api'
   */
  async function handleDecision(id: string, decision: "approved" | "disapproved") {
    if (decidingId) return; 
    const applicant = requests.find((request) => request.id === id);
    setDecidingId(id);

    try {
      const normalizedDecision = decision === 'disapproved' ? 'rejected' : decision;
      
      // Using api.patch handles the headers, URL, and stringifying automatically
      await api.patch(`/users/account-requests/${id}/decision`, { 
        decision: normalizedDecision, 
        reason: decision === 'approved' ? 'Approved by super admin.' : 'Disapproved by super admin.' 
      });

      await addAdminAuditEntry({
        type: decision === 'approved' ? 'approval' : 'decline',
        description: `${decision === 'approved' ? 'approved' : 'disapproved'} account request — ${applicant?.applicantName || 'an applicant'}`,
      }).catch((err) => console.error('Audit log write failed:', err));

      window.dispatchEvent(new Event('staff-directory:updated'));
      await loadRequests();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save the decision.';
      alert(errorMsg);
    } finally {
      setDecidingId(null);
    }
  }

  // ... (rest of your component JSX stays exactly the same)
  return (
    <div className="account-request-page">
      {/* ... keeping all original JSX ... */}
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
                {safeUser.avatarUrl ? (
                  <img
                    src={safeUser.avatarUrl}
                    alt={`${safeUser.firstName || 'Admin'} ${safeUser.lastName || 'User'}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : (
                  <>{(safeUser.firstName?.[0] ?? 'A')}{(safeUser.lastName?.[0] ?? 'U')}</>
                )}
            </div>
            <div className="profile-widget-info audit-user-info">
                <span className="profile-widget-name audit-user-name">{`${safeUser.firstName || 'Admin'} ${safeUser.lastName || 'User'}`}</span>
                <span className="profile-widget-role">
                    {safeUser.role === 'SUPER_ADMIN' ? 'Super Admin' : safeUser.role === 'ADMIN' ? `Admin · ${safeUser.adminLevel || ''}` : safeUser.role || 'Admin'}
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

          <table className="account-request-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Username</th>
                <th>Email</th>
                <th>Requested role</th>
                <th>Submitted</th>
                {activeTab !== 'pending' && <th>Decided on</th>}
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={activeTab !== 'pending' ? 7 : 6} className="account-request-empty-row">
                    Loading requests...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={activeTab !== 'pending' ? 7 : 6} className="account-request-empty-row">
                    No {activeTab} requests to show.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="account-request-applicant-name">
                      {r.applicantName}
                    </span>
                  </td>
                  <td className="account-request-cell-muted">{r.username}</td>
                  <td className="account-request-cell-muted">{r.email}</td>
                  <td>{r.requestedRole}</td>
                  <td className="account-request-cell-muted">{r.submitted}</td>
                  {activeTab !== 'pending' && (
                    <td className="account-request-cell-muted">{r.decidedOn || '—'}</td>
                  )}
                  <td>
                    {r.status === "pending" ? (
                      <div className="account-request-actions">
                        <button
                          onClick={() => handleDecision(r.id, "approved")}
                          className="account-request-btn approve"
                          disabled={decidingId === r.id}
                        >
                          {decidingId === r.id ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDecision(r.id, "disapproved")}
                          className="account-request-btn decline"
                          disabled={decidingId === r.id}
                        >
                          {decidingId === r.id ? 'Declining…' : 'Disapprove'}
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`account-request-status-label ${r.status}`}
                      >
                        {r.status === "approved" ? "Approved" : "Disapproved"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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