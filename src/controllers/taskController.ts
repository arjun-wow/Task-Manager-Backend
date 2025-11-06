import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

const canAccessProject = async (userId: number, projectId: number, role: string) => {
  if (role === 'ADMIN') return true;
  const project = await prisma.project.findFirst({
    where: { id: projectId, team: { some: { id: userId } } },
  });
  return !!project;
};

export const getTasks = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'Project ID is required' });

  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const hasAccess = await canAccessProject(user.id, Number(projectId), user.role);
  if (!hasAccess) return res.status(403).json({ message: 'Access denied to this project' });

  try {
    const tasks = await prisma.task.findMany({
      where:
        user.role === 'ADMIN'
          ? { projectId: Number(projectId) }
          : {
              projectId: Number(projectId),
              OR: [{ assigneeId: user.id }, { project: { team: { some: { id: user.id } } } }],
            },
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true, role: true } },
      },
    });

    res.json(tasks);
  } catch (err) {
    console.error('GET TASKS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const createTask = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { title, description, priority, dueDate, projectId, assigneeId } = req.body;

  if (!title || !projectId) return res.status(400).json({ message: 'Title and project required' });

  const hasAccess = await canAccessProject(user.id, Number(projectId), user.role);
  if (!hasAccess) return res.status(403).json({ message: 'You cannot add tasks here' });

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: Number(projectId),
        assigneeId: assigneeId ? Number(assigneeId) : user.id,
      },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('CREATE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { id } = req.params;
  const payload = req.body;

  try {
    const task = await prisma.task.findUnique({ where: { id: Number(id) } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await canAccessProject(user.id, task.projectId, user.role);
    if (!hasAccess) return res.status(403).json({ message: 'You cannot modify this task' });

    const updated = await prisma.task.update({
      where: { id: Number(id) },
      data: payload,
      include: { assignee: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error('UPDATE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const user = req.user as any;
  const { id } = req.params;

  try {
    const task = await prisma.task.findUnique({ where: { id: Number(id) } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await canAccessProject(user.id, task.projectId, user.role);
    if (!hasAccess) return res.status(403).json({ message: 'You cannot delete this task' });

    await prisma.task.delete({ where: { id: Number(id) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('DELETE TASK ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};
