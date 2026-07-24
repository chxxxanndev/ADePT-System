import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    createStaff,
    decideAccountRequest,
    getAccountRequests,
    getAllStaff,
    updateStaffStatus,
    setAdminLevel,
    promoteToAdmin,
    demoteToStaff,
} from './user.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/staff', getAllStaff);
router.post('/staff', createStaff);
router.get('/account-requests', getAccountRequests);
router.patch('/account-requests/:id/decision', decideAccountRequest);
router.patch('/staff/:id/status', updateStaffStatus);
router.patch('/staff/:id/admin-level', setAdminLevel);
router.patch('/staff/:id/promote-to-admin', promoteToAdmin);
router.patch('/staff/:id/demote-to-staff', demoteToStaff);

export default router;