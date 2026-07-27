import express from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from './notification.controller.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', getNotifications);
router.patch('/mark-all-read', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
export default router;