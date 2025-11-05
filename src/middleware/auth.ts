import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient';
import { User } from '@prisma/client';

// Extend Express globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Protect routes via JWT
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'Not authorized, no token provided' });

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'Server configuration error' });

      const decoded = jwt.verify(token, jwtSecret) as { id: number };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) return res.status(401).json({ message: 'Not authorized, user not found' });

      req.user = user;
      next();
    } catch (error: any) {
      console.error('JWT validation error:', error);
      if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token' });
      if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
      res.status(401).json({ message: 'Not authorized' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Passport fallback
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) return next();
  res.status(401).json({ message: 'Not authenticated via session' });
};

// Admin check
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized, no user found' });
  if ((req.user as any).role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden: Admin access required' });
  next();
};
