import NotificationService from './notification.service.js';

export const getNotifications = async (req, res) => {
    try {
        if (!req.staffId) {
            return res.status(401).json({ error: 'Unable to resolve staff identity from token.' });
        }
        const data = await NotificationService.getNotifications(req.staffId);
        res.json(data);
    } catch (err) {
        console.error('❌ Notification Controller Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        if (!req.staffId) {
            return res.status(401).json({ error: 'Unable to resolve staff identity from token.' });
        }
        const result = await NotificationService.markAsRead(req.params.id, req.staffId);
        res.status(200).json(result);
    } catch (error) {
        console.error('❌ markNotificationRead error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        if (!req.staffId) {
            return res.status(401).json({ error: 'Unable to resolve staff identity from token.' });
        }
        const result = await NotificationService.markAllAsRead(req.staffId);
        res.status(200).json(result);
    } catch (error) {
        console.error('❌ markAllNotificationsRead error:', error);
        res.status(500).json({ error: error.message });
    }
};