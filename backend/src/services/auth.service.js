import { supabase, useMock } from '../config/supabase.js';
import { mockUsers } from '../database/mockData.js';

class AuthService {
  // src/services/auth.service.js

    // src/services/auth.service.js

async registerUser({ firstName, lastName, email, username, password }) {
  // 1. Create the user in Supabase Auth (This handles the password)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        first_name: firstName, 
        last_name: lastName, 
        display_username: username 
      }
    }
  });

  if (authError) throw authError;

  // 2. Get the Role ID for 'OFFICE_STAFF'
  const { data: roleData } = await supabase
    .from('roles')
    .select('id')
    .eq('code', 'OFFICE_STAFF')
    .single();

  // 3. Create the record in our new 'staff' table
  const { error: staffError } = await supabase
    .from('staff')
    .insert([{
      auth_user_id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      username: username, // Matching the UI
      role_id: roleData.id,
      account_status: 'PENDING_APPROVAL'
    }]);

  if (staffError) throw staffError;

  return {
    message: "Registration successful! Data is now in Supabase.",
    user: { email, firstName, username }
  };
}

    // src/services/auth.service.js

async loginUser({ username, password }) {
    let email = username;

    // 1. If the user didn't type an '@', assume they typed their 'username'
    if (!username.includes('@')) {
        const { data: profile, error: lookupError } = await supabase
            .from('staff')
            .select('email')
            .ilike('username', username) // .ilike is case-INSENSITIVE
            .single();
        
        if (profile) {
            email = profile.email;
        } else {
            console.error("Lookup Error:", lookupError); // Look at your terminal for this!
            throw new Error("Username not found.");
        }
    }

    // 2. Attempt Supabase Auth Login using the resolved email
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;

    // 3. Check 'staff' table status (Access Control)
    const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select('account_status, roles(code)')
        .eq('auth_user_id', data.user.id)
        .single();

    if (staffError || !staffMember) {
        throw new Error("Staff profile not found. Please contact admin.");
    }

    // 4. Block login if account isn't ACTIVE
    if (staffMember.account_status !== 'ACTIVE') {
        await supabase.auth.signOut(); // Log them out immediately
        throw new Error(`Access Denied. Your account is ${staffMember.account_status.replace('_', ' ')}.`);
    }

    return {
        token: data.session?.access_token,
        user: {
            id: data.user.id,
            email: data.user.email,
            role: staffMember.roles?.code,
            status: staffMember.account_status
        }
    };
}
}

export default new AuthService();