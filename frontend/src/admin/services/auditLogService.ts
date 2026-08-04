// 1. Updated Imports: removed supabase/authHeaders, added api
import { api } from '../../users/services/requestService';

export type AuditActionType =
  | 'login' | 'logout' | 'document_upload' | 'report_print'
  | 'document_pending' | 'document_voided' | 'document_archived'
  | 'document_released' | 'approval' | 'decline' | 'account_activate'
  | 'account_deactivate' | 'staff_promote' | 'staff_demote' | 'system';

export type AuditActorRole = 'SUPER_ADMIN' | 'ADMIN' | 'OFFICE_STAFF';

export interface AuditLogEntry {
  id: string;
  type: AuditActionType;
  actor: string;
  actorRole: AuditActorRole;
  description: string;
  details?: Record<string, string>;
  timestamp?: number; // epoch ms, used for time-range filtering
  date: string;
  time: string;
}

// 2. Removed manual authHeaders and hardcoded API_BASE_URL

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
    timestamp: row.created_at ? Date.parse(row.created_at) : undefined,
    date: formatEntryDate(row.created_at),
    time: formatEntryTime(row.created_at),
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetches audit log entries from the backend.
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const res = await api.get('/audit-log');
    const data = res.data;
    return (data?.entries as any[] || []).map(toAuditLogEntry);
  } catch {
    return [];
  }
}

/**
 * Records an audit log entry.
 */
const AUDIT_EVENT_NAME = 'admin-audit-log:updated';

export async function addAdminAuditEntry(entry: {
  type: AuditActionType;
  description: string;
  details?: Record<string, string>;
}): Promise<AuditLogEntry> {
  // api.post handles JSON stringify and headers automatically
  const res = await api.post('/audit-log', entry);
  const data = res.data;

  // Preserve the live-update signal logic
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUDIT_EVENT_NAME));
  }
  return toAuditLogEntry(data.entry);
}