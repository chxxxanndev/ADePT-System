import express from 'express';
import { useMock } from '../config/supabase.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'healthy', mode: useMock ? 'mock' : 'supabase' });
});

export default router;