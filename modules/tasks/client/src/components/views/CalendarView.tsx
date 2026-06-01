import { useState } from 'react';
import { useStore } from '../../store';
import { STATUS_CONFIG } from '../../types';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CalendarView() {
  const { tasks, setSelectedTaskId } = useStore();
  const [current, setCurrent] = useState(() => new Date());

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setCurrent(new Date(year, month - 1, 1));
  const next = () => setCurrent(new Date(year, month + 1, 1));
  const goToday = () => setCurrent(new Date());

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  const getTasksForDay = (day: number) =>
    tasks.filter(t => {
      if (!t.fechaFin) return false;
      const d = new Date(t.fechaFin);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="bg-[#161b25] border border-[#1e2535] rounded-xl flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2535]">
          <div className="flex items-center gap-3">
            <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e2535] text-slate-400 transition-colors">‹</button>
            <h2 className="text-base font-semibold text-slate-200 min-w-44 text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e2535] text-slate-400 transition-colors">›</button>
          </div>
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
          >
            Hoy
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#1e2535]">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {cells.map((day, idx) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayTasks = day ? getTasksForDay(day) : [];

            return (
              <div
                key={idx}
                className={`border-r border-b border-[#1e2535] p-1 min-h-24 ${
                  !day ? 'bg-[#0f1117]/50' : 'hover:bg-[#1a2030] transition-colors'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-500'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 3).map(task => {
                        const cfg = STATUS_CONFIG[task.estado];
                        return (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80"
                            style={{ backgroundColor: cfg.color + '25', color: cfg.color }}
                          >
                            {task.titulo}
                          </button>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] text-slate-600 px-1">+{dayTasks.length - 3} más</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
