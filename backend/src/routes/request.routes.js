import express from 'express';
import { getFormMetadata, createRequest, getAllRequests, updateRequest, deleteRequest } from '../controllers/request.controller.js';
// import { authenticateToken } from '../middleware/auth.middleware.js'; // Assuming you have this

const router = express.Router();

// Get municipalities, doc types, and purposes for dropdowns
router.get('/metadata', getFormMetadata);

// Get all requests
router.get('/', getAllRequests);

// Save the request form
router.post('/', createRequest); 

// Update the request form
router.put('/:id', updateRequest);
router.patch('/:id', updateRequest);

// Delete/discard a request
router.delete('/:id', deleteRequest);

export default router;