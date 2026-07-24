import { supabaseAdmin } from '../config/supabaseAdmin.js';

// Verifies the Supabase access token sent from the frontend
// (the one stored in localStorage as 'adept_token') and attaches
// the resolved auth user to req.user.
export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Missing authorization token.' });
        }

        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
        }

        req.user = data.user; // { id, email, ... }
        req.token = token;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed.' });
    }
}