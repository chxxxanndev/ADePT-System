import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase.js';
import { supabaseAdmin } from '../../config/supabaseAdmin.js';

const REACTIVATION_WINDOW_DAYS = 7;

/**
 * Creates a throwaway Supabase client scoped to a single request, used only
 * for password verification (auth.signInWithPassword). This is deliberate:
 * calling signInWithPassword/signUp on a *shared* client instance mutates
 * that instance's in-memory session, and every subsequent .from(...) call
 * made through that same shared client — from ANY request, anywhere in the
 * app — then silently starts running as whichever user last signed in,
 * subject to full RLS, instead of your intended service-role/admin identity.
 * A fresh client per call means each login's session death is scoped to
 * that ephemeral instance and can never leak into shared state.
 */
function createEphemeralAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

class AuthService {
  async registerUser({ firstName, middleInitial, lastName, email, username, password, suffix }) {
    // Use the admin API to create the auth user — this does NOT touch any
    // client's session state (unlike auth.signUp), so it's safe to call on
    // the shared admin client without any risk of session leakage.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, middle_initial: middleInitial || null, last_name: lastName, display_username: username, suffix: suffix || null },
    });
    if (authError) throw authError;

    const { data: roleData } = await supabaseAdmin
      .from('roles').select('id').eq('code', 'OFFICE_STAFF').single();

    const { error: staffError } = await supabaseAdmin
      .from('staff')
      .insert([{
        auth_user_id: authData.user.id,
        first_name: firstName,
        middle_initial: middleInitial || null,
        last_name: lastName,
        email: email,
        username: username,
        suffix: suffix || null,
        role_id: roleData.id,
        account_status: 'PENDING_APPROVAL'
      }]);
    if (staffError) throw staffError;

    return { message: "Registration successful! Data is now in Supabase.", user: { email, firstName, username } };
  }

  async loginUser({ username, password }) {
    let email = username;

    if (!username.includes('@')) {
        const { data: profile } = await supabaseAdmin.from('staff').select('email').ilike('username', username).single();
        if (profile) email = profile.email;
        else throw new Error("Username not found.");
    }

    // Ephemeral client — verifies the password without touching the shared
    // admin client's session (see createEphemeralAuthClient's comment above).
    const authClient = createEphemeralAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: staffMember, error: staffError } = await supabaseAdmin
        .from('staff')
        .select('id, first_name, middle_initial, last_name, username, account_status, disabled_at, avatar_url, admin_level, position, suffix, roles(code,name)')
        .eq('auth_user_id', data.user.id)
        .single();

    if (staffError || !staffMember) {
        throw new Error("Staff profile not found.");
    }

    if (staffMember.account_status === 'DISABLED') {
        const disabledAt = staffMember.disabled_at ? new Date(staffMember.disabled_at) : null;
        const daysSinceDisabled = disabledAt ? (Date.now() - disabledAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        if (daysSinceDisabled <= REACTIVATION_WINDOW_DAYS) {
            const daysRemaining = Math.max(0, Math.ceil(REACTIVATION_WINDOW_DAYS - daysSinceDisabled));
            const err = new Error('Account is disabled but eligible for reactivation.');
            err.reactivatable = true;
            err.daysRemaining = daysRemaining;
            throw err;
        }
        throw new Error('Access Denied. Your account was disabled more than 7 days ago. Please contact an administrator.');
    }

    if (staffMember.account_status !== 'ACTIVE') {
        throw new Error(`Access Denied. Your account is ${staffMember.account_status.replace('_', ' ')}.`);
    }

    return {
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: {
            id: data.user.id,
            staffId: staffMember.id,
            email: data.user.email,
            firstName: staffMember.first_name,
            middleInitial: staffMember.middle_initial,
            lastName: staffMember.last_name,
            username: staffMember.username,
            role: staffMember.roles?.code,
            roleName: staffMember.roles?.name,
            adminLevel: staffMember.admin_level,
            status: staffMember.account_status,
            avatarUrl: staffMember.avatar_url,
            position: staffMember.position,
            suffix: staffMember.suffix,
            lastLogin: data.user.last_sign_in_at,
        }
    };
}

  async reactivateAccount({ username, password }) {
    let email = username;

    if (!username.includes('@')) {
      const { data: staffMemberLookup } = await supabaseAdmin.from('staff').select('email').ilike('username', username).single();
      if (staffMemberLookup) email = staffMemberLookup.email;
      else throw new Error("Username not found.");
    }

    const authClient = createEphemeralAuthClient();
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: staffMember, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('first_name, middle_initial, last_name, username, account_status, disabled_at, avatar_url, admin_level, position, suffix, roles(code,name)')
      .eq('auth_user_id', data.user.id)
      .single();

    if (staffError || !staffMember) {
      throw new Error("Staff profile not found.");
    }

    if (staffMember.account_status !== 'DISABLED') {
      throw new Error('This account is not currently disabled.');
    }

    const disabledAt = staffMember.disabled_at ? new Date(staffMember.disabled_at) : null;
    const daysSinceDisabled = disabledAt ? (Date.now() - disabledAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

    if (daysSinceDisabled > REACTIVATION_WINDOW_DAYS) {
      throw new Error('The 7-day reactivation window has expired. Please contact an administrator.');
    }

    const { data: reactivated, error: updateError } = await supabaseAdmin
      .from('staff')
      .update({ account_status: 'ACTIVE', disabled_at: null, disabled_by: null, disable_reason: null })
      .eq('auth_user_id', data.user.id)
      .select('account_status')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!reactivated || reactivated.account_status !== 'ACTIVE') {
      throw new Error('Reactivation did not apply — no matching staff record was updated.');
    }

    return {
    token: data.session?.access_token,
    refreshToken: data.session?.refresh_token,
    user: {
        id: data.user.id,
        staffId: staffMember.id,
        email: data.user.email,
        firstName: staffMember.first_name,
            middleInitial: staffMember.middle_initial,
        lastName: staffMember.last_name,
        username: staffMember.username,
        role: staffMember.roles?.code,
        roleName: staffMember.roles?.name,
        adminLevel: staffMember.admin_level,
        status: reactivated.account_status,
        avatarUrl: staffMember.avatar_url,
        position: staffMember.position,
        lastLogin: data.user.last_sign_in_at,
    }
};
  }

  async forgotPassword(email) {
    // resetPasswordForEmail doesn't establish a session, so it's safe on
    // the shared client — kept as-is.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/reset-password'
    });
    if (error) {
      console.error('Forgot password error:', error.message);
      throw error;
    }
    return { message: "If an account with that email exists, password reset instructions have been sent." };
  }
}

export default new AuthService();