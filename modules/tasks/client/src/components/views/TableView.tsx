import { useState } from 'react';
import { useStore } from '../../store';
import type { Task } from '../../types';
import { StatusBadge, PriorityDot, Avatar, ProgressBar, isOverdue, formatDate } from '../shared';

type SortKey = 'titulo' | 'estado' | 'prioridad' | 'fechaInicio' | 'fechaFin' | 'progreso';

export default function TableView() {
  const { tasks, setSelectedTaskId } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>('fechaFin');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...tasks].sort((a, b) => {
    let av: string | number = a[sortKey] ?? '';
    let bv: string | number = b[sortKey] ?? '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th
      onClick={() => k && toggleSort(k)}
      className={`px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap ${k ? 'cursor-pointer hover:text-slate-200 select-none' : ''}`}
    >
      {label}
      {k && sortKey === k && (
        <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  );

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="bg-[#161b25] border border-[#1e2535] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2535]">
            <tr>
              <Th label="#" />
              <Th label="Tarea" k="titulo" />
              <Th label="Estado" k="estado" />
              <Th label="Prioridad" k="prioridad" />
              <Th label="Proyecto" />
              <Th label="Área" />
              <Th label="Responsable" />
              <Th label="Inicio" k="fechaInicio" />
              <Th label="Término" k="fechaFin" />
              <Th label="Progreso" k="progreso" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2535]">
            {sorted.map((task, i) => {
              const overdue = isOverdue(task);
              return (
                <tr
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`cursor-pointer transition-colors duration-100 ${
                    overdue ? 'bg-red-950/10 hover:bg-red-950/20' : 'hover:bg-[#1a2030]'
                  }`}
                >
                  <td className="px-4 py-3 text-xs text-slate-600 w-10">{i + 1}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="text-sm text-slate-200 font-medium truncate">{task.titulo}</div>
                    {task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] bg-[#1e2535] text-slate-500 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={task.estado} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PriorityDot priority={task.prioridad} />
                  </td>
                  <td className="px-4 py-3">
                    {task.proyecto ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: task.proyecto.color + '22', color: task.proyecto.color }}
                      >
                        {task.proyecto.nombre}
                      </span>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {task.area ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: task.area.color + '22', color: task.area.color }}
                      >
                        {task.area.nombre}
                      </span>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {task.responsable ? (
                      <div className="flex items-center gap-2">
                        <Avatar user={task.responsable} size={6} />
                        <span className="text-xs text-slate-400">{task.responsable.nombre.split(' ')[0]}</span>
                      </div>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(task.fechaInicio)}
                  </td>
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
                    {formatDate(task.fechaFin)}
                  </td>
                  <td className="px-4 py-3 w-32">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={task.progreso} small />
                      <span className="text-xs text-slate-500 w-8 text-right">{task.progreso}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <div className="text-4xl mb-3">📋</div>
            <div>No hay tareas que coincidan con los filtros</div>
          </div>
        )}
      </div>
    </div>
  );
}
