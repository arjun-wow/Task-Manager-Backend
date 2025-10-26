import express from 'express';
import { getProjects, createProject } from '../controllers/projectController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply protect middleware to all project routes
router.use(protect);

router.get('/', (req, res) => getProjects(req as AuthRequest, res));
router.post('/', (req, res) => createProject(req as AuthRequest, res));

export default router;