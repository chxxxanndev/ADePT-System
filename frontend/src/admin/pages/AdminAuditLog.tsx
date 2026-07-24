import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Settings2,
  LogIn,
  LogOut,
} from "lucide-react";
import "../styles/AdminAuditLog.css";
import { clearStoredAuditEntries, getStoredAuditEntries, type AuditLogEntry as StoredAuditLogEntry } from '../services/auditLogService';
import { fetchAllStaff, type StaffMember } from '../services/userManagementService';
import { supabase, STAFF_PRESENCE_CHANNEL } from '../services/supabaseClient';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type AuditActionType = "approval" | "decline" | "system" | "login" | "logout";

interface AuditLogEntry extends StoredAuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  description: string;
  date: string; // 'Today', 'Yesterday', or an explicit date label
  time: string; // '8:40 AM'
}

interface StaffPresence {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarColor: string;
  online: boolean;
  lastSeen: string; // 'Just now', '12 min ago', 'Yesterday, 5:02 PM'
}

type TimeRange = "Today" | "This Week" | "This Month" | "All Time";
type ActivityFilter = "All activity" | "Approvals" | "Declines" | "Logins" | "Logouts";

interface CurrentUser {
  name: string;
  role: string;
  initials: string;
}

interface AuditLogProps {
  currentUser?: CurrentUser;
}

const DEFAULT_USER: CurrentUser = {
  name: "Vicente Desoy",
  role: "Super admin",
  initials: "VD",
};

const ACTIVITY_FILTER_TO_TYPE: Record<ActivityFilter, AuditActionType | null> = {
  "All activity": null,
  Approvals: "approval",
  Declines: "decline",
  Logins: "login",
  Logouts: "logout",
};

const ICON_MAP: Record<AuditActionType, React.ReactNode> = {
  approval: <CheckCircle2 size={16} />,
  decline: <XCircle size={16} />,
  system: <Settings2 size={16} />,
  login: <LogIn size={16} />,
  logout: <LogOut size={16} />,
};

const ICON_CLASS_MAP: Record<AuditActionType, string> = {
  approval: "audit-icon--approval",
  decline: "audit-icon--decline",
  system: "audit-icon--system",
  login: "audit-icon--login",
  logout: "audit-icon--logout",
};

/* ------------------------------------------------------------------ */
/*  Small building blocks                                             */
/* ------------------------------------------------------------------ */
function AuditRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="audit-row">
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
    </div>
  );
}

