// hooks/useNotifications.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '../../auth-folder/types/auth';
import { supabase } from '../../lib/supabaseClient';
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
    const isInitialMount = useRef(true);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const fetchNotifications = useCallback(async (quiet = false) => {
        if (!user?.staffId) return;
        if (!quiet) setLoading(true);
        setError('');

        try {
            const data = await requestService.getNotifications();
            // Handle both object {data: []} and array [] responses
            const result = Array.isArray(data) ? data : (data.data || []);
            setNotifications(result);
            setError('');
        } catch (err: any) {
            console.error('Fetch Error:', err);
            // Only show the error state if we aren't in a 401 race condition
            if (err.response?.status !== 401 || isInitialMount.current === false) {
                setError('Failed to load notifications.');
            }
        } finally {
            setLoading(false);
            isInitialMount.current = false;
        }
    }, [user?.staffId]);

    // Initial load with a small delay to allow Supabase session to stabilize
    useEffect(() => {
        const timer = setTimeout(() => {
            if (user?.staffId) fetchNotifications();
        }, 300);
        return () => clearTimeout(timer);
    }, [user?.staffId, fetchNotifications]);

    // Realtime logic - refreshes list on new notification
    useEffect(() => {
        if (!user?.staffId) return;
        const channel = supabase
            .channel(`notif-realtime-${user.staffId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.staffId}` },
                () => fetchNotifications(true)
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user?.staffId, fetchNotifications]);

    // --- FUNCTIONAL ACTIONS ---

    const markAsRead = useCallback((notificationId: string) => {
        // Update local state immediately for better UX
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));

        // Update backend
        requestService.markNotificationRead(notificationId).catch((err) =>
            console.error('Failed to mark notification read', err)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        // Update local state immediately
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

        // Update backend
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
        markAllAsRead
    };
}