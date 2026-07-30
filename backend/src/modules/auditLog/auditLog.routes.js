import express from 'express';
import { createAuditEntry, listAuditEntries } from './auditLog.controller.js';
// TODO: confirm this is the same requireAuth guarding /api/users, then fix
// this import path to match exactly (see the two candidate middleware
// files — need to know which one user.routes.js actually imports).
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, listAuditEntries);
router.post('/', requireAuth, createAuditEntry);

export default router;