function PresenceRow({ staff }: { staff: StaffPresence }) {
  return (
    <div className="presence-row">
      <div className="presence-avatar-wrap">
        <div className="presence-avatar" style={{ backgroundColor: staff.avatarColor }}>
          {staff.initials}
        </div>
        <span className={`presence-dot${staff.online ? " presence-dot--online" : ""}`} />
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

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export function AdminAuditLog({ currentUser = DEFAULT_USER }: AuditLogProps) {
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("Today");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All activity");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [entries, setEntries] = useState<AuditLogEntry[]>(() => getStoredAuditEntries());
  const [staffPresence, setStaffPresence] = useState<StaffPresence[]>([]);

  // ---- Real presence via Supabase Realtime ----
  // This channel only *listens*; the actual "I'm online" announcement
  // happens wherever useOnlinePresence(user) is mounted (AdminDashboard.tsx).
  useEffect(() => {
    let isMounted = true;
    const channel = supabase.channel(STAFF_PRESENCE_CHANNEL);

    // NOTE: presence keys are each user's Supabase Auth id (see
    // useOnlinePresence.ts). For this to match correctly, StaffMember /
    // fetchAllStaff() needs to expose each row's `auth_user_id` — the
    // fallback to `member.id` below only works if your staff table's
    // primary key happens to equal the auth user id.
    const applyPresenceState = () => {
      const state = channel.presenceState();
      const onlineIds = new Set(Object.keys(state));
      setStaffPresence((prev) =>
        prev.map((s) => ({
          ...s,
          online: onlineIds.has(s.id),
          lastSeen: onlineIds.has(s.id) ? "Just now" : s.lastSeen,
        }))
      );
    };

    channel
      .on("presence", { event: "sync" }, applyPresenceState)
      .on("presence", { event: "join" }, applyPresenceState)
      .on("presence", { event: "leave" }, applyPresenceState)
      .subscribe();

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
            id: member.auth_user_id || member.id,
            name: fullName || member.username || member.email,
            role,
            initials,
            avatarColor: ['#3D2E7C', '#00BCD4', '#1976D2', '#4CAF50', '#607D8B'][index % 5],
            online: false, // corrected immediately by applyPresenceState() below
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

    const handleAuditUpdate = () => {
      setEntries(getStoredAuditEntries());
    };

    // Fired by StaffAccounts.tsx right after an activate/deactivate call
    // succeeds, so the roster (names/roles) refetches immediately too.
    const handleStaffDirectoryUpdate = () => {
      void loadStaffPresence();
    };

    void loadStaffPresence();
    window.addEventListener('admin-audit-log:updated', handleAuditUpdate);
    window.addEventListener('staff-directory:updated', handleStaffDirectoryUpdate);
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('admin-audit-log:updated', handleAuditUpdate);
      window.removeEventListener('staff-directory:updated', handleStaffDirectoryUpdate);
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const typeFilter = ACTIVITY_FILTER_TO_TYPE[activityFilter];
    return entries.filter((entry) => {
      const matchesType = typeFilter === null || entry.type === typeFilter;
      const matchesSearch =
        search.trim() === "" ||
        entry.actor.toLowerCase().includes(search.toLowerCase()) ||
        entry.description.toLowerCase().includes(search.toLowerCase());
      const matchesTimeRange =
        timeRange === "All Time" ||
        entry.date === timeRange ||
        (timeRange === "Today" && entry.date === "Today");
      return matchesType && matchesSearch && matchesTimeRange;
    });
  }, [entries, search, timeRange, activityFilter]);

  const onlineCount = staffPresence.filter((s) => s.online).length;

  return (
    <div className="audit-log-page">
      {/* Page header: title/subtitle + profile chip, then toolbar */}
      <div className="audit-page-header">
        <div className="audit-page-header-row">
          <div>
            <h1 className="audit-page-title">Audit log</h1>
            <p className="audit-page-subtitle">
              A record of every account approval, decline, login, and logout.
            </p>
          </div>
          <div className="audit-user-chip">
            <div className="audit-user-avatar">{currentUser.initials}</div>
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
        </div>
      </div>

      {showFilterMenu && (
        <div className="audit-filter-menu">
          <button className="audit-filter-chip" onClick={() => { setActivityFilter('All activity'); setShowFilterMenu(false); }} type="button">All activity</button>
          <button className="audit-filter-chip" onClick={() => { setActivityFilter('Approvals'); setShowFilterMenu(false); }} type="button">Approvals</button>
          <button className="audit-filter-chip" onClick={() => { setActivityFilter('Declines'); setShowFilterMenu(false); }} type="button">Declines</button>
          <button className="audit-filter-chip" onClick={() => { setActivityFilter('Logins'); setShowFilterMenu(false); }} type="button">Logins</button>
          <button className="audit-filter-chip" onClick={() => { setActivityFilter('Logouts'); setShowFilterMenu(false); }} type="button">Logouts</button>
          <button className="audit-filter-chip audit-filter-chip--danger" onClick={() => { clearStoredAuditEntries(); setEntries([]); setShowFilterMenu(false); }} type="button">Clear audit entries</button>
        </div>
      )}

      {/* Scrollable content area — mirrors account-request-content */}
      <div className="audit-log-content">
        <div className="audit-content-grid">
          {/* Audit log card */}
          <div className="audit-card">
            <div className="audit-card-header">
              <h2 className="audit-card-title">Audit log</h2>
              <div className="audit-select-field">
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
                  className="audit-select"
                >
                  <option>All activity</option>
                  <option>Approvals</option>
                  <option>Declines</option>
                  <option>Logins</option>
                  <option>Logouts</option>
                </select>
                <ChevronDown size={14} className="audit-select-chevron" />
              </div>
            </div>

            <div className="audit-row-list">
              {filteredEntries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
              {filteredEntries.length === 0 && (
                <div className="audit-empty">No records match your search or filter.</div>
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
              {staffPresence.map((staff) => (
                <PresenceRow key={staff.id} staff={staff} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAuditLog;