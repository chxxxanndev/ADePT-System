import { useEffect } from 'react';
import { onStaffPresenceSubscribed, getStaffPresenceChannel } from './staffPresenceChannel';
import type { User } from '../../auth-folder/types/auth';

export function useOnlinePresence(user: User | null) {
    useEffect(() => {
        if (!user?.id) return;

        const offSubscribed = onStaffPresenceSubscribed(async (channel) => {
            await channel.track({
                user_id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                online_at: new Date().toISOString(),
            });
        });

        return () => {
            offSubscribed();
            // Note: this no longer removes the shared channel itself —
            // AdminAuditLog may still be reading from it. untrack() still
            // marks this user offline for everyone else immediately.
            getStaffPresenceChannel().untrack();
        };
    }, [user?.id]);
}