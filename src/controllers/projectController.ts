import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

// Get all projects for the logged-in user
export const getProjects = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  try {
    const user = req.user as any;

    // Define where clause dynamically
    const whereClause =
      user.role === 'ADMIN'
        ? {} // Admin: see all projects
        : { team: { some: { id: user.id } } }; // Regular user: only team projects

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        team: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(projects);
  } catch (err) {
    console.error('GET PROJECTS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a new project
export const createProject = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { name, description } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description,
        team: {
          connect: { id: user.id },
        },
      },
      include: {
        team: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error('--- CREATE PROJECT ERROR ---');
    console.error(err);
    console.error('--- END CREATE PROJECT ERROR ---');
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ message: 'Invalid Project ID provided.' });
  }

  const projectId = Number(id);

  try {
    // Find project
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      include: { team: { select: { id: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Permission check
    const isMember = project.team.some((member) => member.id === user.id);
    if (!isMember && user.role !== 'ADMIN') {
      return res
        .status(403)
        .json({ message: 'You do not have permission to delete this project.' });
    }

    // Delete project
    await prisma.project.delete({ where: { id: projectId } });

    console.log(
      `Project "${project.name}" (ID: ${projectId}) deleted by User ID: ${user.id}`
    );
    res.json({ message: `Project "${project.name}" deleted successfully.` });
  } catch (err) {
    console.error('--- DELETE PROJECT ERROR ---');
    console.error(`Error deleting project ID: ${projectId} by User ID: ${user.id}`);
    console.error(err);
    console.error('--- END DELETE PROJECT ERROR ---');
    res
      .status(500)
      .json({ message: 'Server error during project deletion', error: err });
  }
};
