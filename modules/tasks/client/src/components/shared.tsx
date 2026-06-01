import type { Task, TaskStatus, TaskPriority } from '../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../types';

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: cfg.color + '33', color: cfg.color, border: `1px solid ${cfg.color}55` }}
    >
      {cfg.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
    </span>
  );
}

export function Avatar({ user, size = 7 }: { user: { nombre: string; avatar?: string | null }; size?: number }) {
  const initials = user.avatar || user.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-amber-600', 'bg-red-600', 'bg-teal-600'];
  const colorIdx = user.nombre.charCodeAt(0) % colors.length;
  return (
    <div className={`w-${size} h-${size} rounded-full ${colors[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export function ProgressBar({ value, small = false }: { value: number; small?: boolean }) {
  const color = value === 100 ? '#10b981' : value > 60 ? '#3b82f6' : value > 30 ? '#f59e0b' : '#5a6a84';
  return (
    <div className={`w-full bg-[#1e2535] rounded-full overflow-hidden ${small ? 'h-1' : 'h-1.5'}`}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

export function isOverdue(task: Task) {
  return task.fechaFin && new Date(task.fechaFin) < new Date() && task.estado !== 'DONE';
}

export function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileIcon(mime: string) {
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return '📊';
  if (mime.includes('word')) return '📝';
  if (mime.includes('image')) return '🖼️';
  return '📎';
}
