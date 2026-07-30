import { supabaseAdmin } from '../../config/supabaseAdmin.js';

/**
 * Writes and reads audit_log rows. Uses supabaseAdmin (service role) rather
 * than the RLS-scoped client — same reasoning as auth.service.js: this
 * needs to reliably insert/read regardless of the acting user's own RLS
 * policies, and it never touches session state so it's safe on the shared
 * admin client.
 */
class AuditLogService {
  /**
   * Resolves the acting staff member's id/name/role, then inserts a row.
   * Accepts EITHER an already-resolved staffId (from a requireAuth that
   * sets req.staffId) OR a raw Supabase auth user id (from a requireAuth
   * that only sets req.user.id) — whichever the calling controller has.
   */
  async createEntry({ actorStaffId, actorAuthId, type, description, details }) {
    if (!type || !description) {
      throw new Error('type and description are required.');
    }

    let staffQuery = supabaseAdmin
      .from('staff')
      .select('id, first_name, last_name, roles(code)');

    if (actorStaffId) {
      staffQuery = staffQuery.eq('id', actorStaffId);
    } else if (actorAuthId) {
      staffQuery = staffQuery.eq('auth_user_id', actorAuthId);
    } else {
      throw new Error('No acting staff id/auth id provided.');
    }

    const { data: staff, error: staffErr } = await staffQuery.single();
    if (staffErr || !staff) {
      throw new Error('Could not resolve the acting staff member.');
    }

    const actorName = `${staff.first_name} ${staff.last_name}`.trim();
    const actorRole = staff.roles?.code ?? null;

    const { data: entry, error: insertErr } = await supabaseAdmin
      .from('audit_log')
      .insert([{
        type,
        actor_id: staff.id,
        actor_name: actorName,
        actor_role: actorRole,
        description,
        details: details ?? null,
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;
    return entry;
  }

  /**
   * Returns entries newest-first. The frontend still does its own
   * search/time-range/super-admin filtering — this just returns the raw
   * rows, capped so a growing table can't blow up the response.
   */
  async listEntries({ limit = 500 } = {}) {
    const { data, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}

export default new AuditLogService();