import { supabaseAdmin } from '../../config/supabaseAdmin.js';

const AVATAR_BUCKET = 'avatars';

class AccountService {
    async getProfile(authUserId) {
        const { data, error } = await supabaseAdmin
            .from('staff')
            .select('id, first_name, middle_initial, last_name, username, email, avatar_url, position, suffix, admin_level, roles(code, name)')
            .eq('auth_user_id', authUserId)
            .single();

        if (error) throw new Error(error.message);
        const mi = data.middle_initial ? data.middle_initial.replace(/\.$/, '') + '.' : '';
        return {
            id: data.id,
            firstName: data.first_name,
            middleInitial: data.middle_initial,
            lastName: data.last_name,
            fullName: `${data.first_name} ${mi} ${data.last_name}`.replace(/\s+/g, ' ').trim(),
            username: data.username,
            email: data.email,
            avatarUrl: data.avatar_url,
            position: data.position,
            suffix: data.suffix,
            adminLevel: data.admin_level,
            role: data.roles?.code,
            roleName: data.roles?.name,
        };
    }

    async updateProfile(authUserId, { fullName, username, position, suffix }) {
        // Parse "First M. Last": if the second token is a single letter
        // (with optional period), treat it as the middle initial.
        const tokens = fullName.trim().split(/\s+/);
        let firstName = tokens[0] || '';
        let middleInitial = null;
        let lastName = tokens.slice(1).join(' ');
        if (tokens.length >= 3 && /^[A-Za-z]\.?$/.test(tokens[1])) {
            middleInitial = tokens[1].replace(/\.$/, '');
            firstName = tokens[0];
            lastName = tokens.slice(2).join(' ');
        }

        const { data: existing } = await supabaseAdmin
            .from('staff')
            .select('auth_user_id')
            .ilike('username', username)
            .neq('auth_user_id', authUserId)
            .maybeSingle();

        if (existing) {
            throw new Error('That username is already taken.');
        }

        const updateFields = {
            first_name: firstName || '',
            middle_initial: middleInitial,
            last_name: lastName || '',
            username,
        };

        if (position !== undefined) {
            updateFields.position = position || null;
        }

        if (suffix !== undefined) {
            updateFields.suffix = suffix || null;
        }

        const { data, error } = await supabaseAdmin
            .from('staff')
            .update(updateFields)
            .eq('auth_user_id', authUserId)
            .select('first_name, middle_initial, last_name, username, position, suffix')
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async uploadPhoto(authUserId, file) {
        const ext = file.originalname.split('.').pop();
        const path = `${authUserId}/avatar.${ext}`; // fixed name per user — upsert replaces the old file instead of piling up new ones

        const { error: uploadError } = await supabaseAdmin.storage
            .from(AVATAR_BUCKET)
            .upload(path, file.buffer, { contentType: file.mimetype, upsert: true, cacheControl: '3600' });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

        const { error: dbError } = await supabaseAdmin
            .from('staff')
            .update({ avatar_url: avatarUrl })
            .eq('auth_user_id', authUserId);

        if (dbError) throw new Error(dbError.message);
        return avatarUrl;
    }

    async updateEmail(authUserId, newEmail) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            email: newEmail,
            email_confirm: true,
        });
        if (authError) throw new Error(authError.message);

        const { error: dbError } = await supabaseAdmin
            .from('staff')
            .update({ email: newEmail })
            .eq('auth_user_id', authUserId);
        if (dbError) throw new Error(dbError.message);

        return { email: newEmail };
    }

    async changePassword(authUserId, email, currentPassword, newPassword) {
        const { createClient } = await import('@supabase/supabase-js');
        const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

        const { error: verifyError } = await anonClient.auth.signInWithPassword({
            email,
            password: currentPassword,
        });
        if (verifyError) throw new Error('Current password is incorrect.');

        const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password: newPassword,
        });
        if (error) throw new Error(error.message);

        return { message: 'Password updated successfully.' };
    }

    // NOTE: does NOT ban at the Supabase Auth level — see auth.service.js
    // loginUser() for why (the 7-day reactivation flow needs the password
    // check to still succeed for a disabled account).
    async setAccountStatus(authUserId, disabled, reason = 'Disabled by account holder') {
        const { error } = await supabaseAdmin
            .from('staff')
            .update({
                account_status: disabled ? 'DISABLED' : 'ACTIVE',
                disabled_at: disabled ? new Date().toISOString() : null,
                disable_reason: disabled ? reason : null,
            })
            .eq('auth_user_id', authUserId);

        if (error) throw new Error(error.message);
        return { account_status: disabled ? 'DISABLED' : 'ACTIVE' };
    }
}

export default new AccountService();