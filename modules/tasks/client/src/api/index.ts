import axios from 'axios';
import type { Task, Project, Area, User, TaskStatus } from '../types';

// En desarrollo usa el proxy de Vite (/api → localhost:3001)
// En producción usa VITE_API_URL (ej: https://cyc-tasks-server.up.railway.app)
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const api = axios.create({ baseURL: BASE });

// Tasks
export const fetchTasks = (params?: Record<string, string>) =>
  api.get<Task[]>('/tasks', { params }).then(r => r.data);

export const fetchTask = (id: string) =>
  api.get<Task>(`/tasks/${id}`).then(r => r.data);

export const createTask = (data: Partial<Task>) =>
  api.post<Task>('/tasks', data).then(r => r.data);

export const updateTask = (id: string, data: Partial<Task>) =>
  api.put<Task>(`/tasks/${id}`, data).then(r => r.data);

export const patchTaskStatus = (id: string, estado: TaskStatus) =>
  api.patch<Task>(`/tasks/${id}/status`, { estado }).then(r => r.data);

export const patchTaskProgress = (id: string, progreso: number) =>
  api.patch<Task>(`/tasks/${id}/progress`, { progreso }).then(r => r.data);

export const deleteTask = (id: string) =>
  api.delete(`/tasks/${id}`).then(r => r.data);

// Subtasks
export const createSubtask = (tareaId: string, texto: string) =>
  api.post(`/tasks/${tareaId}/subtasks`, { texto }).then(r => r.data);

export const updateSubtask = (id: string, data: { texto?: string; completada?: boolean }) =>
  api.patch(`/subtasks/${id}`, data).then(r => r.data);

export const deleteSubtask = (id: string) =>
  api.delete(`/subtasks/${id}`).then(r => r.data);

// Attachments
export const uploadAttachment = (tareaId: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/tasks/${tareaId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};

export const deleteAttachment = (id: string) =>
  api.delete(`/attachments/${id}`).then(r => r.data);

// Comments
export const createComment = (tareaId: string, texto: string, autorId: string) =>
  api.post(`/tasks/${tareaId}/comments`, { texto, autorId }).then(r => r.data);

export const deleteComment = (id: string) =>
  api.delete(`/comments/${id}`).then(r => r.data);

// Catalogs
export const fetchProjects = () => api.get<Project[]>('/projects').then(r => r.data);
export const fetchAreas = () => api.get<Area[]>('/areas').then(r => r.data);
export const fetchUsers = () => api.get<User[]>('/users').then(r => r.data);
