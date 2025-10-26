import { Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';

// Get all users in the system (for directories)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        avatarUrl: true 
        // We can add a 'role' to the schema later
      }
    });
    res.json(users);
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};