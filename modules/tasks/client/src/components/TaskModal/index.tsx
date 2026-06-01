import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Avatar, ProgressBar, formatDate, formatFileSize, fileIcon } from '../shared';
import * as api from '../../api';

// ── New Task Form ────────────────────────────────────────────────────────────
function NewTaskForm({ onClose }: { onClose: () => void }) {
  const { createTask, projects, areas, users } = useStore();
  const [form, setForm] = useState({
    titulo: '', descripcion: '', estado: 'BACKLOG' as TaskStatus, prioridad: 'MEDIA' as TaskPriority,
    proyectoId: '', areaId: '', responsableId: '', fechaInicio: '', fechaFin: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) return;
    await createTask({
      ...form,
      proyectoId: form.proyectoId || undefined,
      areaId: form.areaId || undefined,
      responsableId: form.responsableId || undefined,
      fechaInicio: form.fechaInicio || undefined,
      fechaFin: form.fechaFin || undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        autoFocus
        placeholder="Título de la tarea *"
        value={form.titulo}
        onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
        className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-4 py-3 text-lg text-slate-200 placeholder:text-slate-600 focus:border-blue-500"
        required
      />
      <textarea
        placeholder="Descripción (opcional)"
        rows={3}
        value={form.descripcion}
        onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
        className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 resize-none"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Estado</label>
          <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as TaskStatus }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Prioridad</label>
          <select value={form.prioridad} onChange={e => setForm(f => ({ ...f, prioridad: e.target.value as TaskPriority }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Proyecto</label>
          <select value={form.proyectoId} onChange={e => setForm(f => ({ ...f, proyectoId: e.target.value }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
            <option value="">Sin proyecto</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Área</label>
          <select value={form.areaId} onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
            <option value="">Sin área</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Responsable</label>
          <select value={form.responsableId} onChange={e => setForm(f => ({ ...f, responsableId: e.target.value }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
            <option value="">Sin asignar</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha inicio</label>
          <input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Fecha término</label>
          <input type="date" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancelar</button>
        <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">Crear tarea</button>
      </div>
    </form>
  );
}

// ── Existing Task Modal ──────────────────────────────────────────────────────
function ExistingTaskModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks, updateTask, patchStatus, patchProgress, deleteTask, refreshTask, projects, areas, users } = useStore();
  const task = tasks.find(t => t.id === taskId);
  const [localTask, setLocalTask] = useState<Task | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (task) {
      setLocalTask(task);
      setTitleVal(task.titulo);
    }
  }, [task]);

  if (!localTask) return null;

  // Auto-save with debounce
  const debounceSave = useCallback((updated: Partial<Task>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await updateTask(taskId, { ...localTask, ...updated });
      setSaving(false);
    }, 800);
  }, [localTask, taskId]);

  const update = (patch: Partial<Task>) => {
    const updated = { ...localTask, ...patch };
    setLocalTask(updated);
    debounceSave(patch);
  };

  // Title
  const saveTitle = () => {
    setEditingTitle(false);
    if (titleVal !== localTask.titulo) update({ titulo: titleVal });
  };

  // Status
  const handleStatus = async (status: TaskStatus) => {
    await patchStatus(taskId, status);
    setLocalTask(t => t ? { ...t, estado: status } : t);
  };

  // Progress
  const handleProgress = async (v: number) => {
    setLocalTask(t => t ? { ...t, progreso: v } : t);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => patchProgress(taskId, v), 600);
  };

  // Subtasks
  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    const sub = await api.createSubtask(taskId, newSubtask.trim());
    setLocalTask(t => t ? { ...t, subtareas: [...t.subtareas, sub] } : t);
    setNewSubtask('');
  };

  const toggleSubtask = async (id: string, completada: boolean) => {
    await api.updateSubtask(id, { completada });
    setLocalTask(t => t ? { ...t, subtareas: t.subtareas.map(s => s.id === id ? { ...s, completada } : s) } : t);
  };

  const removeSubtask = async (id: string) => {
    await api.deleteSubtask(id);
    setLocalTask(t => t ? { ...t, subtareas: t.subtareas.filter(s => s.id !== id) } : t);
  };

  // Files
  const handleFileDrop = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const att = await api.uploadAttachment(taskId, file);
        setLocalTask(t => t ? { ...t, archivos: [...t.archivos, att] } : t);
      } catch (e: any) {
        alert(e?.response?.data?.error || 'Error al subir archivo');
      }
    }
    setUploading(false);
  };

  const removeFile = async (id: string) => {
    await api.deleteAttachment(id);
    setLocalTask(t => t ? { ...t, archivos: t.archivos.filter(a => a.id !== id) } : t);
  };

  // Comments — use first user as fallback author
  const addComment = async () => {
    if (!newComment.trim()) return;
    const authorId = users[0]?.id || '';
    const comment = await api.createComment(taskId, newComment.trim(), authorId);
    setLocalTask(t => t ? { ...t, comentarios: [...t.comentarios, comment] } : t);
    setNewComment('');
  };

  const removeComment = async (id: string) => {
    await api.deleteComment(id);
    setLocalTask(t => t ? { ...t, comentarios: t.comentarios.filter(c => c.id !== id) } : t);
  };

  // Delete task
  const handleDelete = async () => {
    await deleteTask(taskId);
    onClose();
  };

  const subtasksDone = localTask.subtareas.filter(s => s.completada).length;

  const ACTIVITY_LABELS: Record<string, string> = {
    CREATED: 'creó la tarea',
    UPDATED: 'actualizó la tarea',
    STATUS_CHANGED: 'cambió el estado',
    PROGRESS_UPDATED: 'actualizó el progreso',
    SUBTASK_ADDED: 'agregó subtarea',
    SUBTASK_UPDATED: 'actualizó subtarea',
    SUBTASK_DELETED: 'eliminó subtarea',
    FILE_UPLOADED: 'subió archivo',
    FILE_DELETED: 'eliminó archivo',
    COMMENT_ADDED: 'comentó',
    COMMENT_DELETED: 'eliminó comentario',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header badges row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {localTask.proyecto && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: localTask.proyecto.color + '22', color: localTask.proyecto.color }}>
            {localTask.proyecto.nombre}
          </span>
        )}
        {localTask.area && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: localTask.area.color + '22', color: localTask.area.color }}>
            {localTask.area.nombre}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: PRIORITY_CONFIG[localTask.prioridad].dot.replace('bg-', '') + '22' }}>
          <span className={PRIORITY_CONFIG[localTask.prioridad].color}>
            ● {PRIORITY_CONFIG[localTask.prioridad].label}
          </span>
        </span>
        {saving && <span className="text-xs text-slate-500 ml-auto">Guardando...</span>}
      </div>

      {/* Title */}
      <div className="mb-4">
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => e.key === 'Enter' && saveTitle()}
            className="w-full bg-[#0f1117] border border-blue-500 rounded-lg px-3 py-2 text-xl font-semibold text-slate-100 focus:outline-none"
          />
        ) : (
          <h2
            onClick={() => setEditingTitle(true)}
            className="text-xl font-semibold text-slate-100 cursor-text hover:text-white px-1 py-1 rounded hover:bg-[#1e2535] transition-colors"
          >
            {localTask.titulo}
          </h2>
        )}
      </div>

      {/* Status buttons */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => handleStatus(k)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 border ${
              localTask.estado === k
                ? 'text-white border-transparent'
                : 'text-slate-400 border-[#1e2535] hover:border-slate-500'
            }`}
            style={localTask.estado === k ? { backgroundColor: v.color, borderColor: v.color } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1">

        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Responsable', content: (
              <select value={localTask.responsableId || ''} onChange={e => update({ responsableId: e.target.value || null })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            )},
            { label: 'Proyecto', content: (
              <select value={localTask.proyectoId || ''} onChange={e => update({ proyectoId: e.target.value || null })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
                <option value="">Sin proyecto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )},
            { label: 'Área', content: (
              <select value={localTask.areaId || ''} onChange={e => update({ areaId: e.target.value || null })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
                <option value="">Sin área</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            )},
            { label: 'Prioridad', content: (
              <select value={localTask.prioridad} onChange={e => update({ prioridad: e.target.value as TaskPriority })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            )},
            { label: 'Fecha inicio', content: (
              <input type="date" value={localTask.fechaInicio?.slice(0, 10) || ''} onChange={e => update({ fechaInicio: e.target.value || null })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500" />
            )},
            { label: 'Fecha término', content: (
              <input type="date" value={localTask.fechaFin?.slice(0, 10) || ''} onChange={e => update({ fechaFin: e.target.value || null })}
                className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-blue-500" />
            )},
          ].map(({ label, content }) => (
            <div key={label}>
              <label className="block text-xs text-slate-500 mb-1">{label}</label>
              {content}
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Descripción</label>
          <textarea
            rows={3}
            value={localTask.descripcion || ''}
            onChange={e => update({ descripcion: e.target.value })}
            placeholder="Agregar descripción..."
            className="w-full bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-slate-500">Progreso</label>
            <span className="text-xs font-semibold text-slate-300">{localTask.progreso}%</span>
          </div>
          <input
            type="range" min={0} max={100} value={localTask.progreso}
            onChange={e => handleProgress(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <ProgressBar value={localTask.progreso} />
        </div>

        {/* Subtasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-500">
              Subtareas {localTask.subtareas.length > 0 && `(${subtasksDone}/${localTask.subtareas.length})`}
            </label>
          </div>
          {localTask.subtareas.length > 0 && (
            <div className="bg-[#0f1117] border border-[#1e2535] rounded-lg mb-2 overflow-hidden">
              {localTask.subtareas.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#1e2535] last:border-0 hover:bg-[#161b25] group">
                  <input
                    type="checkbox" checked={sub.completada}
                    onChange={e => toggleSubtask(sub.id, e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className={`flex-1 text-sm ${sub.completada ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                    {sub.texto}
                  </span>
                  <button onClick={() => removeSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              placeholder="Nueva subtarea..."
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSubtask()}
              className="flex-1 bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500"
            />
            <button onClick={addSubtask} className="px-3 py-2 bg-[#1e2535] hover:bg-[#2a3441] rounded-lg text-sm text-slate-400 transition-colors">+</button>
          </div>
        </div>

        {/* Files */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">Archivos ({localTask.archivos.length})</label>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1e2535] rounded-lg p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors mb-2"
          >
            <div className="text-2xl mb-1">📎</div>
            <div className="text-xs text-slate-500">
              {uploading ? 'Subiendo...' : 'Arrastra archivos o haz clic para seleccionar'}
            </div>
            <div className="text-[10px] text-slate-600 mt-0.5">PDF, XLSX, DOCX, JPG, PNG, CSV — máx. 20MB</div>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            accept=".pdf,.xlsx,.xls,.docx,.jpg,.jpeg,.png,.csv"
            onChange={e => handleFileDrop(e.target.files)} />
          {localTask.archivos.length > 0 && (
            <div className="bg-[#0f1117] border border-[#1e2535] rounded-lg overflow-hidden">
              {localTask.archivos.map(att => (
                <div key={att.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#1e2535] last:border-0 group hover:bg-[#161b25]">
                  <span className="text-xl">{fileIcon(att.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <a href={att.url} target="_blank" rel="noreferrer"
                      className="text-sm text-slate-300 hover:text-blue-400 truncate block transition-colors">
                      {att.nombre}
                    </a>
                    <div className="text-[10px] text-slate-600">{formatFileSize(att.tamanio)}</div>
                  </div>
                  <button onClick={() => removeFile(att.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <label className="block text-xs text-slate-500 mb-2">Comentarios ({localTask.comentarios.length})</label>
          <div className="space-y-3 mb-3">
            {localTask.comentarios.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <Avatar user={c.autor} size={7} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-300">{c.autor.nombre}</span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(c.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-[#1a2030] rounded-lg px-3 py-2 text-sm text-slate-300">{c.texto}</div>
                </div>
                <button onClick={() => removeComment(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all text-xs shrink-0 mt-1">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment()}
              className="flex-1 bg-[#0f1117] border border-[#1e2535] rounded-lg px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 focus:border-blue-500"
            />
            <button onClick={addComment} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors">→</button>
          </div>
        </div>

        {/* Activity Log */}
        {localTask.actividad.length > 0 && (
          <div>
            <label className="block text-xs text-slate-500 mb-2">Actividad reciente</label>
            <div className="space-y-2">
              {localTask.actividad.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1e2535] mt-1.5 shrink-0" />
                  <div>
                    <span className="text-slate-500">{log.usuario?.nombre || 'Sistema'}</span>
                    {' '}{ACTIVITY_LABELS[log.accion] || log.accion}
                    {log.detalle && log.detalle.length < 80 && (
                      <span className="text-slate-700"> · {log.detalle}</span>
                    )}
                    <span className="text-slate-700 ml-1">
                      · {new Date(log.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#1e2535]">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-400">¿Confirmar eliminación?</span>
            <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors">Eliminar</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1">
            🗑 Eliminar tarea
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 bg-[#1e2535] hover:bg-[#2a3441] text-slate-300 text-sm rounded-lg transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Main Modal Wrapper ───────────────────────────────────────────────────────
export default function TaskModal() {
  const { selectedTaskId, setSelectedTaskId } = useStore();

  if (!selectedTaskId) return null;

  const isNew = selectedTaskId === 'new';
  const onClose = () => setSelectedTaskId(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 h-full w-full max-w-2xl bg-[#161b25] border-l border-[#1e2535] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2535]">
          <h3 className="text-sm font-semibold text-slate-400">
            {isNew ? 'Nueva tarea' : 'Detalle de tarea'}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1e2535] text-slate-500 hover:text-slate-300 transition-colors">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          {isNew
            ? <NewTaskForm onClose={onClose} />
            : <ExistingTaskModal taskId={selectedTaskId} onClose={onClose} />
          }
        </div>
      </div>
    </div>
  );
}
