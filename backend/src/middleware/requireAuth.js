import { supabase } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.slice(7);

    let user;
    try {
        const result = await supabase.auth.getUser(token);
        user = result?.data?.user;
        if (result?.error) {
            console.error('❌ getUser rejected token:', result.error.message);
        }
    } catch (err) {
        console.error('❌ getUser failed:', err);
        return res.status(503).json({ error: 'Authentication service unavailable. Please try again later.' });
    }

    if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    let staffMember;
    try {
        const result = await supabase
            .from('staff').select('id, account_status').eq('auth_user_id', user.id).single();
        if (result.error) throw result.error;
        staffMember = result.data;
    } catch (err) {
        console.error('❌ staff lookup failed:', err.message || err);
        return res.status(503).json({ error: 'Authentication service unavailable. Please try again later.' });
    }

    if (!staffMember) return res.status(403).json({ error: 'Staff record not found' });
    if (staffMember.account_status !== 'ACTIVE') return res.status(403).json({ error: 'Account is not active' });

    req.user = user;
    req.authUserId = user.id;
    req.staffId = staffMember.id;
    req.token = token;

    next();
}