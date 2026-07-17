import { Router } from 'express';
import landholdingController from './landholding.controller.js';
// import { requireAuth } from '../auth/auth.middleware.js'; // adjust to your actual auth middleware

const router = Router();

router.post('/', /* requireAuth, */(req, res) => landholdingController.save(req, res));
router.get('/request/:requestId', /* requireAuth, */(req, res) => landholdingController.getByRequestId(req, res));

export default router;