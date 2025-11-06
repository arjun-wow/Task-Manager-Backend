import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

export const getAllUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('GET ALL USERS ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTeamForUser = async (req: any, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  try {
    const user = req.user as any;

    const team = user.role === 'ADMIN'
      ? await prisma.user.findMany({
          select: { id: true, name: true, role: true, avatarUrl: true },
          orderBy: { name: 'asc' },
        })
      : await prisma.user.findMany({
          where: {
            projects: { some: { id: { in: (await prisma.project.findMany({
              where: { team: { some: { id: user.id } } },
              select: { id: true },
            })).map(p => p.id) } } },
          },
          select: { id: true, name: true, role: true, avatarUrl: true },
        });

    res.json(team);
  } catch (err) {
    console.error('GET TEAM ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['ADMIN', 'USER'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

  try {
    const updated = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('UPDATE USER ROLE ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
