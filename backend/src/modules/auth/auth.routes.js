import express from 'express';
import { register, login, forgotPassword, reactivate } from './auth.controller.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/reactivate', reactivate);
router.post('/forgot-password', forgotPassword);

export default router;