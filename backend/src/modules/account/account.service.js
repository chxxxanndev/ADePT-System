import { supabaseAdmin } from '../../config/supabaseAdmin.js';

const AVATAR_BUCKET = 'avatars';

class AccountService {
    async updateProfile(authUserId, { fullName, username }) {
        const [firstName, ...rest] = fullName.trim().split(' ');
        const lastName = rest.join(' ');

        const { data: existing } = await supabaseAdmin
            .from('staff')
            .select('auth_user_id')
            .ilike('username', username)
            .neq('auth_user_id', authUserId)
            .maybeSingle();

        if (existing) {
            throw new Error('That username is already taken.');
        }

        const { data, error } = await supabaseAdmin
            .from('staff')
            .update({
                first_name: firstName || '',
                last_name: lastName || '',
                username,
            })
            .eq('auth_user_id', authUserId)
            .select('first_name, last_name, username')
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