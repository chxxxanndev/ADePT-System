import express from 'express';
import { createTaxDeclaration, getTaxDeclaration, updateDraft } from './taxDeclaration.controller.js';

const router = express.Router();

// POST /api/tax-declarations         — Create a new tax declaration
router.post('/', createTaxDeclaration);

// GET  /api/tax-declarations/:requestId — Fetch TD by parent request ID
router.get('/:requestId', getTaxDeclaration);

router.put('/:id/edit-draft', updateDraft);

export default router;
