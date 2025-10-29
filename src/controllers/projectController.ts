import { Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';

export const getProjects = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  try {
    const projects = await prisma.project.findMany({
      where: {
        team: { some: { id: req.user.id } }
      },
      include: {
        team: { select: { id: true, name: true, avatarUrl: true } }
      },
       orderBy: { 
           name: 'asc'
       }
    });
    res.json(projects);
  } catch (err) {
    console.error("GET PROJECTS ERROR:", err); 
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a new project
export const createProject = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const { name, description } = req.body;
  if (!name || name.trim() === '') { // Added trim check
       return res.status(400).json({ message: 'Project name is required' });
  }


  try {
    const project = await prisma.project.create({
      data: {
        name: name.trim(), // Trim name before saving
        description,
        team: {
          connect: { id: req.user.id } // Connect the creator to the team
        }
      },
      include: { // Include team in the response for immediate UI update
        team: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    res.status(201).json(project);
  } catch (err) {
    console.error("--- CREATE PROJECT ERROR ---");
    console.error(err);
    console.error("--- END CREATE PROJECT ERROR ---");
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- NEW: Delete a Project ---
export const deleteProject = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    const { id } = req.params; // Get project ID from URL parameter
    const userId = req.user.id;

    if (!id || isNaN(Number(id))) { // Add validation for ID
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }
    const projectId = Number(id);

    try {
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                team: { some: { id: userId } } // Check if user is in the team
            }
        });

        if (!project) {
            const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
            if (!projectExists) {
                 return res.status(404).json({ message: 'Project not found.' });
            } else {
                 return res.status(403).json({ message: 'You do not have permission to delete this project.' });
            }
        }

        await prisma.project.delete({
            where: { id: projectId }
        });

        console.log(`Project "${project.name}" (ID: ${projectId}) deleted by User ID: ${userId}`);
        res.json({ message: `Project "${project.name}" deleted successfully.` });

    } catch (err) {
        console.error("--- DELETE PROJECT ERROR ---");
        console.error(`Error deleting project ID: ${projectId} by User ID: ${userId}`);
        console.error(err);
        console.error("--- END DELETE PROJECT ERROR ---");
        // Handle potential errors, e.g., if cascade delete fails unexpectedly
        res.status(500).json({ message: 'Server error during project deletion', error: err });
    }
};

