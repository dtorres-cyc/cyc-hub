import { useRef } from 'react';
import { useStore } from '../../store';
import { STATUS_CONFIG } from '../../types';
import { formatDate } from '../shared';

const DAY_WIDTH = 28;
const ROW_HEIGHT = 44;

export default function GanttView() {
  const { tasks, setSelectedTaskId } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const tasksWithDates = tasks.filter(t => t.fechaInicio && t.fechaFin);
  if (tasksWithDates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600">
        <div className="text-center">
          <div className="text-5xl mb-3">📅</div>
          <div>No hay tareas con fechas de inicio y término</div>
        </div>
      </div>
    );
  }

  // Determine timeline range
  const allDates = tasksWithDates.flatMap(t => [new Date(t.fechaInicio!), new Date(t.fechaFin!)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 5);

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
  const today = new Date();
  const todayOffset = Math.floor((today.getTime() - minDate.getTime()) / 86400000);

  const dayToX = (date: Date) =>
    Math.floor((date.getTime() - minDate.getTime()) / 86400000) * DAY_WIDTH;

  // Generate month headers
  const months: { label: string; x: number; width: number }[] = [];
  let cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const x = dayToX(new Date(Math.max(monthStart.getTime(), minDate.getTime())));
    const endX = dayToX(new Date(Math.min(monthEnd.getTime(), maxDate.getTime()))) + DAY_WIDTH;
    months.push({
      label: monthStart.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
      x,
      width: endX - x,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const LABEL_WIDTH = 220;
  const chartWidth = totalDays * DAY_WIDTH;

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="bg-[#161b25] border border-[#1e2535] rounded-xl flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Task labels */}
          <div
            className="shrink-0 border-r border-[#1e2535] overflow-y-auto"
            style={{ width: LABEL_WIDTH }}
          >
            {/* Header spacer */}
            <div className="h-10 border-b border-[#1e2535] px-3 flex items-center">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tarea</span>
            </div>
            {/* Header month spacer */}
            <div className="h-7 border-b border-[#1e2535]" />
            {tasksWithDates.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="flex items-center gap-2 px-3 cursor-pointer hover:bg-[#1a2030] transition-colors border-b border-[#1e2535]"
                style={{ height: ROW_HEIGHT }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_CONFIG[task.estado].color }}
                />
                <span className="text-xs text-slate-300 truncate">{task.titulo}</span>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div style={{ width: chartWidth, minWidth: '100%', position: 'relative' }}>
              {/* Month header */}
              <div className="h-10 border-b border-[#1e2535] flex items-center sticky top-0 bg-[#161b25] z-10" style={{ width: chartWidth }}>
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="absolute text-xs text-slate-500 font-medium px-2 flex items-center h-full border-r border-[#1e2535]"
                    style={{ left: m.x, width: m.width }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Day tick labels */}
              <div className="h-7 border-b border-[#1e2535] relative" style={{ width: chartWidth }}>
                {Array.from({ length: totalDays }).map((_, i) => {
                  const d = new Date(minDate.getTime() + i * 86400000);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  if (i % 3 !== 0) return null;
                  return (
                    <span
                      key={i}
                      className={`absolute text-[9px] bottom-1 ${isWeekend ? 'text-slate-600' : 'text-slate-500'}`}
                      style={{ left: i * DAY_WIDTH + 2 }}
                    >
                      {d.getDate()}
                    </span>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{ width: chartWidth }}>
                {tasksWithDates.map(task => {
                  const x = dayToX(new Date(task.fechaInicio!));
                  const endX = dayToX(new Date(task.fechaFin!)) + DAY_WIDTH;
                  const width = Math.max(endX - x, DAY_WIDTH);
                  const cfg = STATUS_CONFIG[task.estado];

                  return (
                    <div
                      key={task.id}
                      className="relative border-b border-[#1e2535]"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {/* Weekend shading */}
                      {Array.from({ length: totalDays }).map((_, i) => {
                        const d = new Date(minDate.getTime() + i * 86400000);
                        if (d.getDay() !== 0 && d.getDay() !== 6) return null;
                        return (
                          <div
                            key={i}
                            className="absolute inset-y-0 bg-[#0f1117]/40"
                            style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                          />
                        );
                      })}

                      {/* Bar */}
                      <div
                        onClick={() => setSelectedTaskId(task.id)}
                        className="absolute top-3 h-5 rounded-md cursor-pointer opacity-90 hover:opacity-100 transition-opacity flex items-center px-2"
                        style={{ left: x, width, backgroundColor: cfg.color }}
                        title={`${task.titulo}\n${formatDate(task.fechaInicio)} → ${formatDate(task.fechaFin)}`}
                      >
                        <span className="text-[10px] text-white font-medium truncate">{task.titulo}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full -translate-x-[3px] translate-y-1" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
