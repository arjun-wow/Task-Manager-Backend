import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';

// Get tasks FOR A SPECIFIC PROJECT
export const getTasks = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: Number(projectId) },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
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
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;
    
    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and Project ID are required' });
    }

    const task = await prisma.task.create({
      data: { 
        title, 
        description, 
        status, 
        priority, 
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: Number(projectId),
        assigneeId: assigneeId ? Number(assigneeId) : null
      }
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    // Ensure dates are handled correctly
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);
    
    // Handle number conversions
    if (payload.projectId) payload.projectId = Number(payload.projectId);
    if (payload.assigneeId) payload.assigneeId = Number(payload.assigneeId);

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: payload,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // In a real enterprise app, you'd also delete related comments, subtasks, etc.
    // Or handle cascade deletes in Prisma schema.
    
    // For now, just delete the task
    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err });
  }
};