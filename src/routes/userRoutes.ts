import express from 'express';
// --- INJECTED imports for admin functions ---
import { getAllUsers, updateUserRole, deleteUser } from '../controllers/userController';
import { protect, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/admin'; // <-- INJECTED isAdmin

const router = express.Router();

// Protect ALL user routes first
router.use(protect);
// --- INJECTED: Now, ensure only ADMINS can access user routes ---
router.use(isAdmin); 

// GET /api/users - Now admin only
router.get('/', (req, res) => getAllUsers(req as AuthRequest, res));

// --- INJECTED: New admin-only routes for managing users ---

// PUT /api/users/:id/role - Update a user's role
router.put('/:id/role', (req, res) => updateUserRole(req as AuthRequest, res));

// DELETE /api/users/:id - Delete a user
router.delete('/:id', (req, res) => deleteUser(req as AuthRequest, res));
// --- END INJECTION ---


export default router;