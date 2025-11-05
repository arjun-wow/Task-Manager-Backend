import express from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protect all task routes
router.use(protect);

// Get all tasks for a project
router.get('/', getTasks);

// Create a new task
router.post('/', createTask);

// Update a task
router.put('/:id', updateTask);

// Delete a task
router.delete('/:id', deleteTask);

export default router;
