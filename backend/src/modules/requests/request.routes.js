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
    markAsReleased,
    createReprint,   
    voidRequest,
    getDashboardMetrics,
    getReportsData,
} from './request.controller.js';

const router = express.Router();

// Metadata & Metrics
router.get('/metadata', requireAuth, getFormMetadata);
router.get('/check-or', requireAuth, checkOrUniqueness);
router.get('/dashboard-metrics', requireAuth, getDashboardMetrics);
router.get('/reports-data', requireAuth, getReportsData);

// Base CRUDS
router.get('/', requireAuth, getAllRequests);
router.post('/', requireAuth, createRequest);

// Specific ID actions
router.get('/registry', requireAuth, getTransactionRegistry);
router.get('/:id', requireAuth, getRequestById);
router.put('/:id', requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);

router.post('/:id/documents/:docId/reprint', requireAuth, createReprint);  

// Specialized Status updates
router.post('/:id/release', requireAuth, releaseRequest);
router.post('/:id/forward', requireAuth, forwardRequest);
router.patch('/:id/mark-released', requireAuth, markAsReleased);
router.post('/:id/void', requireAuth, voidRequest);  

export default router;