import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Settings2,
  LogIn,
  LogOut,
  UploadCloud,
  Printer,
  UserCheck,
  UserX,
  ArrowUpCircle,
  ArrowDownCircle,
  X,
  Clock,
  FileX,
  Archive,
  Send,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import "../styles/AdminAuditLog.css";
import { getAuditLog, type AuditLogEntry as StoredAuditLogEntry, type AuditActionType } from '../services/auditLogService';
import { fetchAllStaff, fetchStaffPerformance, type StaffMember, type StaffPerformanceItem } from '../services/userManagementService';
import { onStaffPresence, getStaffPresenceChannel } from '../services/staffPresenceChannel';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AuditLogEntry extends StoredAuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  description: string;
  date: string; // 'Today', 'Yesterday', or an explicit date label
  time: string; // '8:40 AM'
  timestamp?: number; // epoch ms, if the source ever stamps it — used for sorting when present
}

interface StaffPresence {
  id: string;            // stable key for React + display
  authUserId?: string;   // separate field used specifically for presence matching
  name: string;
  role: string;
  initials: string;
  avatarColor: string;
  online: boolean;
  accountActive: boolean;
  lastSeen: string; // 'Just now', 'Offline', 'Inactive account'
}

type TimeRange = "Today" | "This Week" | "This Month" | "All Time";

type StaffActivityFilter =
  | "All Staff Activity"
  | "Logins"
  | "Logouts"
  | "Document Uploads"
  | "Reports Printed"
  | "Pending Documents"
  | "Voided Documents"
  | "Archived Documents"
  | "Released Documents";

type AdminActivityFilter =
  | "All Admin Activity"
  | "Approvals"
  | "Declines"
  | "Account Activations"
  | "Account Deactivations"
  | "Promotions"
  | "Demotions";

interface CurrentUser {
  name: string;
  role: string;
  initials: string;
  avatarUrl?: string;
}

interface AuditLogProps {
  currentUser?: CurrentUser;
}

const DEFAULT_USER: CurrentUser = {
  name: "Vicente Desoy",
  role: "Super admin",
  initials: "VD",
};

/* ------------------------------------------------------------------ */
/*  Activity taxonomy                                                  */
/* ------------------------------------------------------------------ */
const STAFF_ACTIVITY_TYPES: AuditActionType[] = [
  'login',
  'logout',
  'document_upload',
  'report_print',
  'document_pending',
  'document_voided',
  'document_archived',
  'document_released',
];

const ADMIN_ACTIVITY_TYPES: AuditActionType[] = [
  'approval',
  'decline',
  'account_activate',
  'account_deactivate',
  'staff_promote',
  'staff_demote',
];

const STAFF_FILTER_TO_TYPE: Record<StaffActivityFilter, AuditActionType | null> = {
  "All Staff Activity": null,
  Logins: 'login',
  Logouts: 'logout',
  "Document Uploads": 'document_upload',
  "Reports Printed": 'report_print',
  "Pending Documents": 'document_pending',
  "Voided Documents": 'document_voided',
  "Archived Documents": 'document_archived',
  "Released Documents": 'document_released',
};

const ADMIN_FILTER_TO_TYPE: Record<AdminActivityFilter, AuditActionType | null> = {
  "All Admin Activity": null,
  Approvals: 'approval',
  Declines: 'decline',
  "Account Activations": 'account_activate',
  "Account Deactivations": 'account_deactivate',
  Promotions: 'staff_promote',
  Demotions: 'staff_demote',
};

// Human-readable label for the type shown in the detail popup header.
const TYPE_LABELS: Record<AuditActionType, string> = {
  login: "Login",
  logout: "Logout",
  document_upload: "Documents Uploaded",
  report_print: "Report Printed",
  document_pending: "Pending Document Request",
  document_voided: "Document Voided",
  document_archived: "Document Archived",
  document_released: "Document Released",
  approval: "Account Request Approved",
  decline: "Account Request Declined",
  account_activate: "Staff Account Activated",
  account_deactivate: "Staff Account Deactivated",
  staff_promote: "Staff Promoted",
  staff_demote: "Admin Demoted",
  system: "System Event",
};

