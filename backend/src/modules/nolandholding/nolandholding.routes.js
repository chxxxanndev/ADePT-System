import { Router } from 'express';
import noLandholdingController from './nolandholding.controller.js';

const router = Router();
router.post('/', (req, res) => noLandholdingController.save(req, res));
router.get('/request/:requestId', (req, res) => noLandholdingController.getByRequestId(req, res));

export default router;