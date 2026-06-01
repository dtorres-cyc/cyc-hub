import { useEffect } from 'react';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import StatsBar from './components/StatsBar';
import KanbanView from './components/views/KanbanView';
import TableView from './components/views/TableView';
import CalendarView from './components/views/CalendarView';
import GanttView from './components/views/GanttView';
import TaskModal from './components/TaskModal';

export default function App() {
  const { view, selectedTaskId, loadAll, loadCatalogs } = useStore();

  useEffect(() => {
    loadCatalogs();
    loadAll();
  }, []);

  return (
    <div className="flex h-screen bg-[#0f1117] text-slate-200 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Toolbar />
        <StatsBar />
        <div className="flex-1 overflow-auto">
          {view === 'kanban' && <KanbanView />}
          {view === 'table' && <TableView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'gantt' && <GanttView />}
        </div>
      </main>
      {selectedTaskId && <TaskModal />}
    </div>
  );
}
