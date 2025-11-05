import express from 'express';
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/userController';
import { protect, isAdmin } from '../middleware/auth'; // ✅ single import now

const router = express.Router();

// Protect and restrict to admins
router.use(protect);
router.use(isAdmin);

router.get('/', getAllUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
