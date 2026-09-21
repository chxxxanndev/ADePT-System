import express from 'express';
import landholdingController from './landholding.controller.js';

const router = express.Router();

router.post('/', (req, res) => landholdingController.save(req, res));
router.get('/:id', (req, res) => landholdingController.getById(req, res));
router.get('/request/:requestId', (req, res) => landholdingController.getByRequestId(req, res));
router.put('/:id/edit-draft', (req, res) => landholdingController.updateDraft(req, res));

export default router;