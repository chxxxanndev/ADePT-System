import { supabase } from '../../config/supabase.js';
import { supabaseAdmin } from '../../config/supabaseAdmin.js';

const REACTIVATION_WINDOW_DAYS = 7;

class AuthService {
  async registerUser({ firstName, lastName, email, username, password }) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, display_username: username }
      }
    });
    if (authError) throw authError;

    const { data: roleData } = await supabase
      .from('roles').select('id').eq('code', 'OFFICE_STAFF').single();

    const { error: staffError } = await supabase
      .from('staff')
      .insert([{
        auth_user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        username: username,
        role_id: roleData.id,
        account_status: 'PENDING_APPROVAL'
      }]);
    if (staffError) throw staffError;

    return { message: "Registration successful! Data is now in Supabase.", user: { email, firstName, username } };
  }

  async loginUser({ username, password }) {
    let email = username;

    if (!username.includes('@')) {
      const { data: profile } = await supabase.from('staff').select('email').ilike('username', username).single();
      if (profile) email = profile.email;
      else throw new Error("Username not found.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('first_name, last_name, username, account_status, disabled_at, avatar_url, admin_level, roles(code,name)')
      .eq('auth_user_id', data.user.id)
      .single();

    if (staffError || !staffMember) {
      await supabase.auth.signOut();
      throw new Error("Staff profile not found.");
    }

    if (staffMember.account_status === 'DISABLED') {
      await supabase.auth.signOut();

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
      await supabase.auth.signOut();
      throw new Error(`Access Denied. Your account is ${staffMember.account_status.replace('_', ' ')}.`);
    }

    return {
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: staffMember.first_name,
        lastName: staffMember.last_name,
        username: staffMember.username,
        role: staffMember.roles?.code,
        roleName: staffMember.roles?.name, // 'Office Staff' (FROM YOUR ROLES TABLE)
        adminLevel: staffMember.admin_level, // 'HIGH' | 'MEDIUM' | 'LOW' | null
        status: staffMember.account_status,
        avatarUrl: staffMember.avatar_url,
        lastLogin: data.user.last_sign_in_at, // Real timestamp from Supabase Auth
      }
    };
  }

  async reactivateAccount({ username, password }) {
    let email = username;

    if (!username.includes('@')) {
      const { data: profile } = await supabase.from('staff').select('email').ilike('username', username).single();
      if (profile) email = profile.email;
      else throw new Error("Username not found.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('first_name, last_name, username, account_status, disabled_at, avatar_url, admin_level, roles(code,name)')
      .eq('auth_user_id', data.user.id)
      .single();

    if (staffError || !staffMember) {
      await supabase.auth.signOut();
      throw new Error("Staff profile not found.");
    }

    if (staffMember.account_status !== 'DISABLED') {
      throw new Error('This account is not currently disabled.');
    }

    const disabledAt = staffMember.disabled_at ? new Date(staffMember.disabled_at) : null;
    const daysSinceDisabled = disabledAt ? (Date.now() - disabledAt.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

    if (daysSinceDisabled > REACTIVATION_WINDOW_DAYS) {
      await supabase.auth.signOut();
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
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: staffMember.first_name,
        lastName: staffMember.last_name,
        username: staffMember.username,
        role: staffMember.roles?.code, // renamed from roleCode for frontend consistency
        roleName: staffMember.roles?.name,
        adminLevel: staffMember.admin_level, // 'HIGH' | 'MEDIUM' | 'LOW' | null
        status: reactivated.account_status,
        avatarUrl: staffMember.avatar_url,
        lastLogin: data.user.last_sign_in_at,
      }
    };
  }

  async forgotPassword(email) {
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