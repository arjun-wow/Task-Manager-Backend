import express from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Protect all task routes
router.use(protect);

router.get('/', getTasks);
router.post('/', (req, res) => createTask(req as AuthRequest, res));
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;