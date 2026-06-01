import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';

const router = Router();
const prisma = new PrismaClient();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/csv',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
    }
  },
});

router.use(authMiddleware);

// POST /api/tasks/:id/attachments — handled in tasks router
// This router handles DELETE /api/attachments/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const attachment = await prisma.attachment.findUnique({ where: { id: req.params.id } });
  if (!attachment) return res.status(404).json({ error: 'Archivo no encontrado' });

  // Delete physical file
  const filePath = path.join(UPLOAD_DIR, path.basename(attachment.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.attachment.delete({ where: { id: req.params.id } });
  await logActivity(attachment.tareaId, req.userId, 'FILE_DELETED', attachment.nombre);
  res.json({ success: true });
});

export { upload };
export default router;
