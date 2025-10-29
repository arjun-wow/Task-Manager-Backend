import express from 'express';
import { getAllUsers } from '../controllers/userController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', (req, res) => getAllUsers(req as AuthRequest, res));

export default router;