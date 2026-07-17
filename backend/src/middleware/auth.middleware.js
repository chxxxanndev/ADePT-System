import { supabase, useMock } from '../config/supabase.js';

/**
 * Verifies the Supabase access token from the Authorization header,
 * resolves the caller's staff record, and attaches it to req.user.
 */
export async function requireAuth(req, res, next) {
    try {
        if (useMock || !supabase) {
            // Mock mode: bypass real verification with a fake super admin
            req.user = {
                authUserId: 'mock-admin-auth-id',
                staffId: 'mock-admin-staff-id',
                firstName: 'Mock',
                lastName: 'Admin',
                role: 'SUPER_ADMIN',
            };
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
        }
        const token = authHeader.slice(7);

        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        if (userError || !userData.user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }

        const { data: staffMember, error: staffError } = await supabase
            .from('staff')
            .select('id, first_name, last_name, email, username, account_status, roles(code)')
            .eq('auth_user_id', userData.user.id)
            .is('deleted_at', null)
            .single();

        if (staffError || !staffMember) {
            return res.status(403).json({ error: 'Staff profile not found.' });
        }

        if (staffMember.account_status !== 'ACTIVE') {
            return res.status(403).json({
                error: `Access denied. Account is ${staffMember.account_status.replace('_', ' ')}.`,
            });
        }

        req.user = {
            authUserId: userData.user.id,
            staffId: staffMember.id,
            firstName: staffMember.first_name,
            lastName: staffMember.last_name,
            email: staffMember.email,
            username: staffMember.username,
            role: staffMember.roles?.code,
        };

        next();
    } catch (err) {
        res.status(500).json({ error: 'Authentication check failed.' });
    }
}

/**
 * Restricts a route to specific roles. Must run after requireAuth.
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        next();
    };
}