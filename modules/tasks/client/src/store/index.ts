import { create } from 'zustand';
import type { Task, Project, Area, User, ViewType, Filters, TaskStatus } from '../types';
import * as api from '../api';

interface TaskStore {
  tasks: Task[];
  projects: Project[];
  areas: Area[];
  users: User[];
  view: ViewType;
  filters: Filters;
  selectedTaskId: string | null;
  loading: boolean;

  setView: (v: ViewType) => void;
  setFilters: (f: Partial<Filters>) => void;
  setSelectedTaskId: (id: string | null) => void;

  loadAll: () => Promise<void>;
  loadCatalogs: () => Promise<void>;

  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  patchStatus: (id: string, estado: TaskStatus) => Promise<void>;
  patchProgress: (id: string, progreso: number) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  refreshTask: (id: string) => Promise<void>;
}

export const useStore = create<TaskStore>((set, get) => ({
  tasks: [],
  projects: [],
  areas: [],
  users: [],
  view: 'kanban',
  filters: { search: '', proyecto: '', area: '', prioridad: '' },
  selectedTaskId: null,
  loading: false,

  setView: (view) => set({ view }),
  setFilters: (f) => set(s => ({ filters: { ...s.filters, ...f } })),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  loadAll: async () => {
    set({ loading: true });
    const { filters } = get();
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.proyecto) params.proyecto = filters.proyecto;
    if (filters.area) params.area = filters.area;
    if (filters.prioridad) params.prioridad = filters.prioridad;
    const tasks = await api.fetchTasks(params);
    set({ tasks, loading: false });
  },

  loadCatalogs: async () => {
    const [projects, areas, users] = await Promise.all([
      api.fetchProjects(),
      api.fetchAreas(),
      api.fetchUsers(),
    ]);
    set({ projects, areas, users });
  },

  createTask: async (data) => {
    const task = await api.createTask(data);
    set(s => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  updateTask: async (id, data) => {
    const task = await api.updateTask(id, data);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
    return task;
  },

  patchStatus: async (id, estado) => {
    const task = await api.patchTaskStatus(id, estado);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
  },

  patchProgress: async (id, progreso) => {
    const task = await api.patchTaskProgress(id, progreso);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
  },

  deleteTask: async (id) => {
    await api.deleteTask(id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id), selectedTaskId: null }));
  },

  refreshTask: async (id) => {
    const task = await api.fetchTask(id);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
  },
}));
