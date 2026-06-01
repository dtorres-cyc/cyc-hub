import { useStore } from '../store';

export default function StatsBar() {
  const { tasks } = useStore();
  const now = new Date();

  const total = tasks.length;
  const inProgress = tasks.filter(t => t.estado === 'IN_PROGRESS').length;
  const done = tasks.filter(t => t.estado === 'DONE').length;
  const overdue = tasks.filter(t =>
    t.fechaFin && new Date(t.fechaFin) < now && t.estado !== 'DONE'
  ).length;

  const stats = [
    { label: 'Total', value: total, color: 'text-slate-300', bg: 'bg-slate-700/30' },
    { label: 'En progreso', value: inProgress, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Completadas', value: done, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Vencidas', value: overdue, color: 'text-red-400', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="flex gap-3 px-4 py-2 bg-[#0f1117] border-b border-[#1e2535]">
      {stats.map(s => (
        <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg}`}>
          <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
          <span className="text-xs text-slate-500">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
