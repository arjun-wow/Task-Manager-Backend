import { Request, Response, NextFunction } from 'express';

/**
 * Admin-only middleware.
 * Must run AFTER the 'protect' middleware attaches req.user.
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user found' });
  }

  if ((req.user as any).role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};
