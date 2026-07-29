import express from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import {
    getFormMetadata,
    getRequestById,
    forwardRequest,
    createRequest,
    updateRequest,
    getAllRequests,
    getTransactionRegistry,
    deleteRequest,
    checkOrUniqueness,
    releaseRequest,
    voidRequest,
} from './request.controller.js';

const router = express.Router();

// Metadata & Helpers
router.get('/metadata', requireAuth, getFormMetadata); // Added requireAuth
router.get('/check-or', requireAuth, checkOrUniqueness);

// Base CRUDS
router.get('/', requireAuth, getAllRequests);
router.post('/', requireAuth, createRequest);

// Specific ID actions
router.get('/registry', requireAuth, getTransactionRegistry);
router.get('/:id', requireAuth, getRequestById);
router.put('/:id', requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);

// Specialized Status updates
router.post('/:id/release', requireAuth, releaseRequest);
router.post('/:id/void', requireAuth, voidRequest);
router.post('/:id/forward', requireAuth, forwardRequest); // Cleaned up logic here

export default router;