import express from 'express';
import { createTaxDeclaration, getTaxDeclaration } from '../controllers/taxDeclaration.controller.js';

const router = express.Router();

// POST /api/tax-declarations         — Create a new tax declaration
router.post('/', createTaxDeclaration);

// GET  /api/tax-declarations/:requestId — Fetch TD by parent request ID
router.get('/:requestId', getTaxDeclaration);

export default router;
