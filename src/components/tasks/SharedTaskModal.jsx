import React, { useMemo, useEffect } from 'react';
import { X, Check, Loader2, Briefcase, Layers, Target, Activity, CheckSquare, AlertTriangle } from 'lucide-react';
import { PRIORITIES } from '../../constants/tasks';
import { isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../../utils/roles';
import { cn } from '../../utils/cn';

// Consistent Level Config matching Projects.jsx
const LEVEL_CONFIG = [
  { label: 'Projeto',    icon: Briefcase,   color: 'text-violet-500',  dot: 'bg-violet-500' },
  { label: 'Tarefa N1',  icon: Layers,      color: 'text-orange-500',  dot: 'bg-orange-500' },
  { label: 'Tarefa N2',  icon: Target,      color: 'text-cyan-400',    dot: 'bg-cyan-400' },
  { label: 'Tarefa N3',  icon: Activity,    color: 'text-lime-500',    dot: 'bg-lime-500' },
  { label: 'Tarefa N4',  icon: CheckSquare, color: 'text-pink-500',    dot: 'bg-pink-500' },
];

const STATUS_OPTIONS = [
  { value: 'TODO',         label: '⚪ A Fazer' },
  { value: 'IN_PROGRESS',  label: '🔵 Em Andamento' },
  { value: 'UNDER_REVIEW', label: '🟡 Em Revisão' },
  { value: 'DONE',         label: '🟢 Concluído' }
];

/**
 * SharedTaskModal - Unified modal for task creation and editing.
 * Based on the Projects (Gantt) Root design.
 */
function SharedTaskModal({
  isOpen, onClose, currentTask, taskData, setTaskData,
  onSubmit, teams, users, projects, currentUser, allItems = [], saving = false,
  error = ''
}) {
  if (!isOpen || !taskData) return null;

  const canEdit = _isAdmin(currentUser?.role) 
    || isProjectManager(currentUser?.role)
    || (isTeamLeader(currentUser?.role) && (currentUser?.teamIds || []).includes(taskData.teamId));

  const visibleProjects = (projects || []).filter(p => {
    if (_isAdmin(currentUser?.role)) return true;
    return (p.userIds || []).includes(currentUser?.id) || (p.owners || []).includes(currentUser?.id);
  });

  const visibleTeams = (teams || []).filter(t => {
    if (_isAdmin(currentUser?.role)) return true;
    return t.manager === currentUser?.email || (t.members || []).includes(currentUser?.email);
  });

  const parentOptions = useMemo(() =>
    (allItems || []).filter(item =>
      item.id !== currentTask?.id &&
      item.id !== taskData.id &&
      typeof item.level === 'number' &&
      item.level < (taskData.level ?? 1)
    ),
  [allItems, currentTask?.id, taskData.id, taskData.level]);

  return (
    <div className="fixed inset-0 bg-smartlab-on-surface/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <form onSubmit={onSubmit} className="bg-smartlab-surface rounded-[40px] border-2 border-smartlab-border shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-10 pt-10 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-smartlab-on-surface italic uppercase tracking-tighter">
              {currentTask?.id ? 'Dados da Atividade' : 'Configurar Item'}
            </h2>
            <div className="text-[10px] font-black uppercase text-smartlab-primary tracking-widest mt-1">
              Nível {taskData.level || 0} · {LEVEL_CONFIG[taskData.level]?.label || 'Item'}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-3 bg-smartlab-surface-low rounded-2xl hover:bg-smartlab-border transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 custom-scrollbar">
          
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Título do Item</label>
            <input 
              required 
              autoFocus 
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all"
              value={taskData.name || ''} 
              onChange={e => setTaskData({...taskData, name: e.target.value})} 
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Descrição</label>
            <textarea 
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all h-20 resize-none"
              value={taskData.description || ''} 
              onChange={e => setTaskData({...taskData, description: e.target.value})} 
              placeholder="Notas, links e contexto..."
            />
          </div>

          {/* Planned Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Início Planejado {(taskData.level ?? 0) > 0 && "*"}</label>
              <input 
                type="date" 
                required={(taskData.level ?? 0) > 0}
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                value={taskData.plannedStart || ''} 
                onChange={e => setTaskData({...taskData, plannedStart: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Término Planejado {(taskData.level ?? 0) > 0 && "*"}</label>
              <input 
                type="date" 
                required={(taskData.level ?? 0) > 0}
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                value={taskData.plannedEnd || ''} 
                onChange={e => setTaskData({...taskData, plannedEnd: e.target.value})} 
              />
            </div>
          </div>

          {/* Actual Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Início Realizado</label>
              <input 
                type="date" 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary opacity-60 hover:opacity-100 transition-opacity"
                value={taskData.actualStart || ''} 
                onChange={e => setTaskData({...taskData, actualStart: e.target.value})} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Término Realizado</label>
              <input 
                type="date" 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary opacity-60 hover:opacity-100 transition-opacity"
                value={taskData.actualEnd || ''} 
                onChange={e => setTaskData({...taskData, actualEnd: e.target.value})} 
              />
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">Progresso Global</label>
              <span className="text-lg font-black text-smartlab-primary">{taskData.progress || 0}%</span>
            </div>
            <input 
              type="range" 
              className="w-full accent-smartlab-primary h-2 rounded-full cursor-pointer" 
              value={taskData.progress || 0} 
              onChange={e => setTaskData({...taskData, progress: Number(e.target.value)})} 
            />
          </div>

          {/* Status / Priority / Level */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Estado</label>
              <select 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.status || 'TODO'} 
                onChange={e => setTaskData({...taskData, status: e.target.value})}
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Prioridade</label>
              <select 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.priority || 'Media'} 
                onChange={e => setTaskData({...taskData, priority: e.target.value})}
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Nível</label>
              <select
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.level ?? 1}
                onChange={e => setTaskData({...taskData, level: Number(e.target.value)})}
              >
                <option value={0}>Nível 0 — Projeto</option>
                <option value={1}>Nível 1 — Tarefa Principal</option>
                <option value={2}>Nível 2 — Subtarefa</option>
                <option value={3}>Nível 3 — Atividade</option>
                <option value={4}>Nível 4 — Micro-atividade</option>
              </select>
            </div>
          </div>

          {/* Parent Task Selection */}
          {(taskData.level ?? 1) > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Tarefa Mãe</label>
              <select
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.parentId || ''}
                onChange={e => setTaskData({...taskData, parentId: e.target.value || null})}
              >
                <option value="">— Sem tarefa mãe —</option>
                {parentOptions.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.wbs ? `[${item.wbs}] ` : ''}{item.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Project & Team */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Projeto</label>
              <select 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.projectId || ''} 
                onChange={e => setTaskData({...taskData, projectId: e.target.value})}
              >
                <option value="">— Sem Projeto —</option>
                {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Equipe {(taskData.level ?? 0) > 0 && "*"}</label>
              <select 
                className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                value={taskData.teamId || ''} 
                onChange={e => setTaskData({...taskData, teamId: e.target.value})}
                required={(taskData.level ?? 0) > 0}
              >
                <option value="">— Sem Equipe —</option>
                {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Responsável</label>
            <select 
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none disabled:opacity-50"
              value={taskData.assignee || ''} 
              onChange={e => setTaskData({...taskData, assignee: e.target.value || null})} 
              disabled={!canEdit}
            >
              <option value="">— Sem responsável —</option>
              {(users || []).map(u => <option key={u.id || u.email} value={u.email}>{u.name || u.email}</option>)}
            </select>
          </div>

          {/* Upload URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">URL da Pasta (Repositório)</label>
            <input 
              type="url" 
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all"
              placeholder="https://..."
              value={taskData.uploadFolderUrl || ''} 
              onChange={e => setTaskData({...taskData, uploadFolderUrl: e.target.value})} 
            />
          </div>
        </div>

        {/* Error Area */}
        {error && (
          <div className="mx-10 mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl flex items-center gap-3 text-red-500 font-bold text-xs uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="p-10 border-t-2 border-smartlab-border flex gap-4 bg-smartlab-surface">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-4 bg-smartlab-surface-low rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-smartlab-border transition-all"
          >
            Descartar
          </button>
          <button 
            type="submit" 
            disabled={saving} 
            className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:grayscale"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirmar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}

export default SharedTaskModal;
