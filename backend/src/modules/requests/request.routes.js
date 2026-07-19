import express from 'express';
// ADD releaseRequest TO THIS LIST:
import { 
    getFormMetadata, 
    createRequest, 
    updateRequest, 
    getAllRequests, 
    deleteRequest, 
    releaseRequest 
} from './request.controller.js';

const router = express.Router();

router.get('/metadata', getFormMetadata);
router.get('/', getAllRequests);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

// THIS LINE IS NOW VALID:
router.post('/:id/release', releaseRequest);

export default router;