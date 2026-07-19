import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  Bell,
  CheckCircle2,
  XCircle,
  Settings2,
  LogIn,
  LogOut,
} from "lucide-react";
import "../styles/AdminAuditLog.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type AuditActionType = "approval" | "decline" | "system" | "login" | "logout";

interface AuditLogEntry {
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
type ActivityFilter = "All activity" | "Approvals" | "Declines" | "System" | "Logins" | "Logouts";

interface CurrentUser {
  name: string;
  role: string;
  initials: string;
}

interface AuditLogProps {
  currentUser?: CurrentUser;
}

/* ------------------------------------------------------------------ */
/*  Mock data — inlined here for now.                                  */
/*  TODO: replace with real data from a useAuditLog hook / API +       */
/*  WebSocket subscription once a backend endpoint exists. If this     */
/*  file grows, consider moving these two arrays back out to a         */
/*  ../data/auditLogMockData.ts file and importing them instead.       */
/* ------------------------------------------------------------------ */
const initialAuditEntries: AuditLogEntry[] = [
  {
    id: "log-001",
    type: "approval",
    actor: "Vicente Desoy",
    description: "approved staff account — John Cruz",
    date: "Today",
    time: "8:40 AM",
  },
  {
    id: "log-002",
    type: "login",
    actor: "John Cruz",
    description: "logged in",
    date: "Today",
    time: "8:41 AM",
  },
  {
    id: "log-003",
    type: "approval",
    actor: "Vicente Desoy",
    description: "approved tax declaration 2026-ADR",
    date: "Today",
    time: "8:12 AM",
  },
  {
    id: "log-004",
    type: "login",
    actor: "Maria Lopez",
    description: "logged in",
    date: "Today",
    time: "7:58 AM",
  },
  {
    id: "log-005",
    type: "decline",
    actor: "Vicente Desoy",
    description: "declined a registration request — Liza Tan",
    date: "Today",
    time: "7:55 AM",
  },
  {
    id: "log-006",
    type: "logout",
    actor: "Anne Reyes",
    description: "logged out",
    date: "Yesterday",
    time: "6:10 PM",
  },
  {
    id: "log-007",
    type: "decline",
    actor: "Vicente Desoy",
    description: "disapproved landholding request 2027-ADR",
    date: "Yesterday",
    time: "5:02 PM",
  },
  {
    id: "log-008",
    type: "login",
    actor: "Dennis Cruz",
    description: "logged in",
    date: "Yesterday",
    time: "3:47 PM",
  },
  {
    id: "log-009",
    type: "system",
    actor: "System",
    description: "Carlo Gomez marked inactive after 90 days",
    date: "Yesterday",
    time: "2:30 PM",
  },
  {
    id: "log-010",
    type: "logout",
    actor: "John Cruz",
    description: "logged out",
    date: "Yesterday",
    time: "1:15 PM",
  },
];

const initialStaffPresence: StaffPresence[] = [
  {
    id: "staff-001",
    name: "John Cruz",
    role: "Records Officer",
    initials: "JC",
    avatarColor: "#29237A",
    online: true,
    lastSeen: "Just now",
  },
  {
    id: "staff-002",
    name: "Maria Lopez",
    role: "Front Desk Staff",
    initials: "ML",
    avatarColor: "#00BCD4",
    online: true,
    lastSeen: "Just now",
  },
  {
    id: "staff-003",
    name: "Anne Reyes",
    role: "Assessment Staff",
    initials: "AR",
    avatarColor: "#1976D2",
    online: false,
    lastSeen: "Yesterday, 6:10 PM",
  },
  {
    id: "staff-004",
    name: "Dennis Cruz",
    role: "Encoder",
    initials: "DC",
    avatarColor: "#4CAF50",
    online: true,
    lastSeen: "Just now",
  },
  {
    id: "staff-005",
    name: "Ana Marquez",
    role: "Encoder",
    initials: "AM",
    avatarColor: "#607D8B",
    online: false,
    lastSeen: "Today, 11:20 AM",
  },
];

const DEFAULT_USER: CurrentUser = {
  name: "Vicente Desoy",
  role: "Super admin",
  initials: "VD",
};

const ACTIVITY_FILTER_TO_TYPE: Record<ActivityFilter, AuditActionType | null> = {
  "All activity": null,
  Approvals: "approval",
  Declines: "decline",
  System: "system",
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
  const [entries] = useState<AuditLogEntry[]>(initialAuditEntries);
  const [staffPresence, setStaffPresence] = useState<StaffPresence[]>(initialStaffPresence);

  // ---- Simulated real-time presence updates ----
  // Replace this interval with a WebSocket/SSE subscription or a short poll
  // against a real presence endpoint once the backend supports it.
  useEffect(() => {
    const interval = setInterval(() => {
      setStaffPresence((prev) =>
        prev.map((staff) => {
          const shouldToggle = Math.random() < 0.15;
          if (!shouldToggle) return staff;
          const nowOnline = !staff.online;
          return {
            ...staff,
            online: nowOnline,
            lastSeen: "Just now",
          };
        })
      );
    }, 5000);
    return () => clearInterval(interval);
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
      <div className="audit-log-container">
        {/* Top bar */}
        <div className="audit-topbar">
          <div>
            <h1 className="audit-title">Audit log</h1>
            <p className="audit-subtitle">
              A record of every approval, decline, and system action.
            </p>
          </div>
          <div className="audit-topbar-actions">
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
            <button className="audit-notif-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="audit-notif-dot" />
            </button>
            <div className="audit-user-chip">
              <div className="audit-user-avatar">{currentUser.initials}</div>
              <div className="audit-user-info">
                <p className="audit-user-name">{currentUser.name}</p>
                <p className="audit-user-role">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
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
                  <option>System</option>
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