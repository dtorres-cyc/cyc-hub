import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export async function logActivity(
  tareaId: string,
  usuarioId: string | undefined,
  accion: string,
  detalle?: string
) {
  try {
    await prisma.activityLog.create({
      data: { tareaId, usuarioId: usuarioId || null, accion, detalle },
    });
  } catch (e) {
    // No lanzar error si el log falla
  }
}

export function activityMiddleware(accion: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode < 400 && req.params.id) {
        logActivity(req.params.id, req.userId, accion, JSON.stringify(req.body).slice(0, 200));
      }
      return originalJson(body);
    };
    next();
  };
}
