import express from 'express';
import { getFormMetadata, createRequest } from '../controllers/request.controller.js';
// import { authenticateToken } from '../middleware/auth.middleware.js'; // Assuming you have this

const router = express.Router();

// Get municipalities, doc types, and purposes for dropdowns
router.get('/metadata', getFormMetadata);

// Save the request form
router.post('/', createRequest); 

export default router;