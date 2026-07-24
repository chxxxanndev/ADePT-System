import express from 'express';
import {
    getFormMetadata,
    createRequest,
    updateRequest,
    getAllRequests,
    deleteRequest,
    checkOrUniqueness,
    releaseRequest
} from './request.controller.js';

const router = express.Router();

router.get('/metadata', getFormMetadata);
router.get('/check-or', checkOrUniqueness); // Must be above /:id routes
router.get('/', getAllRequests);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

router.post('/:id/release', releaseRequest);

export default router;