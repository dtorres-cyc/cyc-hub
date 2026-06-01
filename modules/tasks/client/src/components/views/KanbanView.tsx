import { useState } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { useStore } from '../../store';
import type { Task, TaskStatus } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Avatar, ProgressBar, isOverdue, formatDate } from '../shared';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'BACKLOG',     label: 'Backlog' },
  { status: 'TODO',        label: 'Por hacer' },
  { status: 'IN_PROGRESS', label: 'En progreso' },
  { status: 'IN_REVIEW',   label: 'En revisión' },
  { status: 'DONE',        label: 'Listo' },
];

function TaskCard({ task, isDragging = false }: { task: Task; isDragging?: boolean }) {
  const { setSelectedTaskId } = useStore();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const overdue = isOverdue(task);
  const pCfg = PRIORITY_CONFIG[task.prioridad];
  const style = transform ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.id); }}
      className={`bg-[#0f1117] border rounded-xl p-3 cursor-pointer select-none transition-all duration-150
        ${isDragging ? 'opacity-50 scale-95' : 'hover:border-slate-500 hover:shadow-lg hover:shadow-black/30'}
        ${overdue ? 'border-red-500/40' : 'border-[#1e2535]'}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-200 font-medium leading-snug line-clamp-2 flex-1">{task.titulo}</p>
        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${pCfg.dot}`} title={pCfg.label} />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.proyecto && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: task.proyecto.color + '22', color: task.proyecto.color }}
          >
            {task.proyecto.nombre}
          </span>
        )}
        {task.area && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: task.area.color + '22', color: task.area.color }}
          >
            {task.area.nombre}
          </span>
        )}
      </div>

      {/* Progress */}
      {task.progreso > 0 && (
        <div className="mb-2">
          <ProgressBar value={task.progreso} small />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {task.responsable && <Avatar user={task.responsable} size={6} />}
          {task.archivos.length > 0 && (
            <span className="text-[10px] text-slate-500">📎 {task.archivos.length}</span>
          )}
        </div>
        {task.fechaFin && (
          <span className={`text-[10px] ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
            {formatDate(task.fechaFin)}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  tasks,
  onNewTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onNewTask: (status: TaskStatus) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-xl bg-[#161b25] border transition-colors ${
        isOver ? 'border-blue-500/50 bg-blue-950/20' : 'border-[#1e2535]'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#1e2535]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
          <span className="text-sm font-semibold text-slate-200">{label}</span>
          <span className="text-xs text-slate-500 bg-[#0f1117] px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 min-h-16 overflow-y-auto">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-[#1e2535]">
        <button
          onClick={() => onNewTask(status)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-300 hover:bg-[#0f1117] transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nueva tarea
        </button>
      </div>
    </div>
  );
}

export default function KanbanView() {
  const { tasks, patchStatus, setSelectedTaskId } = useStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasks.find(t => t.id === e.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.estado !== newStatus) {
      await patchStatus(task.id, newStatus);
    }
  };

  const handleNewTask = (status: TaskStatus) => {
    setSelectedTaskId('new');
    // Could pre-set status via a temporary store param — simplified here
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 p-4 overflow-x-auto h-full">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={tasks.filter(t => t.estado === col.status)}
            onNewTask={handleNewTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard task={activeTask} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
