import express from 'express';
import { createTaxDeclaration, getTaxDeclaration, updateDraft } from './taxDeclaration.controller.js';

const router = express.Router();

router.post('/', createTaxDeclaration);
router.get('/:requestId', getTaxDeclaration);
router.put('/:id/edit-draft', updateDraft);

export default router;
