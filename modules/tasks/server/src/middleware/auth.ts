import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    // Para desarrollo permitimos acceso sin token, usando usuario por defecto
    req.userId = undefined;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    req.userId = undefined;
    next();
  }
}
