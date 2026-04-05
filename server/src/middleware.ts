import { Request, Response, NextFunction } from 'express';
import { findUserByApiKey, User } from './db.js';

export interface AuthRequest extends Request {
  user?: User;
  apiKey?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const apiKey = authHeader.split(' ')[1];
  
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token format' });
  }

  const user = findUserByApiKey(apiKey);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  req.apiKey = apiKey;
  next();
};
