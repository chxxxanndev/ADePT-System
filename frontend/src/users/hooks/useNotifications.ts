import { useState, useEffect, useCallback } from 'react';
import type { User } from '../../auth-folder/types/auth';
import { supabase } from '../../auth-folder/services/supabaseClient';
import { requestService } from '../services/requestService';

export interface NotificationItem {
    id: string;
    request_id: string;
    message: string;
    is_read: boolean;
    created_at: string;
    actor?: { first_name?: string; last_name?: string };
    requests?: { reference_number?: string; control_number?: string; declarant_name?: string };
}

export function useNotifications(user: User | null | undefined) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = useCallback(async () => {
        if (!user?.staffId) return;
        setLoading(true);
        setError('');
        try {
            const data = await requestService.getNotifications();
            setNotifications(data.data || data);
        } catch (err) {
            console.error('Failed to load notifications', err);
            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [user?.staffId]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Realtime subscription — one channel per staff member, lives for the whole session
    useEffect(() => {
        if (!user?.staffId) return;

        const channel = supabase
            .channel(`notifications-${user.staffId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.staffId}` },
                (payload) => setNotifications((prev) => [payload.new as NotificationItem, ...prev])
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.staffId]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
        requestService.markNotificationRead(notificationId).catch((err) =>
            console.error('Failed to mark notification read', err)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        requestService.markAllNotificationsRead().catch((err) =>
            console.error('Failed to mark all notifications read', err)
        );
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        refetch: fetchNotifications,
        markAsRead,
        markAllAsRead,
    };
}