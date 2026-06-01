import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import type { ViewType } from '../types';

const VIEWS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'kanban',    label: 'Kanban',     icon: '⊞' },
  { id: 'table',     label: 'Tabla',      icon: '☰' },
  { id: 'calendar',  label: 'Calendario', icon: '📅' },
  { id: 'gantt',     label: 'Gantt',      icon: '▬' },
];

export default function Toolbar() {
  const { view, setView, filters, setFilters, projects, areas, loadAll, setSelectedTaskId } = useStore();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (val: string) => {
    setFilters({ search: val });
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadAll(), 300);
  };

  const handleFilter = (key: string, val: string) => {
    setFilters({ [key]: val });
    setTimeout(() => loadAll(), 0);
  };

  return (
    <header className="bg-[#161b25] border-b border-[#1e2535] px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Toggle */}
        <div className="flex bg-[#0f1117] rounded-lg p-0.5 gap-0.5 border border-[#1e2535]">
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                view === v.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2535]'
              }`}
            >
              <span>{v.icon}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={filters.search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <select
          value={filters.proyecto}
          onChange={e => handleFilter('proyecto', e.target.value)}
          className="bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-400 focus:border-blue-500 transition-colors"
        >
          <option value="">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>

        <select
          value={filters.area}
          onChange={e => handleFilter('area', e.target.value)}
          className="bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-400 focus:border-blue-500 transition-colors"
        >
          <option value="">Todas las áreas</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <select
          value={filters.prioridad}
          onChange={e => handleFilter('prioridad', e.target.value)}
          className="bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-400 focus:border-blue-500 transition-colors"
        >
          <option value="">Todas las prioridades</option>
          <option value="ALTA">🔴 Alta</option>
          <option value="MEDIA">🟡 Media</option>
          <option value="BAJA">🟢 Baja</option>
        </select>

        {/* Nueva Tarea */}
        <button
          onClick={() => setSelectedTaskId('new')}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="text-base leading-none">+</span>
          Nueva tarea
        </button>
      </div>
    </header>
  );
}
