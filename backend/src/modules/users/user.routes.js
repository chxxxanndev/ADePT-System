import express from 'express';
import { getAllStaff, updateStaffStatus } from './user.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

const router = express.Router();

// GET  /api/users/staff — any authenticated, active staff member can view
router.get('/staff', requireAuth, getAllStaff);

// PATCH /api/users/staff/:id/status — only super admins can approve/reject/disable
router.patch('/staff/:id/status', requireAuth, requireRole('SUPER_ADMIN'), updateStaffStatus);

export default router;