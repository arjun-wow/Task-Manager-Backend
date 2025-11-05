import express from 'express';
import { getProjects, createProject, deleteProject } from '../controllers/projectController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all project routes
router.use(protect);

// Get all projects
router.get('/', (req, res) => getProjects(req, res));

// Create a new project
router.post('/', (req, res) => createProject(req, res));

// Delete a project
router.delete('/:id', (req, res) => deleteProject(req, res));

export default router;
