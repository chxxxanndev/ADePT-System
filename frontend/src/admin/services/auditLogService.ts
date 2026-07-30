export type AuditActionType =
  // Staff Activities
  | 'login'
  | 'logout'
  | 'assessment_submit'
  | 'assessment_edit'
  | 'document_upload'
  | 'report_print'
  // Admin Activities
  | 'approval'
  | 'decline'
  | 'account_activate'
  | 'account_deactivate'
  | 'staff_promote'
  | 'staff_demote'
  | 'staff_edit'
  // Fallback for anything else (misc system events)
  | 'system';

/** Matches the role codes used elsewhere in the app (e.g. userManagementService). */
export type AuditActorRole = 'SUPER_ADMIN' | 'OFFICE_STAFF' | 'STAFF';

export interface AuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  actorRole?: AuditActorRole;
  /** Short line shown in the list row, e.g. "submitted a property assessment". */
  description: string;
  /** Optional key/value pairs shown ONLY in the detail popup when a row is
   *  clicked — e.g. { "Property": "123 Main St, Butuan", "TCT No.": "T-4521" }.
   *  Keep `description` short for the row; put verbose specifics here. */
  details?: Record<string, string>;
  date: string;
  time: string;
}

interface StoredAuditRecord {
  id: string;
  type: AuditActionType;
  actor: string;
  actorRole?: AuditActorRole;
  description: string;
  details?: Record<string, string>;
  /** ISO timestamp — the source of truth. date/time labels are derived
   *  from this fresh on every read, so "Today"/"Yesterday" stay accurate
   *  as calendar days roll over instead of freezing at creation time. */
  timestamp: string;
}

const STORAGE_KEY = 'adept-admin-audit-log';
const AUDIT_EVENT_NAME = 'admin-audit-log:updated';

function formatEntryDate(date: Date) {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEntryTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function notifyListeners() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUDIT_EVENT_NAME));
  }
}

function readRawRecords(): StoredAuditRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StoredAuditRecord & { date?: string; time?: string }>[];
    return (parsed || [])
      .filter((item): item is Partial<StoredAuditRecord> & { id: string; type: AuditActionType; actor: string; description: string } =>
        Boolean(item?.id && item?.type && item?.actor && item?.description)
      )
      .map((item) => ({
        id: item.id!,
        type: item.type!,
        actor: item.actor!,
        // Entries written before this fix have no actorRole/details — leave
        // them undefined rather than guessing, so old entries just fall
        // outside role/detail-based logic instead of being miscategorized.
        actorRole: item.actorRole,
        description: item.description!,
        details: item.details,
        // Entries written before this fix only have frozen date/time
        // strings and no timestamp — fall back to "now" so old entries
        // don't disappear, rather than crashing on a missing field.
        timestamp: item.timestamp || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function clearStoredAuditEntries() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(AUDIT_EVENT_NAME));
  }
}

/**
 * Reads stored entries and derives date/time labels fresh on every call,
 * newest first, so "Today"/"Yesterday" stay accurate as the calendar day
 * rolls over — entries are never lost or auto-cleared, only relabeled.
 */
export function getStoredAuditEntries(): AuditLogEntry[] {
  return readRawRecords()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((record) => {
      const timestamp = new Date(record.timestamp);
      return {
        id: record.id,
        type: record.type,
        actor: record.actor,
        actorRole: record.actorRole,
        description: record.description,
        details: record.details,
        date: formatEntryDate(timestamp),
        time: formatEntryTime(timestamp),
      };
    });
}

export function addAdminAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'date' | 'time'>) {
  const timestamp = new Date();
  const record: StoredAuditRecord = {
    ...entry,
    id: `${timestamp.getTime()}-${Math.random().toString(16).slice(2)}`,
    timestamp: timestamp.toISOString(),
  };

  const nextRecords = [...readRawRecords(), record];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  }

  notifyListeners();
  return { ...entry, id: record.id, date: formatEntryDate(timestamp), time: formatEntryTime(timestamp) };
}