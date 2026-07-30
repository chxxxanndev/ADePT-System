import express from 'express';
import landholdingController from './landholding.controller.js';

const router = express.Router();

/**
 * POST /api/landholding
 * Saves or updates a landholding certificate record.
 */
router.post('/', (req, res) => landholdingController.save(req, res));

/**
 * GET /api/landholding/:id
 * Fetches full certificate data (with rows and OR info) by the Certificate UUID.
 */
router.get('/:id', (req, res) => landholdingController.getById(req, res));

/**
 * GET /api/landholding/request/:requestId
 * Fetches the certificate associated with a specific Request ID.
 */
router.get('/request/:requestId', (req, res) => landholdingController.getByRequestId(req, res));

/**
 * PUT /api/landholding/:id/edit-draft
 * Updates an existing certificate draft.
 */
router.put('/:id/edit-draft', (req, res) => landholdingController.updateDraft(req, res));

export default router;