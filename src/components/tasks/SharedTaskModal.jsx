import React, { useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { PRIORITIES, TASK_LEVELS } from '../../constants/tasks';
import { isAdmin as _isAdmin, isProjectManager as _isProjectManager, isTeamLeader as _isTeamLeader } from '../../utils/roles';

/**
 * SharedTaskModal - Unified modal for task creation and editing.
 * Replaces separate implementations in Tasks and TaskControl views.
 */
function SharedTaskModal({
  isOpen, onClose, currentTask, taskData, setTaskData,
  onSubmit, teams, users, projects, currentUser, allItems = []
}) {
  if (!isOpen) return null;

  // Logic to check if task assignment is allowed for the current user
  const canAssign = _isAdmin(currentUser?.role)
    || _isProjectManager(currentUser?.role)
    || (_isTeamLeader(currentUser?.role)
        && (currentUser?.teamIds || []).includes(taskData.teamId));

  // Projects filtered by user access
  const visibleProjects = (projects || []).filter(p => {
    if (_isAdmin(currentUser?.role)) return true;
    return (p.userIds || []).includes(currentUser?.id)
      || (p.owners || []).includes(currentUser?.id)
      || p.owner === currentUser?.id;
  });

  // Teams filtered by management or membership
  const visibleTeams = (teams || []).filter(t => {
    if (_isAdmin(currentUser?.role)) return true;
    return t.manager === currentUser?.email
      || (t.members || []).includes(currentUser?.email);
  });

  // Check if planned end is in the past for warning display
  const isOverdue = taskData.plannedEnd && new Date(taskData.plannedEnd + 'T23:59:59') < new Date();

  const parentOptions = useMemo(() =>
    (allItems || []).filter(item =>
      item.id !== currentTask?.id &&
      typeof item.level === 'number' &&
      item.level < (taskData.level ?? 1) &&
      item.level >= 0
    ),
  [allItems, currentTask?.id, taskData.level]);

  useEffect(() => {
    if (taskData.parentId && !parentOptions.find(i => i.id === taskData.parentId)) {
      setTaskData(prev => ({ ...prev, parentId: null }));
    }
  }, [taskData.level]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl border border-slate-200 relative overflow-hidden">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 to-primary"></div>
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="font-headline font-extrabold text-2xl mb-6 text-slate-800 italic">
          {currentTask?.id ? 'Editar Tarefa' : 'Nova Tarefa'}
        </h2>
        
        <form onSubmit={onSubmit} className="flex flex-col gap-5 text-sm">
          {/* ROW 1: Name */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-500 uppercase tracking-wider">Nome / Título da Tarefa</label>
            <input 
              required 
              autoFocus 
              type="text" 
              value={taskData.name || ''} 
              onChange={e => setTaskData({...taskData, name: e.target.value})} 
              className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all" 
            />
          </div>
          
          {/* ROW 2: Description */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
            <textarea 
              rows={3} 
              value={taskData.description || ''} 
              onChange={e => setTaskData({...taskData, description: e.target.value})} 
              className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all resize-none" 
            />
          </div>

          {/* ROW 3: Upload URL */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-500 uppercase tracking-wider">Pasta de Upload (Link)</label>
            <input 
              type="url" 
              value={taskData.uploadFolderUrl || ''} 
              onChange={e => setTaskData({...taskData, uploadFolderUrl: e.target.value})} 
              placeholder="https://sua-empresa.sharepoint.com/..." 
              className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all" 
            />
          </div>
          
          {/* ROW 4: Dates */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Início Planejado</label>
              <input 
                type="date" 
                value={taskData.plannedStart || ''} 
                onChange={e => setTaskData({...taskData, plannedStart: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none" 
              />
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Fim Planejado</label>
              <input 
                type="date" 
                value={taskData.plannedEnd || ''} 
                onChange={e => setTaskData({...taskData, plannedEnd: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none" 
              />
              {isOverdue && (
                <div className="text-red-500 text-[11px] font-bold mt-1">
                  ⚠️ Prazo no passado — ficará ATRASADA
                </div>
              )}
            </div>
          </div>

          {/* ROW 5: Project / Team / Level */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Projeto</label>
              <select 
                value={taskData.projectId || ''} 
                onChange={e => setTaskData({...taskData, projectId: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none"
              >
                <option value="">Nenhum Projeto</option>
                {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Equipe</label>
              <select 
                value={taskData.teamId || ''} 
                onChange={e => setTaskData({...taskData, teamId: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none"
              >
                <option value="">Nenhuma Equipe</option>
                {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Nível da Tarefa</label>
              <select
                value={taskData.level ?? 1}
                onChange={e => setTaskData({...taskData, level: Number(e.target.value)})}
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none"
              >
                {TASK_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          {/* PARENT TASK (ONLY FOR LEVEL > 1) */}
          {(taskData.level ?? 1) > 1 && (
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Tarefa Mãe <span className="normal-case font-normal opacity-60">(opcional)</span></label>
              <select
                value={taskData.parentId || ''}
                onChange={e => setTaskData({...taskData, parentId: e.target.value || null})}
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all"
              >
                <option value="">— Sem tarefa mãe —</option>
                {parentOptions.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.wbs ? `[${item.wbs}] ` : ''}{item.name}
                  </option>
                ))}
              </select>
              {taskData.parentId && !parentOptions.find(i => i.id === taskData.parentId) && (
                <p className="text-amber-500 text-[11px] font-bold">
                  ⚠️ Tarefa mãe inválida para o nível atual. Selecione outra ou remova.
                </p>
              )}
            </div>
          )}

          {/* ROW 6: Priority / Status / Assignee */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Prioridade</label>
              <select 
                value={taskData.priority || 'Media'} 
                onChange={e => setTaskData({...taskData, priority: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none"
              >
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <select 
                value={taskData.status || 'TODO'} 
                onChange={e => setTaskData({...taskData, status: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none"
              >
                <option value="TODO">⚪ A Fazer</option>
                <option value="IN_PROGRESS">🔵 Em Andamento</option>
                <option value="UNDER_REVIEW">🟡 Em Revisão</option>
                <option value="DONE">🟢 Concluído</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Atribuído a</label>
              <select 
                value={taskData.assignee || ''} 
                onChange={(e) => setTaskData({...taskData, assignee: e.target.value})} 
                className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none disabled:opacity-60 disabled:bg-slate-50"
                disabled={!canAssign}
              >
                {canAssign ? (
                  <>
                    <option value="">Sem responsável</option>
                    {(users || []).map(u => <option key={u.id || u.email} value={u.email}>{u.name || u.email}</option>)}
                  </>
                ) : (
                  <option value={taskData.assignee || currentUser?.email}>
                    {taskData.assignee ? taskData.assignee : (currentUser?.name || currentUser?.email)}
                  </option>
                )}
              </select>
            </div>
          </div>

          {/* ROW 7: Progress */}
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-500 uppercase tracking-wider">Progresso (%)</label>
            <input 
              type="number" 
              min="0" 
              max="100" 
              value={taskData.progress || 0} 
              onChange={e => setTaskData({...taskData, progress: Number(e.target.value)})} 
              className="text-sm w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all" 
            />
          </div>

          {/* Footer */}
          <div className="flex gap-4 justify-end mt-4 pt-4 border-t border-slate-100 items-center">
            <button 
              type="button" 
              className="underline font-bold text-slate-400 hover:text-slate-600 transition-colors" 
              onClick={onClose}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              {currentTask?.id ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SharedTaskModal;