const ICON_MAP: Record<AuditActionType, React.ReactNode> = {
  login: <LogIn size={16} />,
  logout: <LogOut size={16} />,
  document_upload: <UploadCloud size={16} />,
  report_print: <Printer size={16} />,
  document_pending: <Clock size={16} />,
  document_voided: <FileX size={16} />,
  document_archived: <Archive size={16} />,
  document_released: <Send size={16} />,
  approval: <CheckCircle2 size={16} />,
  decline: <XCircle size={16} />,
  account_activate: <UserCheck size={16} />,
  account_deactivate: <UserX size={16} />,
  staff_promote: <ArrowUpCircle size={16} />,
  staff_demote: <ArrowDownCircle size={16} />,
  system: <Settings2 size={16} />,
};

const ICON_CLASS_MAP: Record<AuditActionType, string> = {
  login: "audit-icon--login",
  logout: "audit-icon--logout",
  document_upload: "audit-icon--document-upload",
  report_print: "audit-icon--report-print",
  document_pending: "audit-icon--document-pending",
  document_voided: "audit-icon--document-voided",
  document_archived: "audit-icon--document-archived",
  document_released: "audit-icon--document-released",
  approval: "audit-icon--approval",
  decline: "audit-icon--decline",
  account_activate: "audit-icon--account-activate",
  account_deactivate: "audit-icon--account-deactivate",
  staff_promote: "audit-icon--staff-promote",
  staff_demote: "audit-icon--staff-demote",
  system: "audit-icon--system",
};

/* ------------------------------------------------------------------ */
/*  Sorting helper                                                     */
/* ------------------------------------------------------------------ */
/**
 * Returns a sortable epoch-ms value for an entry. Prefers a real
 * `timestamp` if the entry has one; otherwise falls back to parsing
 * the display `date` ('Today' / 'Yesterday' / explicit date) + `time`
 * ('8:40 AM') strings. The fallback only has minute precision, so
 * same-minute entries may tie — for exact ordering, stamp
 * `timestamp: Date.now()` when entries are created in auditLogService.
 */
