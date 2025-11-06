import express from 'express';
import { getProjects, createProject, deleteProject } from '../controllers/projectController';
import { protect, isAdmin } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getProjects);
router.post('/', createProject);
router.delete('/:id', deleteProject);

export default router;
