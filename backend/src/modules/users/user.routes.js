import express from 'express';
import { getAllStaff, updateStaffStatus } from './user.controller.js';
const router = express.Router();
// GET  /api/users/staff
router.get('/staff', getAllStaff);
// PATCH /api/users/staff/:id/status
router.patch('/staff/:id/status', updateStaffStatus);
export default router;
