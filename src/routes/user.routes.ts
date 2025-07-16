import { Router } from 'express';
import { updateProfile, getMe } from '../controllers/user.controller';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/me', verifyToken, getMe);        // ← Add this line
router.put('/profile', verifyToken, updateProfile);

export default router;
