import express from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
    updateProfile,
    uploadPhoto,
    updateEmail,
    changePassword,
    setAccountStatus,
} from './account.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);

router.put('/profile', updateProfile);
router.post('/photo', upload.single('photo'), uploadPhoto);
router.put('/email', updateEmail);
router.put('/password', changePassword);
router.patch('/status', setAccountStatus);

export default router;