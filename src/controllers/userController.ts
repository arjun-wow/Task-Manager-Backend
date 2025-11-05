import { Response } from 'express';
import { prisma } from '../utils/prismaClient';
import { AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client'; // <-- INJECTED Import Role enum

// Get all users (This will be protected by admin middleware in the route file)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true // <-- INJECTED role
      },
      orderBy: { // Added sorting for consistency
        name: 'asc'
      }
    });
    res.json(users);
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// --- INJECTED NEW FUNCTIONS ---

/**
 * [ADMIN ONLY] Updates a user's role.
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body; // Expecting { "role": "ADMIN" } or { "role": "USER" }

    // Validate the incoming role
    if (!role || !(role in Role)) {
         return res.status(400).json({ message: `Invalid role specified. Must be one of: ${Object.keys(Role)}` });
    }
    
    // Prevent admin from changing their own role via this endpoint
    if (Number(id) === req.user?.id) {
        return res.status(400).json({ message: 'Admin cannot change their own role here.' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { role: role as Role }, // Cast role string to Role enum
            select: { id: true, name: true, email: true, avatarUrl: true, role: true }
        });
        res.json(updatedUser);
    } catch (err) {
        console.error("UPDATE USER ROLE ERROR:", err);
        res.status(500).json({ message: 'Error updating user role', error: err });
    }
};

/**
 * [ADMIN ONLY] Deletes a user.
 */
export const deleteUser = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const adminUserId = req.user?.id;

    // Prevent admin from deleting themselves
    if (Number(id) === adminUserId) {
        return res.status(400).json({ message: 'Admin cannot delete their own account.' });
    }

    try {
        // Cascade deletes (on comments, etc.) are handled by the Prisma Schema
        await prisma.user.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
         console.error("DELETE USER ERROR:", err);
         // Handle cases where user might not exist
         if ((err as any).code === 'P2025') { // Prisma code for record not found
            return res.status(404).json({ message: 'User not found.' });
         }
         res.status(500).json({ message: 'Error deleting user', error: err });
    }
};
// --- END OF INJECTED CODE ---