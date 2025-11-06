import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

// Get all projects (Admin → all, User → team only)
export const getProjects = async (req: any, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  try {
    const user = req.user as any;
    const whereClause = user.role === 'ADMIN' ? {} : { team: { some: { id: user.id } } };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        team: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(projects);
  } catch (err) {
    console.error('GET PROJECTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a project (Admin can assign PMO; users auto-assign to self)
export const createProject = async (req: any, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { name, description, pmoId } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    const existing = await prisma.project.findFirst({
      where: { name: name.trim() },
    });
    if (existing) {
      return res.status(409).json({ message: 'Project with this name already exists' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description || null,
        team: {
          connect: { id: user.id },
        },
        ...(user.role === 'ADMIN' && pmoId ? { team: { connect: [{ id: user.id }, { id: Number(pmoId) }] } } : {}),
      },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error('CREATE PROJECT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Delete project (Admin can delete any; User only if team member)
export const deleteProject = async (req: any, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { id } = req.params;
  const projectId = Number(id);

  if (!projectId) return res.status(400).json({ message: 'Invalid Project ID' });

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: { team: { select: { id: true } } },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isMember = project.team.some((m: any) => m.id === user.id);
    if (!isMember && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You do not have permission to delete this project.' });
    }

    await prisma.project.delete({ where: { id: projectId } });
    res.json({ message: `Project "${project.name}" deleted successfully.` });
  } catch (err) {
    console.error('DELETE PROJECT ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};
