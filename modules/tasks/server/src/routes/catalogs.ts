import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/projects', async (_req: Request, res: Response) => {
  const projects = await prisma.project.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } });
  res.json(projects);
});

router.get('/areas', async (_req: Request, res: Response) => {
  const areas = await prisma.area.findMany({ orderBy: { nombre: 'asc' } });
  res.json(areas);
});

router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, nombre: true, email: true, avatar: true, rol: true },
    orderBy: { nombre: 'asc' },
  });
  res.json(users);
});

export default router;
