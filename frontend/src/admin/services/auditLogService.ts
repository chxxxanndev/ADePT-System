import { supabase } from '../../lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/audit-log';

export type AuditActionType =
  // Staff Activities
  | 'login'
  | 'logout'
  | 'document_upload'
  | 'report_print'
  | 'document_pending'
  | 'document_voided'
  | 'document_archived'
  | 'document_released'
  // Admin Activities
  | 'approval'
  | 'decline'
  | 'account_activate'
  | 'account_deactivate'
  | 'staff_promote'
  | 'staff_demote'
  // Fallback for anything else (misc system events)
  | 'system';

export type AuditActorRole = 'SUPER_ADMIN' | 'ADMIN' | 'OFFICE_STAFF';

export interface AuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  actorRole: AuditActorRole;
  /** Short line shown in the list row, e.g. "submitted a property assessment". */
  description: string;
  /** Optional key/value pairs shown ONLY in the detail popup when a row is
   *  clicked — e.g. { "Property": "123 Main St, Butuan", "TCT No.": "T-4521" }. */
  details?: Record<string, string>;
  date: string;
  time: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Same pattern as userManagementService.ts's authHeaders() — pulls the token
// straight from supabase-js's own session rather than a hand-rolled copy.
async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatEntryDate(iso: string) {
  const date = new Date(iso);
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

function formatEntryTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function toAuditLogEntry(row: any): AuditLogEntry {
  return {
    id: row.id,
    type: row.type,
    actor: row.actor_name,
    actorRole: row.actor_role,
    description: row.description,
    details: row.details ?? undefined,
    date: formatEntryDate(row.created_at),
    time: formatEntryTime(row.created_at),
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches audit log entries from the backend, newest first.
 * The backend derives `actor`/`actorRole` from the authenticated staff row
 * at write time, so this is just a straight read.
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const res = await fetch(API_BASE_URL, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to fetch audit log (${res.status})`);
  }
  const data = await res.json();
  return (data.entries as any[]).map(toAuditLogEntry);
}

/**
 * Records an audit log entry. `actor`/`actorRole` are NOT sent — the backend
 * fills those in from the authenticated staff member's own record (via the
 * bearer token), so a client can't spoof who performed the action.
 */
const AUDIT_EVENT_NAME = 'admin-audit-log:updated';

export async function addAdminAuditEntry(entry: {
  type: AuditActionType;
  description: string;
  details?: Record<string, string>;
}): Promise<AuditLogEntry> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to record audit entry (${res.status})`);
  }
  const data = await res.json();
  // Same signal the old localStorage version emitted — AdminAuditLog.tsx
  // and useAdminDashboard.ts both listen for this to refresh live.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUDIT_EVENT_NAME));
  }
  return toAuditLogEntry(data.entry);
}