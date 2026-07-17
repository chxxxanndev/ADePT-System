import express from 'express';
import { getFormMetadata, createRequest, updateRequest, getAllRequests, deleteRequest } from '../requests/request.controller.js';
// import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/metadata', getFormMetadata);
router.get('/', getAllRequests);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;