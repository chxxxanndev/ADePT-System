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

// src/services/auth.service.js

async loginUser({ username, password }) {
    let email = username;

    if (!username.includes('@')) {
        const { data: profile } = await supabase
            .from('staff')
            .select('email')
            .ilike('username', username)
            .single();
        
        if (profile) email = profile.email;
        else throw new Error("Username not found.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // 1. UPDATED THIS LINE: Added first_name, last_name, and username to the select
    const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select('first_name, last_name, username, account_status, roles(code)')
        .eq('auth_user_id', data.user.id)
        .single();

    if (staffError || !staffMember) throw new Error("Staff profile not found.");

    if (staffMember.account_status !== 'ACTIVE') {
        await supabase.auth.signOut();
        throw new Error(`Access Denied. Your account is ${staffMember.account_status.replace('_', ' ')}.`);
    }

    // 2. UPDATED THIS RETURN: Map the database fields to the names your frontend expects
    return {
        token: data.session?.access_token,
        user: {
            id: data.user.id,
            email: data.user.email,
            firstName: staffMember.first_name, // Map first_name -> firstName
            lastName: staffMember.last_name,   // Map last_name -> lastName
            username: staffMember.username,
            role: staffMember.roles?.code,
            status: staffMember.account_status
        }
    };
}
}

export default new AuthService();