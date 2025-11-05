import { Request, Response } from 'express';
import { prisma } from '../utils/prismaClient';

// --- Get all users (admin-only in routes) ---
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (err) {
    console.error('GET ALL USERS ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- Update a user’s role (admin-only) ---
export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body; // expects { "role": "ADMIN" } or { "role": "USER" }

  if (!role || !['ADMIN', 'USER'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Must be ADMIN or USER.' });
  }

  const user = req.user as any;
  if (Number(id) === user?.id) {
    return res.status(400).json({ message: 'Admin cannot change their own role.' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { role },
      select: { id: true, name: true, email: true, avatarUrl: true, role: true },
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('UPDATE USER ROLE ERROR:', err);
    res.status(500).json({ message: 'Error updating user role', error: err });
  }
};

// --- Delete a user (admin-only) ---
export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminUser = req.user as any;

  if (Number(id) === adminUser?.id) {
    return res.status(400).json({ message: 'Admin cannot delete their own account.' });
  }

  try {
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ message: 'User deleted successfully.' });
  } catch (err: any) {
    console.error('DELETE USER ERROR:', err);

    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(500).json({ message: 'Error deleting user', error: err });
  }
};
