import { supabaseAdmin } from '../../config/supabaseAdmin.js';

const EXCLUDED_ACTOR_IDS = new Set([
  'ad794ba9-1e22-4d49-9523-db5b2c6e7b52', // ADePT Development Team (dev account)
]);

class AuditLogService {

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

    if (EXCLUDED_ACTOR_IDS.has(staff.id)) {
      return null;
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