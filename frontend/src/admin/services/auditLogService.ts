export type AuditActionType = 'approval' | 'decline' | 'system' | 'login' | 'logout';

export interface AuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  description: string;
  date: string;
  time: string;
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

export function clearStoredAuditEntries() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(AUDIT_EVENT_NAME));
  }
}

export function getStoredAuditEntries(): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<AuditLogEntry>[];
    return (parsed || []).filter((item): item is AuditLogEntry => Boolean(item?.id && item?.type && item?.actor && item?.description));
  } catch {
    return [];
  }
}

export function addAdminAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'date' | 'time'>) {
  const timestamp = new Date();
  const nextEntry: AuditLogEntry = {
    ...entry,
    id: `${timestamp.getTime()}-${Math.random().toString(16).slice(2)}`,
    date: formatEntryDate(timestamp),
    time: formatEntryTime(timestamp),
  };

  const nextEntries = [...getStoredAuditEntries(), nextEntry];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
  }

  notifyListeners();
  return nextEntry;
}
