import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, User, ChevronDown, Plus, 
  Pencil, Trash2 
} from 'lucide-react';
import { 
  isAdmin as _isAdmin, 
  isProjectManager, 
  isTeamLeader 
} from '../utils/roles';
import SharedTaskModal from '../components/tasks/SharedTaskModal';
import TaskCard from './Tasks/TaskCard';
import { TASK_LEVELS } from '../constants/tasks';

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
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

    return () => { unsubTasks(); unsubUsers(); unsubTeams(); unsubProjects(); };
  }, []);

  const projectById = useMemo(() =>
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}),
  [projects]);

  const teamById = useMemo(() =>
    teams.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}),
  [teams]);

  const updateStatus = async (taskId, newStatus, title) => {
    const isManager = _isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);
    let finalStatus = (newStatus === 'DONE' && !isManager) ? 'UNDER_REVIEW' : newStatus;

    await updateDoc(doc(db, 'gantt_items', taskId), {
      status: finalStatus,
      updatedAt: new Date()
    });

    if (finalStatus === 'UNDER_REVIEW') {
      const admins = users.filter(u => _isAdmin(u.role));
      for (const admin of admins) {
        await addDoc(collection(db, 'notifications'), {
          to: admin.email,
          from: user.email,
          title: 'Tarefa Aguardando Avaliação',
          message: `A tarefa "${title}" de ${user.email} está pronta para ser avaliada.`,
          type: 'info', read: false, createdAt: new Date()
        });
      }
    }
  };

  const handleReview = async (task, action) => {
    if (action === 'approve') {
      const note = prompt("Observação de validação (opcional):") || '';
      await updateDoc(doc(db, 'gantt_items', task.id), {
        status: 'DONE', rejectionNote: '', validationNote: note,
        isValidated: true, updatedAt: new Date()
      });
      await addDoc(collection(db, 'notifications'), {
        to: task.assignee, from: user.email,
        title: 'Tarefa Validada',
        message: `Sua tarefa "${task.name}" foi aprovada. ${note}`,
        type: 'success', read: false, createdAt: new Date()
      });
    } else {
      const note = prompt("Motivo da rejeição:");
      if (!note) return;
      await updateDoc(doc(db, 'gantt_items', task.id), {
        status: 'IN_PROGRESS', rejectionNote: note,
        isValidated: false, updatedAt: new Date()
      });
      await addDoc(collection(db, 'notifications'), {
        to: task.assignee, from: user.email,
        title: 'Tarefa Rejeitada',
        message: note, type: 'warning', read: false, createdAt: new Date()
      });
    }
  };

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
      finalData.level = Number(finalData.level ?? 1);
      
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
    setEditingTaskData(task
      ? { ...task, level: task.level ?? 1, uploadFolderUrl: task.uploadFolderUrl || '' }
      : { name: '', description: '', priority: 'Media', status: 'TODO', assignee: '', teamId: '', projectId: '', plannedStart: '', plannedEnd: '', progress: 0, level: 1, uploadFolderUrl: '', ...defaults }
    );
    setIsModalOpen(true);
  };



  const isAdminRole = _isAdmin(user?.role);
  const isManagerRole = isProjectManager(user?.role) || isTeamLeader(user?.role);

  const visibleTeams = isAdminRole 
    ? (teams || [])
    : (isManagerRole ? (teams || []).filter(t => t.manager === user?.email) : []);

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
            ? tasks.filter(t => t.teamId === item.id && (t.level ?? 1) > 0)
            : tasks.filter(t => t.assignee === item.email && (t.level ?? 1) > 0);

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
                        {itemTasks.filter(t => t.status === col.id).map(t => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            column={col}
                            user={user}
                            onDelete={handleDeleteTask}
                            onEdit={openModal}
                            onUpdateStatus={updateStatus}
                            onReview={handleReview}
                            projectById={projectById}
                            teamById={teamById}
                          />
                        ))}
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

      <SharedTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentTask={currentTask}
        taskData={editingTaskData}
        setTaskData={setEditingTaskData}
        onSubmit={handleSaveTask}
        teams={visibleTeams}
        users={visibleUsers}
        projects={projects}
        currentUser={user}
        allItems={tasks}
      />

    </div>
  );
}
