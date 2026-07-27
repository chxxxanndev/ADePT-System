import { supabase } from '../../config/supabase.js';

class NotificationService {
    async getNotifications(recipientStaffId) {
        const { data, error } = await supabase.from('notifications')
            .select(`id, request_id, message, is_read, created_at,
                     actor:actor_id ( first_name, last_name ),
                     requests:request_id ( reference_number, declarant_name )`)
            .eq('recipient_id', recipientStaffId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }
    async markAsRead(notificationId, recipientStaffId) {
        const { error } = await supabase.from('notifications').update({ is_read: true })
            .eq('id', notificationId).eq('recipient_id', recipientStaffId);
        if (error) throw error;
        return { success: true };
    }
    async markAllAsRead(recipientStaffId) {
        const { error } = await supabase.from('notifications').update({ is_read: true })
            .eq('recipient_id', recipientStaffId).eq('is_read', false);
        if (error) throw error;
        return { success: true };
    }
}
export default new NotificationService();