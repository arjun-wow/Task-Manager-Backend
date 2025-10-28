import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prismaClient';
import { User } from '@prisma/client';

// ✅ Extend Express.Request safely via declaration merging
declare global {
  namespace Express {
    interface Request {
      user?: User; // no need for | null — Express handles undefined already
    }
  }
}

// Middleware to protect routes using JWT
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

// ✅ Optional: Session-based auth for Passport users
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated via session' });
};
