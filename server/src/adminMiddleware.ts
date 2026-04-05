import { Response, NextFunction } from 'express';
import { AuthRequest } from './middleware.js';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
  }

  next();
};
