import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// DELETE /api/comments/:id
router.delete('/comments/:id', async (req: Request, res: Response) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
  await prisma.comment.delete({ where: { id: req.params.id } });
  await logActivity(comment.tareaId, (req as AuthRequest).userId, 'COMMENT_DELETED', '');
  res.json({ success: true });
});

export default router;
