import { useState, useEffect, useCallback } from 'react';
import type { User } from '../../auth-folder/types/auth';
// TODO (backend): import { supabase } from '../config/supabaseClient';
// TODO (backend): import { requestService } from '../services/requestService';

export interface NotificationItem {
    id: string;
    request_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
    actor?: { first_name?: string; last_name?: string };
    requests?: { reference_number?: string; control_number?: string; declarant_name?: string };
}

// TEMP mock data — shape matches what GET /notifications will eventually return.
const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: 'mock-1',
        request_id: 'req-mock-1',
        message: 'forwarded a Tax Declaration request to you',
        is_read: false,
        created_at: new Date().toISOString(),
        actor: { first_name: 'Maria', last_name: 'Santos' },
        requests: { reference_number: 'TD-2026-4821', declarant_name: 'Juan D. Cruz' },
    },
    {
        id: 'mock-2',
        request_id: 'req-mock-2',
        message: 'forwarded a Certificate of Landholding request to you',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        actor: { first_name: 'Pedro', last_name: 'Reyes' },
        requests: { reference_number: 'LH-2026-1190', declarant_name: 'Ana Lopez' },
    },
];

export function useNotifications(user: User | null | undefined) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    // Initial load
    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        setLoading(true);
        // TODO (backend): requestService.getNotifications().then((data) => { if (isMounted) { setNotifications(data); setLoading(false); } });
        const timeout = setTimeout(() => {
            if (isMounted) {
                setNotifications(MOCK_NOTIFICATIONS);
                setLoading(false);
            }
        }, 300);
        return () => { isMounted = false; clearTimeout(timeout); };
    }, [user?.id]);

    // Realtime subscription — lives at the top of the app (via Dashboard),
    // so it's automatic no matter which page the staff member is on.
    useEffect(() => {
        if (!user) return;
        // TODO (backend): once the notifications table + Realtime are live:
        //
        // const channel = supabase
        //     .channel(`notifications-${user.id}`)
        //     .on('postgres_changes',
        //         { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_staff_id=eq.${user.id}` },
        //         (payload) => setNotifications((prev) => [payload.new as NotificationItem, ...prev])
        //     )
        //     .subscribe();
        // return () => { supabase.removeChannel(channel); };
    }, [user?.id]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
        // TODO (backend): requestService.markNotificationRead(notificationId)
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        // TODO (backend): requestService.markAllNotificationsRead()
    }, []);

    return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}