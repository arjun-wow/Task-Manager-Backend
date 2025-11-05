import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

// --- Helper: Check user access to a project ---
/**
 * Checks if a user has access to a specific project.
 * Admins can access all projects.
 * Regular users can access only the ones they’re a team member of.
 */
const canAccessProject = async (userId: number, projectId: number, userRole: string) => {
  if (userRole === 'ADMIN') return true;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      team: { some: { id: userId } },
    },
  });

  return !!project;
};

// --- Get tasks for a specific project ---
export const getTasks = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  if (!projectId) {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = req.user as any;
  const hasAccess = await canAccessProject(user.id, Number(projectId), user.role);
  if (!hasAccess) {
    return res
      .status(403)
      .json({ message: 'You do not have permission to view tasks in this project.' });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: Number(projectId) },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
        subTasks: true,
        comments: true,
      },
    });

    res.json(tasks);
  } catch (err) {
    console.error('GET TASKS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Create a task ---
export const createTask = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = req.user as any;
  const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Title and Project ID are required' });
  }

  const hasAccess = await canAccessProject(user.id, Number(projectId), user.role);
  if (!hasAccess) {
    return res
      .status(403)
      .json({ message: 'You do not have permission to add tasks to this project.' });
  }

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: Number(projectId),
        assigneeId: assigneeId ? Number(assigneeId) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('CREATE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Update a task ---
export const updateTask = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = req.user as any;

  try {
    const { id } = req.params;
    const payload = req.body;

    const taskToUpdate = await prisma.task.findUnique({
      where: { id: Number(id) },
      select: { projectId: true },
    });

    if (!taskToUpdate) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await canAccessProject(user.id, taskToUpdate.projectId, user.role);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to modify tasks in this project.' });
    }

    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);
    if (payload.projectId) payload.projectId = Number(payload.projectId);
    if (payload.assigneeId) payload.assigneeId = Number(payload.assigneeId);
    if (payload.hasOwnProperty('assigneeId') && payload.assigneeId === null) {
      payload.assigneeId = null;
    }

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: payload,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.json(task);
  } catch (err) {
    console.error('UPDATE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Delete a task ---
export const deleteTask = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  const user = req.user as any;

  try {
    const { id } = req.params;

    const taskToDelete = await prisma.task.findUnique({
      where: { id: Number(id) },
      select: { projectId: true },
    });

    if (!taskToDelete) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const hasAccess = await canAccessProject(user.id, taskToDelete.projectId, user.role);
    if (!hasAccess) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to delete tasks in this project.' });
    }

    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('DELETE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};
