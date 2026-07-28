import { supabase, STAFF_PRESENCE_CHANNEL } from '../../auth-folder/services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PresenceEvent = 'sync' | 'join' | 'leave';

let channel: RealtimeChannel | null = null;
let subscribeStarted = false;
let isSubscribed = false;
const listeners: Record<PresenceEvent, Set<() => void>> = {
    sync: new Set(),
    join: new Set(),
    leave: new Set(),
};
const onSubscribedCbs = new Set<(channel: RealtimeChannel) => void>();

function ensureChannel(): RealtimeChannel {
    if (channel) return channel;
    channel = supabase.channel(STAFF_PRESENCE_CHANNEL);

    // Written out explicitly (not looped) so each `.on()` call has a literal
    // event type TypeScript can match against the right overload — looping
    // over a `PresenceEvent` union widens the argument and breaks overload
    // resolution (TS2769).
    channel.on('presence', { event: 'sync' }, () => {
        listeners.sync.forEach((cb) => cb());
    });
    channel.on('presence', { event: 'join' }, () => {
        listeners.join.forEach((cb) => cb());
    });
    channel.on('presence', { event: 'leave' }, () => {
        listeners.leave.forEach((cb) => cb());
    });

    return channel;
}

function startSubscription(): RealtimeChannel {
    const ch = ensureChannel();
    if (!subscribeStarted) {
        subscribeStarted = true;
        ch.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                isSubscribed = true;
                onSubscribedCbs.forEach((cb) => cb(ch));
            }
        });
    }
    return ch;
}

export function onStaffPresence(event: PresenceEvent, cb: () => void): () => void {
    listeners[event].add(cb);
    startSubscription();
    return () => listeners[event].delete(cb);
}

/** Fires cb once the shared channel is SUBSCRIBED — immediately if it's
 * already there, otherwise the first time it reaches that state. */
export function onStaffPresenceSubscribed(cb: (channel: RealtimeChannel) => void): () => void {
    const ch = startSubscription();
    if (isSubscribed) {
        cb(ch);
    } else {
        onSubscribedCbs.add(cb);
    }
    return () => onSubscribedCbs.delete(cb);
}

export function getStaffPresenceChannel(): RealtimeChannel {
    return startSubscription();
}