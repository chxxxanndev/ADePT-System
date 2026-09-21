import express from 'express';
import { createAuditEntry, listAuditEntries } from './auditLog.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', requireAuth, listAuditEntries);
router.post('/', requireAuth, createAuditEntry);

export default router;