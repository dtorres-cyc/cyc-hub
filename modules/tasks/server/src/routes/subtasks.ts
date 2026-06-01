import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// PATCH /api/subtasks/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const { texto, completada } = req.body;
  const subtask = await prisma.subtask.update({
    where: { id: req.params.id },
    data: { texto, completada },
  });
  await logActivity(subtask.tareaId, (req as AuthRequest).userId, 'SUBTASK_UPDATED', texto || (completada ? 'completada' : 'pendiente'));
  res.json(subtask);
});

// DELETE /api/subtasks/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const subtask = await prisma.subtask.delete({ where: { id: req.params.id } });
  await logActivity(subtask.tareaId, (req as AuthRequest).userId, 'SUBTASK_DELETED', subtask.texto);
  res.json({ success: true });
});

export default router;
