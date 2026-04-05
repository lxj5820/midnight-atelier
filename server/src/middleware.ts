import { Request, Response, NextFunction } from 'express';
import { findUserByApiKey, User } from './db.js';

export interface AuthRequest extends Request {
  user?: User;
  apiKey?: string;
}

/**
 * 从请求中获取 API Key（优先从 httpOnly Cookie 获取）
 */
function getApiKeyFromRequest(req: AuthRequest): string | null {
  // 1. 优先从 httpOnly Cookie 获取（最安全）
  const cookieToken = req.cookies?.auth_token;
  if (cookieToken) return cookieToken;

  // 2. 从 Authorization Header 获取（向后兼容）
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) return token;
  }

  return null;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = getApiKeyFromRequest(req);

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const user = findUserByApiKey(apiKey);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }

  req.user = user;
  req.apiKey = apiKey;
  next();
};
