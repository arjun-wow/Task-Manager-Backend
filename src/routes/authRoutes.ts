import express from 'express';
import { registerUser, loginUser, getMe } from '../controllers/authController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, (req, res) => getMe(req as AuthRequest, res));

export default router;