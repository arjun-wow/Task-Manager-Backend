import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient';
import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User; 
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("JWT_SECRET not set in environment variables");
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, jwtSecret) as { id: number };

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      next();

    } catch (error: any) {
      console.error("JWT validation error:", error);

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }

      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated via session' });
};

// --- NEW FUNCTION INJECTED ---
/**
 * Checks if the user is an ADMIN.
 * This middleware MUST run AFTER the 'protect' middleware.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // 'protect' middleware should have already attached req.user
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    // Check the 'role' field (added from schema update)
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // If user is an admin, proceed to the next handler
    next();
};
// --- END OF INJECTED CODE ---


export interface AuthRequest extends Request {
  user?: any;
}