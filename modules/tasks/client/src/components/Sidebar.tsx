import { useStore } from '../store';
import type { ViewType } from '../types';

const navItems: { view: ViewType; icon: string; label: string }[] = [
  { view: 'kanban', icon: '⊞', label: 'Kanban' },
  { view: 'table', icon: '☰', label: 'Tabla' },
  { view: 'calendar', icon: '📅', label: 'Calendario' },
  { view: 'gantt', icon: '▬', label: 'Gantt' },
];

export default function Sidebar() {
  const { view, setView } = useStore();

  return (
    <aside className="w-56 shrink-0 bg-[#161b25] border-r border-[#1e2535] flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[#1e2535]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-black text-sm">
            CyC
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">Transportes CyC</div>
            <div className="text-[10px] text-slate-500">Portal Interno</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-2">Vistas</div>
        {navItems.map(item => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
              view === item.view
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-400 hover:bg-[#1e2535] hover:text-slate-200'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="text-[10px] text-slate-500 uppercase tracking-wider px-3 py-2 mt-4">Módulos</div>
        {[
          { icon: '🏗️', label: 'Proyectos' },
          { icon: '👥', label: 'Equipo' },
          { icon: '📊', label: 'Reportes' },
          { icon: '⚙️', label: 'Configuración' },
        ].map(item => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-[#1e2535] hover:text-slate-400 transition-all duration-150"
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e2535]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
            DT
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">Diego Torres</div>
            <div className="text-[10px] text-slate-500">Gerente Comercial</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
