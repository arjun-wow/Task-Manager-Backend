import { Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';

// Get all projects for the logged-in user
export const getProjects = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  try {
    const projects = await prisma.project.findMany({
      where: {
        team: { some: { id: req.user.id } }
      },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a new project
export const createProject = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Project name is required' });

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        team: {
          connect: { id: req.user.id } // Connect the creator to the team
        }
      }
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};