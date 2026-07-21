import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS and can perform admin actions
// (ban/unban users, update another user's email or password directly).
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}

export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);