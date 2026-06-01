export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'ALTA' | 'MEDIA' | 'BAJA';
export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERADOR';
export type ViewType = 'kanban' | 'table' | 'calendar' | 'gantt';

export interface User {
  id: string;
  nombre: string;
  email: string;
  avatar: string | null;
  rol: UserRole;
}

export interface Project {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  activo: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  color: string;
}

export interface Subtask {
  id: string;
  texto: string;
  completada: boolean;
  orden: number;
  tareaId: string;
}

export interface Attachment {
  id: string;
  nombre: string;
  url: string;
  tamanio: number;
  tipo: string;
  createdAt: string;
  tareaId: string;
  subidoPor?: { id: string; nombre: string } | null;
}

export interface Comment {
  id: string;
  texto: string;
  createdAt: string;
  tareaId: string;
  autor: { id: string; nombre: string; avatar: string | null };
}

export interface ActivityLog {
  id: string;
  accion: string;
  detalle: string | null;
  createdAt: string;
  tareaId: string;
  usuario?: { id: string; nombre: string; avatar: string | null } | null;
}

export interface Task {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: TaskStatus;
  prioridad: TaskPriority;
  progreso: number;
  tags: string[];
  fechaInicio: string | null;
  fechaFin: string | null;
  createdAt: string;
  updatedAt: string;
  proyectoId: string | null;
  proyecto: Project | null;
  areaId: string | null;
  area: Area | null;
  responsableId: string | null;
  responsable: User | null;
  seguidores: User[];
  subtareas: Subtask[];
  archivos: Attachment[];
  comentarios: Comment[];
  actividad: ActivityLog[];
}

export interface Filters {
  search: string;
  proyecto: string;
  area: string;
  prioridad: string;
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  BACKLOG:     { label: 'Backlog',      color: '#5a6a84', bg: 'bg-[#5a6a84]' },
  TODO:        { label: 'Por hacer',    color: '#3b82f6', bg: 'bg-[#3b82f6]' },
  IN_PROGRESS: { label: 'En progreso',  color: '#f59e0b', bg: 'bg-[#f59e0b]' },
  IN_REVIEW:   { label: 'En revisión',  color: '#8b5cf6', bg: 'bg-[#8b5cf6]' },
  DONE:        { label: 'Listo',        color: '#10b981', bg: 'bg-[#10b981]' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  ALTA:  { label: 'Alta',  color: 'text-red-400',    dot: 'bg-red-400' },
  MEDIA: { label: 'Media', color: 'text-amber-400',  dot: 'bg-amber-400' },
  BAJA:  { label: 'Baja',  color: 'text-green-400',  dot: 'bg-green-400' },
};
