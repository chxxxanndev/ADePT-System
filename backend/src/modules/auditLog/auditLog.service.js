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
   *
   * Document-forwards are not written to audit_log; they live in the
   * `notifications` table (one row per forward, with actor_id and
   * recipient_id). They are merged in here as `document_forwarded`
   * entries so the audit log can show who each request was forwarded to.
   */
  async listEntries({ limit = 500 } = {}) {
    const [auditResult, notifResult] = await Promise.all([
      supabaseAdmin
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('notifications')
        .select(`
          id, message, created_at, actor_id, recipient_id,
          requests:request_id ( reference_number ),
          actor:actor_id ( first_name, last_name, roles ( code ) ),
          recipient:recipient_id ( first_name, last_name )
        `)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (auditResult.error) throw auditResult.error;
    if (notifResult.error) throw notifResult.error;

    const forwardEntries = (notifResult.data || [])
      .filter((n) => typeof n.message === 'string' && n.message.toLowerCase().includes('forwarded'))
      .map((n) => {
        const recipientName = n.recipient
          ? `${n.recipient.first_name} ${n.recipient.last_name}`.trim()
          : null;
        const actorName = n.actor
          ? `${n.actor.first_name} ${n.actor.last_name}`.trim()
          : 'Office Staff';
        return {
          id: `notif-${n.id}`,
          type: 'document_forwarded',
          actor_id: n.actor_id,
          actor_name: actorName,
          actor_role: n.actor?.roles?.code ?? null,
          description: `forwarded a request to ${recipientName || 'a colleague'}`,
          details: {
            'Forwarded To': recipientName || 'Unassigned',
            ...(n.requests?.reference_number ? { Reference: n.requests.reference_number } : {}),
          },
          created_at: n.created_at,
        };
      });

    return [...(auditResult.data || []), ...forwardEntries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
}

export default new AuditLogService();