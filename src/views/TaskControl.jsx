import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, User, LayoutGrid, List, ChevronRight, ChevronDown, CheckCircle2, Clock, AlertTriangle, X, Plus, Pencil, Trash2, BellRing } from 'lucide-react';
import { isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../utils/roles';
import { PRIORITIES } from '../constants/tasks';

const STATUS_COLUMNS = [
  { id: 'TODO', title: 'A Fazer', color: '#000000', dotClass: 'bg-black' },
  { id: 'IN_PROGRESS', title: 'Em Andamento', color: '#eab308', dotClass: 'bg-yellow-400' },
  { id: 'UNDER_REVIEW', title: 'Em Avaliação', color: '#3b82f6', dotClass: 'bg-blue-500' },
  { id: 'DONE', title: 'Concluído', color: '#10b981', dotClass: 'bg-emerald-500' }
];

export default function TaskControl({ user }) {
  const [viewMode, setViewMode] = useState('team'); // 'team' or 'user'
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null); // null for new, {id, ...} for edit
  const [editingTaskData, setEditingTaskData] = useState({ name: '', description: '', priority: 'Media', status: 'TODO', assignee: '', teamId: '', projectId: '', plannedStart: '', plannedEnd: '', progress: 0, level: 1, uploadFolderUrl: '' });

  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'gantt_items'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.level > 0));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTasks(); unsubTeams(); unsubUsers(); unsubProjects(); };
  }, []);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!editingTaskData.name || !editingTaskData.priority || !editingTaskData.status || !editingTaskData.plannedStart || !editingTaskData.plannedEnd || !editingTaskData.teamId || !editingTaskData.projectId) {
      alert("Por favor, preencha todos os campos obrigatórios (Responsável é opcional).");
      return;
    }

    try {
      let finalData = { ...editingTaskData };
      finalData.uploadFolderUrl = finalData.uploadFolderUrl?.trim() ? finalData.uploadFolderUrl.trim() : null;
      if (!finalData.assignee) finalData.assignee = null;
      if (finalData.progress === undefined) finalData.progress = 0;
      if (finalData.level === undefined) finalData.level = 1;
      
      const oldStatus = currentTask?.status;
      let newStatus = editingTaskData.status;
      const isManager = _isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);

      if (newStatus === 'DONE' && oldStatus !== 'DONE') {
        if (!isManager) {
           newStatus = 'UNDER_REVIEW';
           finalData.status = 'UNDER_REVIEW';
           alert("Como colaborador, sua tarefa foi movida para Em Avaliação.");
        } else {
           const note = prompt("Observação de validação (opcional):") || '';
           finalData.validationNote = note;
           finalData.isValidated = true;
           finalData.rejectionNote = '';
        }
      }

      if (currentTask?.id) {
        await updateDoc(doc(db, 'gantt_items', currentTask.id), finalData);
      } else {
        await addDoc(collection(db, 'gantt_items'), {
          ...finalData,
          created_at: new Date(),
          created_by: user.uid || user.id
        });
      }

      if (newStatus === 'UNDER_REVIEW' && oldStatus !== 'UNDER_REVIEW') {
        const admins = users.filter(u => _isAdmin(u.role));
        for (const admin of admins) {
          await addDoc(collection(db, 'notifications'), { 
            to: admin.email, 
            from: user.email, 
            title: 'Tarefa Aguardando Avaliação', 
            message: `A tarefa "${finalData.name}" está pronta para ser avaliada.`, 
            type: 'info', read: false, createdAt: new Date() 
          });
        }
      }

      setIsModalOpen(false);
      alert("Ação realizada com sucesso!");
    } catch (_Err) { alert(_Err.message); }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm("Excluir tarefa?")) {
      await deleteDoc(doc(db, 'gantt_items', id));
      alert("Tarefa excluída com sucesso!");
    }
  };

  const openModal = (task = null, defaults = {}) => {
    setCurrentTask(task);
    setEditingTaskData(task ? { ...task, uploadFolderUrl: task.uploadFolderUrl || '' } : { name: '', description: '', priority: 'Media', status: 'TODO', assignee: '', teamId: '', projectId: '', plannedStart: '', plannedEnd: '', progress: 0, level: 1, uploadFolderUrl: '', ...defaults });
    setIsModalOpen(true);
  };

  const renderTaskCard = (task) => {
    const isOverdue = task.status !== 'DONE' && task.plannedEnd && new Date(task.plannedEnd).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
    const column = STATUS_COLUMNS.find(c => c.id === task.status);
    const borderColor = column ? column.color : '#cbd5e1';

    const today = new Date(); today.setHours(0,0,0,0);
    const due = task.plannedEnd ? new Date(task.plannedEnd) : null;
    if (due) due.setHours(0,0,0,0);
    const daysLeft = due ? Math.round((due - today) / (1000 * 60 * 60 * 24)) : null;
    
    return (
      <div key={task.id} className={`border-2 border-slate-300 border-l-[6px] rounded-xl p-4 shadow-sm hover:shadow-md transition-all relative ${isOverdue ? 'bg-red-600 text-white border-red-700' : 'bg-white text-slate-800'}`} style={{ 
        borderLeftColor: isOverdue ? '#b91c1c' : borderColor,
        minHeight: '100px'
      }}>
        {isOverdue && (
           <div className="absolute top-2 left-2 animate-pulse">
             <BellRing size={16} fill="white" />
           </div>
        )}

        {/* Bloco de datas — topo direito, sempre visível */}
        <div className={`absolute top-2 right-2 flex flex-col items-end gap-0.5 text-[10px] font-bold leading-tight rounded-lg px-2 py-1.5 ${isOverdue ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
          <span>📅 {task.plannedStart ? new Date(task.plannedStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</span>
          <span>🏁 {task.plannedEnd ? new Date(task.plannedEnd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}</span>
          {daysLeft !== null && task.status !== 'DONE' && (
            <span className={`font-black mt-0.5 ${isOverdue ? 'text-white' : daysLeft <= 2 ? 'text-red-600' : daysLeft <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isOverdue ? `${Math.abs(daysLeft)}d atraso` : daysLeft === 0 ? 'Hoje!' : `${daysLeft}d restam`}
            </span>
          )}
        </div>

        <div className={`flex justify-between items-start gap-2 mb-3 pr-20 ${isOverdue ? 'pt-5' : ''}`}>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className={`font-extrabold leading-tight line-clamp-2 ${task.status === 'DONE' && !isOverdue ? 'line-through opacity-60' : ''}`}>{task.name}</div>
            {task.uploadFolderUrl && (
              <a 
                href={task.uploadFolderUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`flex items-center w-max gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-widest transition-colors ${isOverdue ? 'bg-white/20 text-white hover:bg-white/30 border border-white/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                onClick={(e) => e.stopPropagation()}
              >
                📁 Pasta
              </a>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-end gap-2 text-[10px] font-black">
          <div className="flex flex-col gap-1.5 font-bold">
            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-white' : 'text-slate-500'}`}>
               <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${isOverdue ? 'bg-white/20 border-white/20' : 'bg-slate-100 border-slate-200'}`}>
                  {task.assignee ? task.assignee.charAt(0).toUpperCase() : '?'}
               </div>
               {task.assignee ? task.assignee.split('@')[0] : 'SEM RESPONSÁVEL'}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => openModal(task)} className={`p-2 rounded-lg transition-all ${isOverdue ? 'bg-white/20 hover:bg-white hover:text-red-600' : 'bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10'}`}><Pencil size={14} /></button>
            <button onClick={() => handleDeleteTask(task.id)} className={`p-2 rounded-lg transition-all ${isOverdue ? 'bg-white/20 hover:bg-white hover:text-red-600' : 'bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50'}`}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    );
  };

  const isAdminRole = _isAdmin(user?.role);
  const isManagerRole = isProjectManager(user?.role) || isTeamLeader(user?.role);

  // Teams that this user is allowed to see
  const visibleTeams = isAdminRole 
    ? teams 
    : (isManagerRole ? teams.filter(t => t.manager === user?.email) : []);

  // Set of emails of users that belong to the visible teams
  const visibleUserEmails = new Set();
  visibleTeams.forEach(t => {
    if (t.manager) visibleUserEmails.add(t.manager);
    (t.members || []).forEach(m => visibleUserEmails.add(m));
  });

  // Users that this user is allowed to see
  const visibleUsers = isAdminRole 
    ? users.filter(u => u.name !== 'Aguardando Login')
    : users.filter(u => u.name !== 'Aguardando Login' && visibleUserEmails.has(u.email));

  const swimlanes = viewMode === 'team' ? visibleTeams : visibleUsers;

  return (
    <div className="flex-col gap-6" style={{ height: '100%' }}>
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">
            Visão Gerencial
          </h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            Visão administrativa por {viewMode === 'team' ? 'equipes' : 'usuários'}
          </p>
        </div>
        <div className="flex gap-4 items-center mt-6 md:mt-0">
          <div className="flex gap-2 bg-smartlab-surface-low border-2 border-smartlab-border p-1 rounded-2xl shadow-sm">
            <button 
              className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${viewMode === 'team' ? 'bg-smartlab-primary text-white shadow-md' : 'text-smartlab-on-surface hover:bg-smartlab-primary/5'}`}
              onClick={() => setViewMode('team')}
            >
              <Users size={16} /> Equipes
            </button>
            <button 
              className={`flex flex-1 items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${viewMode === 'user' ? 'bg-smartlab-primary text-white shadow-md' : 'text-smartlab-on-surface hover:bg-smartlab-primary/5'}`}
              onClick={() => setViewMode('user')}
            >
              <User size={16} /> Usuários
            </button>
          </div>
        </div>
      </header>

      <div className="flex-col gap-4" style={{ overflowY: 'auto', flex: 1, paddingBottom: '2rem' }}>
        {swimlanes.map(item => {
          const isExpanded = expandedRows[item.id] !== false; // Default expanded
          const itemTasks = viewMode === 'team' 
            ? tasks.filter(t => t.teamId === item.id)
            : tasks.filter(t => t.assignee === item.email);

          return (
            <div key={item.id} className="bg-white border-2 border-slate-300 rounded-[24px] overflow-hidden shadow-sm">
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors" 
                onClick={() => toggleRow(item.id)}
                style={{ borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none' }}
              >
                <div className={`p-1 rounded-md transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                   <ChevronDown size={18} className="text-slate-400" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100 shadow-sm shrink-0">
                   {viewMode === 'team' ? <Users size={20} /> : <User size={20} />}
                </div>
                <div className="flex-1">
                  <h3 className="m-0 font-bold text-slate-800 text-lg tracking-tight">{item.name || item.email}</h3>
                  <p className="m-0 text-xs font-bold text-slate-500 uppercase tracking-widest">{itemTasks.length} TAREFAS ATIVAS</p>
                </div>
              </div>

              {isExpanded && (
                <div className="flex flex-col md:flex-row gap-6 p-6 bg-slate-200/40 overflow-x-auto" style={{ minHeight: '150px' }}>
                  {STATUS_COLUMNS.map(col => (
                    <div key={col.id} className="flex-1 min-w-[280px] flex flex-col gap-4">
                      <div className="text-[11px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em] flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                           <div className={`w-3 h-3 rounded-full ${col.dotClass}`}></div>
                           {col.title}
                        </div>
                        <span className="bg-white/50 text-slate-700 px-3 py-1 rounded-full text-[10px] border border-slate-300">
                          {itemTasks.filter(t => t.status === col.id).length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-4">
                        {itemTasks.filter(t => t.status === col.id).map(renderTaskCard)}
                        {itemTasks.filter(t => t.status === col.id).length === 0 && (
                          <div className="text-slate-500 text-[12px] font-bold italic border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-white/60">Nenhuma tarefa</div>
                        )}
                        <button 
                          className="w-full py-3 px-4 mt-2 text-[11px] font-bold text-slate-500 hover:text-sky-600 border border-dashed border-slate-300 rounded-xl hover:border-sky-300 hover:bg-sky-50/50 transition-all flex items-center justify-center gap-2 bg-white/40"
                          onClick={() => {
                            console.log("Adding task for:", item.email || item.id, "Status:", col.id);
                            openModal(null, { 
                              status: col.id, 
                              teamId: viewMode === 'team' ? item.id : (item.teamIds?.[0] || ''),
                              assignee: viewMode === 'user' ? item.email : ''
                            });
                          }}
                        >
                          <Plus size={14} /> Adicionar em {col.title}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {swimlanes.length === 0 && (
          <div className="glass-panel p-12 text-center text-muted">
            Nenhuma tarefa encontrada para os critérios atuais.
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-400 to-primary"></div>
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
            <h2 className="font-extrabold text-2xl mb-6 text-slate-800">{currentTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            
            <form onSubmit={handleSaveTask} className="flex flex-col gap-5 text-sm">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Título da Tarefa</label>
                <input
                  required autoFocus
                  type="text"
                  value={editingTaskData.name}
                  onChange={e => setEditingTaskData({...editingTaskData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 font-medium"
                  placeholder="Ex: Relatório Semestral"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Descrição</label>
                <textarea
                  rows={2}
                  value={editingTaskData.description || ''}
                  onChange={e => setEditingTaskData({...editingTaskData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 resize-y"
                  placeholder="Notas, links e contexto..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Pasta de Upload (link)</label>
                <input
                  type="url"
                  value={editingTaskData.uploadFolderUrl || ''}
                  onChange={e => setEditingTaskData({...editingTaskData, uploadFolderUrl: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 font-medium"
                  placeholder="https://sua-empresa.sharepoint.com/..."
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider flex items-center gap-1">📅 Data de Início</label>
                  <input
                    type="date"
                    value={editingTaskData.plannedStart || ''}
                    onChange={e => setEditingTaskData({...editingTaskData, plannedStart: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 font-semibold cursor-pointer"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider flex items-center gap-1">📅 Data de Prazo</label>
                  <input
                    type="date"
                    value={editingTaskData.plannedEnd || ''}
                    onChange={e => setEditingTaskData({...editingTaskData, plannedEnd: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 font-semibold cursor-pointer"
                  />
                  {editingTaskData.plannedEnd && new Date(editingTaskData.plannedEnd).setHours(0,0,0,0) < new Date().setHours(0,0,0,0) && (
                    <p className="text-red-500 text-[11px] font-bold">⚠️ Prazo no passado — ficará ATRASADA</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Projeto</label>
                  <select
                    value={editingTaskData.projectId || ''}
                    onChange={e => setEditingTaskData({...editingTaskData, projectId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium"
                  >
                    <option value="">Sem Projeto</option>
                    {projects.filter(p => isAdminRole || (p.owners || []).includes(user?.id) || (p.userIds || []).includes(user?.id) || (p.owner === user?.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Equipe</label>
                  <select
                    value={editingTaskData.teamId || ''}
                    onChange={e => setEditingTaskData({...editingTaskData, teamId: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium"
                  >
                    <option value="">Sem Equipe</option>
                    {visibleTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Responsável</label>
                  <select
                    value={editingTaskData.assignee || ''}
                    onChange={e => setEditingTaskData({...editingTaskData, assignee: e.target.value})}
                    disabled={
                      !(_isAdmin(user?.role) || isProjectManager(user?.role) || (isTeamLeader(user?.role) && (user?.teamIds || []).includes(editingTaskData.teamId)))
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium disabled:opacity-60"
                  >
                    {(_isAdmin(user?.role) || isProjectManager(user?.role) || (isTeamLeader(user?.role) && (user?.teamIds || []).includes(editingTaskData.teamId))) ? (
                      <>
                        <option value="">Sem responsável</option>
                        {visibleUsers.map(u => <option key={u.id} value={u.email}>{u.name || u.email}</option>)}
                      </>
                    ) : (
                      <option value={editingTaskData.assignee || user?.email}>
                        {editingTaskData.assignee || user?.email}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Status</label>
                  <select
                    value={editingTaskData.status || 'TODO'}
                    onChange={e => setEditingTaskData({...editingTaskData, status: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium"
                  >
                    {STATUS_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Prioridade</label>
                  <select
                    value={editingTaskData.priority || 'Media'}
                    onChange={e => setEditingTaskData({...editingTaskData, priority: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium"
                  >
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="font-bold text-slate-500 text-xs uppercase tracking-wider">Progresso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingTaskData.progress || 0}
                    onChange={e => setEditingTaskData({...editingTaskData, progress: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-primary transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-4 pt-4 border-t border-slate-200">
                <button type="button" className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all">
                  {currentTask ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
