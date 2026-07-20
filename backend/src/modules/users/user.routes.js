import express from 'express';
import { createStaff, decideAccountRequest, getAccountRequests, getAllStaff, updateStaffStatus } from './user.controller.js';
const router = express.Router();
// GET  /api/users/staff
router.get('/staff', getAllStaff);
// POST /api/users/staff
router.post('/staff', createStaff);
// GET /api/users/account-requests
router.get('/account-requests', getAccountRequests);
// PATCH /api/users/account-requests/:id/decision
router.patch('/account-requests/:id/decision', decideAccountRequest);
// PATCH /api/users/staff/:id/status
router.patch('/staff/:id/status', updateStaffStatus);
export default router;
