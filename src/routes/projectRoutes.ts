import express from 'express';
import { getProjects, createProject, deleteProject } from '../controllers/projectController';
import { protect, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', (req, res) => getProjects(req as AuthRequest, res));

router.post('/', (req, res) => createProject(req as AuthRequest, res));

router.delete('/:id', (req, res) => deleteProject(req as AuthRequest, res));


export default router;

