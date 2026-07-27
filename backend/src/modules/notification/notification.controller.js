import NotificationService from './notification.service.js';

// Example: src/controllers/notificationController.js
export const getNotifications = async (req, res) => {
    try {
        const data = await NotificationService.getNotifications(req.staffId);
        res.json(data);
    } catch (err) {
        console.error("❌ Notification Controller Error:", err); // ADD THIS LINE
        res.status(500).json({ error: err.message });
    }
};
export const markNotificationRead = async (req, res) => {
    try {
        const result = await NotificationService.markAsRead(req.params.id, req.staffId);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};
export const markAllNotificationsRead = async (req, res) => {
    try {
        const result = await NotificationService.markAllAsRead(req.staffId);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: error.message }); }
};