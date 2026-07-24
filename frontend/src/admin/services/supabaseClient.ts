import { createClient } from '@supabase/supabase-js';

// Public anon key only — safe to expose in the frontend bundle as long as
// Row Level Security is enabled on your Supabase tables. Never put the
// service-role key here; that one stays server-side only (see
// backend/src/config/supabaseAdmin.js).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Add them to frontend/.env — see Supabase Dashboard > Project Settings > API.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// All presence tracking (who's online right now) happens on this one
// named channel, shared between the tracker (useOnlinePresence) and the
// listener (AdminAuditLog's Staff Online Now panel).
export const STAFF_PRESENCE_CHANNEL = 'staff-presence';