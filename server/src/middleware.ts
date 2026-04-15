import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById, SafeUser, toSafeUser } from './db.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: string;
  user?: SafeUser;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Check both cookie and Authorization header
  let token = req.cookies?.auth_token;

  // Also check Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ success: false, error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded) || !decoded.userId) {
      return res.status(401).json({ success: false, error: '登录已过期' });
    }
    const user = await findUserById(decoded.userId as string);
    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }
    req.userId = decoded.userId;
    req.user = toSafeUser(user);
    next();
  } catch {
    return res.status(401).json({ success: false, error: '登录已过期' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.is_admin !== 1) {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  next();
}
