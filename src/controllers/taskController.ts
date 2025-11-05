import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client'; // <-- INJECTED Import Role

// --- INJECTED HELPER FUNCTION ---
/**
 * Checks if a user has access to a specific project.
 * Admins have access to all projects.
 * Users have access only to projects they are a team member of.
 */
const canAccessProject = async (userId: number, projectId: number, userRole: Role) => {
    if (userRole === Role.ADMIN) {
        return true; // Admins can access all projects
    }
    
    // Check if the user is on the project's team
    const project = await prisma.project.findFirst({
        where: {
            id: projectId,
            team: { some: { id: userId } }
        }
    });
    return !!project; // Returns true if project is found (user is member), false otherwise
};
// --- END INJECTION ---


// Get tasks FOR A SPECIFIC PROJECT
export const getTasks = async (req: AuthRequest, res: Response) => { // <-- MODIFIED to AuthRequest
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }
  // --- INJECTED USER AND PERMISSION CHECK ---
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  const hasAccess = await canAccessProject(req.user.id, Number(projectId), req.user.role);
  if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to view tasks in this project.' });
  }
  // --- END INJECTION ---

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: Number(projectId) },
      orderBy: { createdAt: 'desc' },
      include: {
        // --- MODIFIED to include role ---
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
        subTasks: true,
        comments: true
      }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  // --- INJECTED USER CHECK ---
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  // --- END INJECTION ---

  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;
    
    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and Project ID are required' });
    }

    // --- INJECTED PERMISSION CHECK ---
    const hasAccess = await canAccessProject(req.user.id, Number(projectId), req.user.role);
    if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to add tasks to this project.' });
    }
    // --- END INJECTION ---

    const task = await prisma.task.create({
      data: { 
        title, 
        description, 
        status, 
        priority, 
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: Number(projectId),
        assigneeId: assigneeId ? Number(assigneeId) : null
      },
      // --- MODIFIED to include role ---
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => { // <-- MODIFIED to AuthRequest
  // --- INJECTED USER CHECK ---
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  // --- END INJECTION ---

  try {
    const { id } = req.params;
    const payload = req.body;
    
    // --- INJECTED PERMISSION CHECK ---
    const taskToUpdate = await prisma.task.findUnique({ 
        where: { id: Number(id) },
        select: { projectId: true } // Only need projectId for the check
    });
    if (!taskToUpdate) {
        return res.status(404).json({ message: 'Task not found' });
    }
    const hasAccess = await canAccessProject(req.user.id, taskToUpdate.projectId, req.user.role);
    if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to modify tasks in this project.' });
    }
    // --- END INJECTION ---
    
    // Ensure dates are handled correctly
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);
    
    // Handle number conversions
    if (payload.projectId) payload.projectId = Number(payload.projectId);
    if (payload.assigneeId) payload.assigneeId = Number(payload.assigneeId);
    if (payload.hasOwnProperty('assigneeId') && payload.assigneeId === null) {
      payload.assigneeId = null; // Explicitly allow un-assigning
    }

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: payload,
      include: {
        // --- MODIFIED to include role ---
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => { // <-- MODIFIED to AuthRequest
  // --- INJECTED USER CHECK ---
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  // --- END INJECTION ---

  try {
    const { id } = req.params;
    
    // --- INJECTED PERMISSION CHECK ---
    const taskToDelete = await prisma.task.findUnique({ 
        where: { id: Number(id) },
        select: { projectId: true } // Only need projectId for the check
    });
    if (!taskToDelete) {
        return res.status(404).json({ message: 'Task not found' });
    }
    const hasAccess = await canAccessProject(req.user.id, taskToDelete.projectId, req.user.role);
    if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to delete tasks in this project.' });
    }
    // --- END INJECTION ---
    
    // The comment in your original file is now handled by `onDelete: Cascade` in schema.prisma
    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    // --- MODIFIED error logging ---
    console.error("DELETE TASK ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};