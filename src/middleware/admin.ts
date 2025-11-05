import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth'; // Import our existing AuthRequest

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    // This middleware must run AFTER the 'protect' middleware
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    // If user is admin, proceed
    next();
};