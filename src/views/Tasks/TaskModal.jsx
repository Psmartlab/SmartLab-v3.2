import React from 'react';
import { X, Calendar, Type, AlignLeft, Flag, Users, Database, Shield } from 'lucide-react';
import { isAdmin as _isAdmin, isProjectManager as _isProjectManager, isTeamLeader as _isTeamLeader } from '../../utils/roles';

function TaskModal({ isOpen, onClose, currentTask, taskData, setTaskData, onSubmit, teams, users, projects, currentUser }) {
  if (!isOpen) return null;

  const canAssign = _isAdmin(currentUser?.role) || _isProjectManager(currentUser?.role) || (_isTeamLeader(currentUser?.role) && (currentUser?.teamIds || []).includes(taskData.teamId));


  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-xl border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/50 to-primary"></div>
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100">
          <X size={20} />
        </button>
        <h2 className="font-headline font-extrabold text-2xl mb-6 text-slate-800">{currentTask?.id ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
        
        <form onSubmit={onSubmit} className="flex flex-col gap-5 text-sm">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Título</label>
            <input required autoFocus type="text" value={taskData.name} onChange={e => setTaskData({...taskData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all" />
          </div>
          
          <div className="space-y-1.5">
            <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Descrição</label>
            <textarea rows={3} value={taskData.description} onChange={e => setTaskData({...taskData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none transition-all resize-none" />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Data Início</label>
              <input type="date" value={taskData.plannedStart} onChange={e => setTaskData({...taskData, plannedStart: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none" />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Data Prazo</label>
              <input type="date" value={taskData.plannedEnd} onChange={e => setTaskData({...taskData, plannedEnd: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary outline-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Projeto</label>
              <select value={taskData.projectId || ''} onChange={e => setTaskData({...taskData, projectId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                <option value="">Nenhum</option>
                {(projects || []).filter(p => {
                  if (_isAdmin(currentUser?.role)) return true;
                  return (p.userIds || []).includes(currentUser?.id) || (p.owners || []).includes(currentUser?.id) || (p.owner === currentUser?.id);
                }).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Equipe</label>
              <select value={taskData.teamId || ''} onChange={e => setTaskData({...taskData, teamId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                <option value="">Nenhuma</option>
                {teams.filter(t => {
                  if (_isAdmin(currentUser?.role)) return true;
                  return t.manager === currentUser?.email || (t.members || []).includes(currentUser?.email);
                }).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Prioridade</label>
              <select value={taskData.priority} onChange={e => setTaskData({...taskData, priority: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                <option value="Baixa">Baixa</option>
                <option value="Media">Média</option>
                <option value="Alta">Alta</option>
                <option value="Critica">Crítica</option>
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</label>
              <select value={taskData.status} onChange={e => setTaskData({...taskData, status: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none">
                <option value="TODO">A Fazer</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="UNDER_REVIEW">Em Revisão</option>
                <option value="DONE">Concluído</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Atribuído a</label>
              <select 
                value={taskData.assignee || ''} 
                onChange={(e) => setTaskData({...taskData, assignee: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none disabled:opacity-60 disabled:bg-slate-50"
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
            <div className="flex-1 space-y-1.5">
              <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Progresso (%)</label>
              <input type="number" min="0" max="100" value={taskData.progress || 0} onChange={e => setTaskData({...taskData, progress: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
            </div>
          </div>


          <div className="flex gap-4 justify-end mt-4 pt-4 border-t border-slate-100">
            <button type="button" className="underline font-bold text-slate-400" onClick={onClose}>Cancelar</button>
            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all">
              {currentTask?.id ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
