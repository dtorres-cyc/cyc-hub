import { Router, Response } from 'express';
import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import path from 'path';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logActivity } from '../middleware/activityLogger';
import { upload } from './attachments';

const router = Router();
const prisma = new PrismaClient();

const taskInclude = {
  proyecto: true,
  area: true,
  responsable: { select: { id: true, nombre: true, email: true, avatar: true, rol: true } },
  seguidores: { select: { id: true, nombre: true, avatar: true } },
  subtareas: { orderBy: { orden: 'asc' as const } },
  archivos: { include: { subidoPor: { select: { id: true, nombre: true } } } },
  comentarios: {
    include: { autor: { select: { id: true, nombre: true, avatar: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  actividad: {
    include: { usuario: { select: { id: true, nombre: true, avatar: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 10,
  },
};

router.use(authMiddleware);

// GET /api/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, proyecto, area, prioridad, estado } = req.query;
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { titulo: { contains: String(search), mode: 'insensitive' } },
      { descripcion: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (proyecto) where.proyectoId = String(proyecto);
  if (area) where.areaId = String(area);
  if (prioridad) where.prioridad = prioridad as TaskPriority;
  if (estado) where.estado = estado as TaskStatus;

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { updatedAt: 'desc' },
  });
  res.json(tasks);
});

// GET /api/tasks/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude });
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(task);
});

// POST /api/tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  const { titulo, descripcion, estado, prioridad, proyectoId, areaId, responsableId, fechaInicio, fechaFin, progreso, tags } = req.body;
  const task = await prisma.task.create({
    data: {
      titulo,
      descripcion,
      estado: estado || TaskStatus.BACKLOG,
      prioridad: prioridad || TaskPriority.MEDIA,
      proyectoId: proyectoId || null,
      areaId: areaId || null,
      responsableId: responsableId || null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      progreso: progreso || 0,
      tags: tags || [],
    },
    include: taskInclude,
  });
  await logActivity(task.id, req.userId, 'CREATED', `Tarea creada: ${titulo}`);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const { titulo, descripcion, estado, prioridad, proyectoId, areaId, responsableId, fechaInicio, fechaFin, progreso, tags } = req.body;
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      titulo,
      descripcion,
      estado,
      prioridad,
      proyectoId: proyectoId || null,
      areaId: areaId || null,
      responsableId: responsableId || null,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      progreso,
      tags: tags || [],
    },
    include: taskInclude,
  });
  await logActivity(task.id, req.userId, 'UPDATED', 'Tarea actualizada');
  res.json(task);
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { estado } = req.body;
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { estado },
    include: taskInclude,
  });
  await logActivity(task.id, req.userId, 'STATUS_CHANGED', `Estado cambiado a ${estado}`);
  res.json(task);
});

// PATCH /api/tasks/:id/progress
router.patch('/:id/progress', async (req: AuthRequest, res: Response) => {
  const { progreso } = req.body;
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { progreso: Math.min(100, Math.max(0, progreso)) },
    include: taskInclude,
  });
  await logActivity(task.id, req.userId, 'PROGRESS_UPDATED', `Progreso actualizado a ${progreso}%`);
  res.json(task);
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// POST /api/tasks/:id/subtasks
router.post('/:id/subtasks', async (req: AuthRequest, res: Response) => {
  const { texto, orden } = req.body;
  const subtask = await prisma.subtask.create({
    data: { tareaId: req.params.id, texto, orden: orden || 0 },
  });
  await logActivity(req.params.id, req.userId, 'SUBTASK_ADDED', texto);
  res.status(201).json(subtask);
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req: AuthRequest, res: Response) => {
  const { texto, autorId } = req.body;
  const comment = await prisma.comment.create({
    data: { tareaId: req.params.id, texto, autorId: autorId || req.userId || '' },
    include: { autor: { select: { id: true, nombre: true, avatar: true } } },
  });
  await logActivity(req.params.id, req.userId, 'COMMENT_ADDED', texto.slice(0, 100));
  res.status(201).json(comment);
});

// POST /api/tasks/:id/attachments
router.post('/:id/attachments', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No se proporcionó archivo' });
  const { originalname, mimetype, size, filename } = req.file;
  const url = `/uploads/${filename}`;
  const attachment = await prisma.attachment.create({
    data: {
      tareaId: req.params.id,
      nombre: originalname,
      url,
      tamanio: size,
      tipo: mimetype,
      subidoPorId: req.userId || null,
    },
    include: { subidoPor: { select: { id: true, nombre: true } } },
  });
  await logActivity(req.params.id, req.userId, 'FILE_UPLOADED', originalname);
  res.status(201).json(attachment);
});

export default router;
