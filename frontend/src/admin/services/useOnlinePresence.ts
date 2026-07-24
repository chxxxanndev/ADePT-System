import { useEffect } from 'react';
import { supabase, STAFF_PRESENCE_CHANNEL } from './supabaseClient';
import type { User } from '../../auth-folder/types/auth';

/**
 * Mount this once, high in the tree, with the currently logged-in user
 * (e.g. inside AdminDashboard.tsx, which already receives `user` as a prop).
 * As long as this stays mounted, Supabase keeps a websocket open announcing
 * "this user is here." Closing the tab or logging out (which unmounts this
 * component) removes them from the presence set automatically.
 *
 * IMPORTANT: the key used here (user.id) must be the same identifier your
 * staff records use so AdminAuditLog can match them up. Your login response
 * returns `id: data.user.id` — the Supabase Auth user id — so make sure
 * fetchAllStaff() / StaffMember also exposes each row's `auth_user_id` field
 * for matching, since the staff table's own primary key may not be the same
 * value as the auth user id.
 */
export function useOnlinePresence(user: User | null) {
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel(STAFF_PRESENCE_CHANNEL, {
            config: { presence: { key: user.id } },
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: user.id,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                    online_at: new Date().toISOString(),
                });
            }
        });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, [user?.id]);
}