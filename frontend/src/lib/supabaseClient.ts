import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

// storage: sessionStorage ties Supabase's own internal session copy to this
// tab, same as the adept_token/adept_user keys in useAuth.tsx — so the
// browser clears both together when the tab closes, instead of Supabase
// quietly keeping its own copy alive in localStorage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STAFF_PRESENCE_CHANNEL = 'staff-presence';