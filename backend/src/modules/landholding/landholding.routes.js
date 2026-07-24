// backend/src/modules/landholding/landholding.routes.js
import { Router } from 'express';
import landholdingController from './landholding.controller.js';
// import { requireAuth } from '../auth/auth.middleware.js'; 

const router = Router();

/**
 * POST /api/landholding
 * Saves or updates a landholding certificate record.
 */
router.post('/', /* requireAuth, */ (req, res) => landholdingController.save(req, res));

/**
 * GET /api/landholding/:id
 * Fetches full certificate data (with rows and OR info) by the Certificate UUID.
 * Useful for generating the PDF.
 */
router.get('/:id', /* requireAuth, */ (req, res) => landholdingController.getById(req, res));

/**
 * GET /api/landholding/request/:requestId
 * Fetches the certificate associated with a specific Request ID.
 * Useful for loading drafts in the UI.
 */
router.get('/request/:requestId', /* requireAuth, */ (req, res) => landholdingController.getByRequestId(req, res));

export default router;