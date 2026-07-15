import express from 'express';
import { getFormMetadata, createRequest, updateRequest } from '../controllers/request.controller.js';
// import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/metadata', getFormMetadata);
router.post('/', createRequest);
router.put('/:id', updateRequest);

export default router;