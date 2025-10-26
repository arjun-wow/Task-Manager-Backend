import express from 'express';
import { getAllUsers } from '../controllers/userController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All user routes are protected
router.use(protect);

// GET /api/users
router.get('/', (req, res) => getAllUsers(req as AuthRequest, res));

export default router;