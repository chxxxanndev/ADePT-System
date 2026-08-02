import { supabase } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.slice(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);
   
    if (error) console.error('❌ getUser rejected token:', error.message); // TEMP — remove after

    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

    const { data: staffMember, error: staffErr } = await supabase
        .from('staff').select('id, account_status').eq('auth_user_id', user.id).single();

    if (staffErr || !staffMember) return res.status(403).json({ error: 'Staff record not found' });
    if (staffMember.account_status !== 'ACTIVE') return res.status(403).json({ error: 'Account is not active' });

    // All three conventions populated — every existing controller across
    // the app (req.user.id, req.authUserId, req.staffId) keeps working
    // unchanged, regardless of which router file originally imported it.
    req.user = user;
    req.authUserId = user.id;
    req.staffId = staffMember.id;
    req.token = token;

    next();
}