import express from 'express';
import { getAllUsers, getTeamForUser, updateUserRole, deleteUser } from '../controllers/userController';
import { protect, isAdmin } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', isAdmin, getAllUsers);
router.get('/team', getTeamForUser);
router.put('/:id/role', isAdmin, updateUserRole);
router.delete('/:id', isAdmin, deleteUser);

export default router;
