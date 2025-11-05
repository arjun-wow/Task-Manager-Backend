import { Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';
// No need to import 'Role'

// Get all projects for the logged-in user
export const getProjects = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  
  try {
    // --- ADMIN LOGIC ---
    // 1. Define the 'where' clause based on role
    
    // --- THIS IS THE FIX ---
    // Change Role.ADMIN to the string 'ADMIN'
    const whereClause = req.user.role === 'ADMIN'
      ? {} // Admin: empty 'where' means find all
      : { team: { some: { id: req.user.id } } }; // User: find projects they are on
    // --- END OF FIX ---

    const projects = await prisma.project.findMany({
      where: whereClause, // 2. Apply the dynamic 'where' clause
      include: {
        team: { select: { id: true, name: true, avatarUrl: true, role: true } } // Also include team member roles
      },
       orderBy: { name: 'asc' }
    });
    res.json(projects);
  } catch (err) {
      console.error("GET PROJECTS ERROR:", err); // Keep this log
      res.status(500).json({ message: 'Server error', error: err });
  }
};

// Create a new project
export const createProject = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  
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
          connect: { id: req.user.id } // Connect the creator to the team
        }
      },
      include: { // Include team in the response for immediate UI update
        team: { select: { id: true, name: true, avatarUrl: true, role: true } }
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

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }
    const projectId = Number(id);

    try {
        // 1. Find the project to ensure it exists and the user is part of the team
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
            },
            include: {
                team: { select: { id: true } } // Select only IDs for the team check
            }
        });

        // If project not found
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }

        // 2. Check permission: User must be on the team OR be an admin
        const isMember = project.team.some(member => member.id === userId);
        if (!isMember && req.user.role !== 'ADMIN') { // Correct check
             return res.status(403).json({ message: 'You do not have permission to delete this project.' });
        }
        
        // 3. Delete the project
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
        res.status(500).json({ message: 'Server error during project deletion', error: err });
    }
};