function getEntrySortValue(entry: AuditLogEntry): number {
  if (typeof entry.timestamp === "number" && !Number.isNaN(entry.timestamp)) {
    return entry.timestamp;
  }

  const now = new Date();
  let base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (entry.date === "Yesterday") {
    base.setDate(base.getDate() - 1);
  } else if (entry.date !== "Today") {
    const parsed = new Date(entry.date);
    if (!Number.isNaN(parsed.getTime())) {
      base = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  const match = entry.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const isPM = match[3].toUpperCase() === "PM";
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    base.setHours(hours, minutes, 0, 0);
  }

  return base.getTime();
}

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function AuditRow({ entry, onSelect }: { entry: AuditLogEntry; onSelect: (entry: AuditLogEntry) => void }) {
  return (
    <button type="button" className="audit-row audit-row--clickable" onClick={() => onSelect(entry)}>
      <div className={`audit-icon ${ICON_CLASS_MAP[entry.type]}`}>
        {ICON_MAP[entry.type]}
      </div>
      <div className="audit-row-body">
        <p className="audit-row-title">
          <span className="audit-row-actor">{entry.actor}</span> {entry.description}
        </p>
        <p className="audit-row-timestamp">
          {entry.date}, {entry.time}
        </p>
      </div>
    </button>
  );
}

function PresenceRow({ staff }: { staff: StaffPresence }) {
  const dotClass = !staff.accountActive
    ? '' // no dot for inactive accounts
    : staff.online
      ? ' presence-dot--online'
      : ' presence-dot--offline';

  return (
    <div className="presence-row">
      <div className="presence-avatar-wrap">
        <div className="presence-avatar" style={{ backgroundColor: staff.avatarColor }}>
          {staff.initials}
        </div>
        {staff.accountActive && <span className={`presence-dot${dotClass}`} />}
      </div>
      <div className="presence-info">
        <p className="presence-name">{staff.name}</p>
        <p className="presence-role">{staff.role}</p>
      </div>
      <span className={`presence-status${staff.online ? " presence-status--online" : ""}`}>
        {staff.online ? "Online" : staff.lastSeen}
      </span>
    </div>
  );
}

/**
 * Popup shown when an audit row is clicked. Shows the full context:
 * actor, type, timestamp, the row's description, and — if the entry
 * carries a `details` payload — every key/value pair in it.
 */
function AuditDetailModal({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  const detailEntries = entry.details ? Object.entries(entry.details) : [];

  return (
    <div className="audit-modal-overlay" role="presentation" onClick={onClose}>
      <div className="audit-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="audit-modal-header">
          <div className="audit-modal-header-info">
            <div className={`audit-icon ${ICON_CLASS_MAP[entry.type]}`}>
              {ICON_MAP[entry.type]}
            </div>
            <div>
              <p className="audit-modal-title">{TYPE_LABELS[entry.type]}</p>
              <p className="audit-modal-timestamp">{entry.date}, {entry.time}</p>
            </div>
          </div>
          <button type="button" className="audit-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="audit-modal-section">
          <div className="audit-modal-field">
            <p className="audit-modal-label">Actor</p>
            <p className="audit-modal-value">{entry.actor}</p>
          </div>
          <div className="audit-modal-field">
            <p className="audit-modal-label">Description</p>
            <p className="audit-modal-value">{entry.actor} {entry.description}</p>
          </div>
        </div>

        {detailEntries.length > 0 && (
          <div className="audit-modal-section">
            {detailEntries.map(([label, value]) => (
              <div key={label} className="audit-modal-field">
                <p className="audit-modal-label">{label}</p>
                <p className="audit-modal-value">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffPerformanceCard() {
  const [items, setItems] = useState<StaffPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchStaffPerformance();
      setItems(data);
    } catch {
      /* silently keep last known state */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const maxRequests = items[0]?.requests ?? 1;

  return (
    <div className="audit-card perf-fullwidth-card">
      <div className="audit-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 className="audit-card-title">Staff Performance</h2>
        </div>
        <button
          type="button"
          className={`perf-refresh-btn ${refreshing ? 'perf-refresh-btn--spinning' : ''}`}
          onClick={() => load(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <span className="perf-pill">Ranked by Requests Handled</span>

      {loading && <div className="audit-empty">Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="audit-empty">No performance data available yet.</div>
      )}

      {!loading && items.length > 0 && (
        <div className="perf-fullwidth-grid">
          {items.map((staff, index) => (
            <div key={staff.id} className="perf-row perf-row--card">
              <div className="perf-rank">{index + 1}</div>
              <div
                className="perf-avatar"
                style={{ backgroundColor: staff.avatarBg }}
              >
                {staff.initials}
              </div>
              <div className="perf-info">
                <div className="perf-name-row">
                  <span className="perf-name">{staff.name}</span>
                  <span className="perf-count">{staff.requests} req</span>
                </div>
                <div className="perf-bar-bg">
                  <div
                    className="perf-bar-fill"
                    style={{
                      width: `${maxRequests > 0 ? (staff.requests / maxRequests) * 100 : 0}%`,
                      backgroundColor: staff.avatarBg,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export function AdminAuditLog({ currentUser = DEFAULT_USER }: AuditLogProps) {
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("Today");
  const [staffFilter, setStaffFilter] = useState<StaffActivityFilter>("All Staff Activity");
  const [adminFilter, setAdminFilter] = useState<AdminActivityFilter>("All Admin Activity");
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [staffPresence, setStaffPresence] = useState<StaffPresence[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  // ---- Real presence via Supabase Realtime ----
  // This component only *listens* to the shared presence channel; the
  // actual "I'm online" announcement happens in useOnlinePresence(user),
  // mounted higher up in AdminDashboard.tsx. Both consumers go through the
  // staffPresenceChannel singleton, so it doesn't matter which one mounts
  // first or creates the underlying channel.
  useEffect(() => {
    let isMounted = true;

    const applyPresenceState = () => {
      const ch = getStaffPresenceChannel();
      const state = ch.presenceState();

      // Only trust `user_id` — this is the field useOnlinePresence.ts
      // actually tracks. (Avoid also reading `p.id`: Supabase presence
      // payloads carry internal fields like presence_ref that can
      // coincidentally collide with staff row ids and produce false
      // "online" matches.)
      const onlineUserIds = new Set<string>();
      Object.values(state)
        .flat()
        .forEach((p: any) => {
          if (p.user_id) onlineUserIds.add(String(p.user_id));
        });

      setStaffPresence((prev) =>
        prev.map((s) => {
          // Match against both possible id fields for this staff row,
          // since we don't rely on a single fallback id chosen once
          // at roster-build time.
          const isOnline =
            onlineUserIds.has(String(s.id)) ||
            (!!s.authUserId && onlineUserIds.has(String(s.authUserId)));
          return {
            ...s,
            online: isOnline,
            lastSeen: isOnline ? "Just now" : (s.accountActive ? "Offline" : "Inactive account"),
          };
        })
      );
    };

    const offSync = onStaffPresence('sync', applyPresenceState);
    const offJoin = onStaffPresence('join', applyPresenceState);
    const offLeave = onStaffPresence('leave', applyPresenceState);

    const loadStaffPresence = async () => {
      try {
        const staffMembers = await fetchAllStaff();
        const nextStaffPresence = staffMembers.map((member: StaffMember, index: number) => {
          const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
          const initials = fullName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'ST';
          const role = member.roles?.code === 'SUPER_ADMIN'
            ? 'Super Admin'
            : member.roles?.code === 'OFFICE_STAFF'
              ? 'Office Staff'
              : 'Staff';

          return {
            id: member.id,
            authUserId: member.auth_user_id,
            name: fullName || member.username || member.email,
            role,
            initials,
            avatarColor: ['#3D2E7C', '#00BCD4', '#1976D2', '#4CAF50', '#607D8B'][index % 5],
            online: false, // corrected immediately by applyPresenceState() below
            accountActive: member.account_status === 'ACTIVE',
            lastSeen: member.account_status === 'ACTIVE' ? 'Offline' : 'Inactive account',
          } satisfies StaffPresence;
        });
        if (isMounted) {
          setStaffPresence(nextStaffPresence);
          applyPresenceState(); // reflect anyone already connected right now
        }
      } catch {
        if (isMounted) setStaffPresence([]);
      }
    };

    const loadEntries = async () => {
      try {
        const nextEntries = await getAuditLog();
        if (isMounted) {
          setEntries(nextEntries);
          setEntriesError(null);
        }
      } catch (err) {
        if (isMounted) {
          setEntries([]);
          setEntriesError(err instanceof Error ? err.message : 'Failed to load the audit log.');
        }
      } finally {
        if (isMounted) setEntriesLoading(false);
      }
    };

    const handleAuditUpdate = () => {
      void loadEntries();
    };

    // Fired by StaffAccounts.tsx right after an activate/deactivate call
    // succeeds, so the roster (names/roles) refetches immediately too.
    const handleStaffDirectoryUpdate = () => {
      void loadStaffPresence();
    };

    void loadStaffPresence();
    void loadEntries();
    window.addEventListener('admin-audit-log:updated', handleAuditUpdate);
    window.addEventListener('staff-directory:updated', handleStaffDirectoryUpdate);

    return () => {
      isMounted = false;
      offSync();
      offJoin();
      offLeave();
      // Don't remove the shared channel here — useOnlinePresence (or another
      // consumer) may still depend on it. The singleton owns its own lifecycle.
      window.removeEventListener('admin-audit-log:updated', handleAuditUpdate);
      window.removeEventListener('staff-directory:updated', handleStaffDirectoryUpdate);
    };
  }, []);

  // Base filter shared by both cards: respect the search box + time range picked in the toolbar.
  const baseFilteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        search.trim() === "" ||
        entry.actor.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase());
      const matchesTimeRange = timeRange === "All Time" || entry.date === timeRange || (timeRange === "Today" && entry.date === "Today");
      return matchesSearch && matchesTimeRange;
    });
  }, [entries, search, timeRange]);

  const staffEntries = useMemo(() => {
    const typeFilter = STAFF_FILTER_TO_TYPE[staffFilter];
    return baseFilteredEntries
      .filter((entry) => STAFF_ACTIVITY_TYPES.includes(entry.type) && (typeFilter === null || entry.type === typeFilter))
      .sort((a, b) => getEntrySortValue(b) - getEntrySortValue(a));
  }, [baseFilteredEntries, staffFilter]);

  const adminEntries = useMemo(() => {
    const typeFilter = ADMIN_FILTER_TO_TYPE[adminFilter];
    return baseFilteredEntries
      .filter((entry) => ADMIN_ACTIVITY_TYPES.includes(entry.type) && (typeFilter === null || entry.type === typeFilter))
      .sort((a, b) => getEntrySortValue(b) - getEntrySortValue(a));
  }, [baseFilteredEntries, adminFilter]);

  // Staff Online Now should also reflect staff/admin only, not the super admin.
  const visibleStaffPresence = useMemo(
    () => staffPresence.filter((s) => s.role !== 'Super Admin'),
    [staffPresence]
  );

  const onlineCount = visibleStaffPresence.filter((s) => s.online).length;

  return (
    <div className="audit-log-page">
      {/* Page header: title/subtitle + profile chip, then toolbar */}
      <div className="audit-page-header">
        <div className="audit-page-header-row">
          <div>
            <h1 className="audit-page-title">Audit log</h1>
            <p className="audit-page-subtitle">
              A record of every staff and admin action — logins, assessments, uploads, and account changes.
            </p>
          </div>
          <div className="audit-user-chip">
            <div className="audit-user-avatar">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                currentUser.initials
              )}
            </div>
            <div className="audit-user-info">
              <p className="audit-user-name">{currentUser.name}</p>
              <p className="audit-user-role">{currentUser.role}</p>
            </div>
          </div>
        </div>

        <div className="audit-toolbar">
          <div className="audit-search-field">
            <Search size={16} className="audit-search-icon" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records"
              className="audit-search-input"
            />
          </div>
          <div className="audit-select-field">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="audit-select"
            >
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
            <ChevronDown size={14} className="audit-select-chevron" />
          </div>
          <button
            type="button"
            className="audit-filter-btn"
            onClick={() => window.dispatchEvent(new Event('admin-audit-log:updated'))}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Scrollable content area — mirrors account-request-content */}
      <div className="audit-log-content">
        <div className="audit-content-grid">
          {/* Staff activity card */}
          <div className="audit-card">
            <div className="audit-card-header">
              <h2 className="audit-card-title">Staff Activity Log</h2>
              <div className="audit-select-field">
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value as StaffActivityFilter)}
                  className="audit-select"
                >
                  <option>All Staff Activity</option>
                  <option>Logins</option>
                  <option>Logouts</option>
                  <option>Document Uploads</option>
                  <option>Reports Printed</option>
                  <option>Pending Documents</option>
                  <option>Voided Documents</option>
                  <option>Archived Documents</option>
                  <option>Released Documents</option>
                </select>
                <ChevronDown size={14} className="audit-select-chevron" />
              </div>
            </div>

            <div className="audit-row-list">
              {staffEntries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} onSelect={setSelectedEntry} />
              ))}
              {entriesLoading && (
                <div className="audit-empty">Loading…</div>
              )}
              {!entriesLoading && entriesError && (
                <div className="audit-empty">{entriesError}</div>
              )}
              {!entriesLoading && !entriesError && staffEntries.length === 0 && (
                <div className="audit-empty">No staff activity matches your search or filter.</div>
              )}
            </div>
          </div>

          {/* Admin activity card */}
          <div className="audit-card">
            <div className="audit-card-header">
              <h2 className="audit-card-title">Admin Activity Log</h2>
              <div className="audit-select-field">
                <select
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value as AdminActivityFilter)}
                  className="audit-select"
                >
                  <option>All Admin Activity</option>
                  <option>Approvals</option>
                  <option>Declines</option>
                  <option>Account Activations</option>
                  <option>Account Deactivations</option>
                  <option>Promotions</option>
                  <option>Demotions</option>
                </select>
                <ChevronDown size={14} className="audit-select-chevron" />
              </div>
            </div>

            <div className="audit-row-list">
              {adminEntries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} onSelect={setSelectedEntry} />
              ))}
              {entriesLoading && (
                <div className="audit-empty">Loading…</div>
              )}
              {!entriesLoading && entriesError && (
                <div className="audit-empty">{entriesError}</div>
              )}
              {!entriesLoading && !entriesError && adminEntries.length === 0 && (
                <div className="audit-empty">No admin activity matches your search or filter.</div>
              )}
            </div>
          </div>

          {/* Staff online now panel */}
          <div className="presence-card">
            <div className="presence-card-header">
              <h2 className="presence-card-title">Staff Online Now</h2>
              <span className="presence-count">{onlineCount} online</span>
            </div>
            <div className="presence-list">
              {visibleStaffPresence.map((staff) => (
                <PresenceRow key={staff.id} staff={staff} />
              ))}
            </div>
          </div>
        </div>

        {/* Staff Performance card — full width below the 3-column grid */}
        <StaffPerformanceCard />
      </div>

      {selectedEntry && (
        <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

export default AdminAuditLog;