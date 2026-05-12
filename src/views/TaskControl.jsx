import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, User, ChevronDown, Plus, 
  Pencil, Trash2, Check, X 
} from 'lucide-react';
import { 
  isAdmin as _isAdmin, 
  isProjectManager, 
  isTeamLeader 
} from '../utils/roles';
import SharedTaskModal from '../components/tasks/SharedTaskModal';
import TaskCard from './Tasks/TaskCard';
import { TASK_LEVELS } from '../constants/tasks';
import Toast from '../components/Toast';
import { cn } from '../utils/cn';
import { demoProjects, demoTasks, demoTeams, demoUsers, isDemoUser, makeDemoId } from '../services/demoData';

const STATUS_COLUMNS = [
  { id: 'TODO', title: 'A Fazer', color: '#000000', dotClass: 'bg-black' },
  { id: 'IN_PROGRESS', title: 'Em Andamento', color: '#eab308', dotClass: 'bg-yellow-400' },
  { id: 'UNDER_REVIEW', title: 'Em Avaliação', color: '#3b82f6', dotClass: 'bg-blue-500' },
  { id: 'DONE', title: 'Concluído', color: '#10b981', dotClass: 'bg-emerald-500' }
];

const COLUMN_STYLE = {
  TODO: {
    panel: 'bg-slate-100/95 border-slate-300',
    header: 'bg-slate-900 text-white border-slate-900',
  },
  IN_PROGRESS: {
    panel: 'bg-amber-50/95 border-amber-300',
    header: 'bg-amber-500 text-white border-amber-500',
  },
  UNDER_REVIEW: {
    panel: 'bg-blue-50/95 border-blue-300',
    header: 'bg-blue-600 text-white border-blue-600',
  },
  DONE: {
    panel: 'bg-emerald-50/95 border-emerald-300',
    header: 'bg-emerald-600 text-white border-emerald-600',
  },
};

export default function TaskControl({ user }) {
  const [viewMode, setViewMode] = useState('team'); // 'team' or 'user'
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null); // null for new, {id, ...} for edit
  const [editingTaskData, setEditingTaskData] = useState({ name: '', description: '', priority: 'Media', status: 'TODO', assignee: '', teamId: '', projectId: '', plannedStart: '', plannedEnd: '', progress: 0, level: 1, uploadFolderUrl: '' });
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    if (isDemoUser(user)) {
      const timer = setTimeout(() => {
        setTasks(demoTasks);
        setTeams(demoTeams);
        setUsers(demoUsers);
        setProjects(demoProjects);
      }, 0);
      return () => clearTimeout(timer);
    }

    const unsubTasks = onSnapshot(collection(db, 'gantt_items'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTasks(); unsubUsers(); unsubTeams(); unsubProjects(); };
  }, [user]);

  const projectById = useMemo(() =>
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}),
  [projects]);

  const teamById = useMemo(() =>
    teams.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}),
  [teams]);

  const updateStatus = async (taskId, newStatus, title) => {
    const isManager = _isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);
    let finalStatus = (newStatus === 'DONE' && !isManager) ? 'UNDER_REVIEW' : newStatus;

    if (isDemoUser(user)) {
      setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: finalStatus, updatedAt: new Date().toISOString() } : task));
      setToast({ msg: finalStatus === 'UNDER_REVIEW' ? 'Enviado para avaliação!' : `Tarefa movida: ${title}`, type: 'info' });
      return;
    }

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

  const handleReview = (task, action) => {
    setReviewTarget({ task, action });
    setReviewNote('');
  };

  const confirmReview = async () => {
    if (!reviewTarget) return;
    const { task, action } = reviewTarget;
    const note = reviewNote;

    try {
      if (isDemoUser(user)) {
        if (action === 'reject' && !note) {
          setToast({ msg: 'Motivo da rejeição é obrigatório.', type: 'error' });
          return;
        }
        setTasks(prev => prev.map(item => item.id === task.id
          ? { ...item, status: action === 'approve' ? 'DONE' : 'IN_PROGRESS', validationNote: action === 'approve' ? note : '', rejectionNote: action === 'reject' ? note : '' }
          : item
        ));
        setReviewTarget(null);
        setToast({ msg: action === 'approve' ? 'Tarefa demo aprovada!' : 'Tarefa demo rejeitada.', type: action === 'approve' ? 'success' : 'warning' });
        return;
      }

      if (action === 'approve') {
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
        setToast({ msg: 'Tarefa aprovada!', type: 'success' });
      } else {
        if (!note) {
          setToast({ msg: 'Motivo da rejeição é obrigatório.', type: 'error' });
          return;
        }
        await updateDoc(doc(db, 'gantt_items', task.id), {
          status: 'IN_PROGRESS', rejectionNote: note,
          isValidated: false, updatedAt: new Date()
        });
        await addDoc(collection(db, 'notifications'), {
          to: task.assignee, from: user.email,
          title: 'Tarefa Rejeitada',
          message: note, type: 'warning', read: false, createdAt: new Date()
        });
        setToast({ msg: 'Tarefa rejeitada.', type: 'warning' });
      }
      setReviewTarget(null);
    } catch (err) {
      setToast({ msg: 'Erro na avaliação: ' + err.message, type: 'error' });
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();

    if (!editingTaskData.name || !editingTaskData.priority || !editingTaskData.status || !editingTaskData.plannedStart || !editingTaskData.plannedEnd || !editingTaskData.teamId || !editingTaskData.projectId) {
      setToast({ msg: "Por favor, preencha todos os campos obrigatórios (Responsável é opcional).", type: 'warning' });
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
           setToast({ msg: "Como colaborador, sua tarefa foi movida para Em Avaliação.", type: 'info' });
        } else {
           finalData.validationNote = '';
           finalData.isValidated = true;
           finalData.rejectionNote = '';
        }
      }

      if (currentTask?.id) {
        if (isDemoUser(user)) {
          setTasks(prev => prev.map(task => task.id === currentTask.id ? { ...task, ...finalData } : task));
          setIsModalOpen(false);
          setToast({ msg: 'Tarefa demo atualizada!', type: 'success' });
          return;
        }
        await updateDoc(doc(db, 'gantt_items', currentTask.id), finalData);
      } else {
        if (isDemoUser(user)) {
          setTasks(prev => [{ ...finalData, id: makeDemoId('task'), created_at: new Date().toISOString(), created_by: user.uid || user.id }, ...prev]);
          setIsModalOpen(false);
          setToast({ msg: 'Tarefa demo criada!', type: 'success' });
          return;
        }
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
      setToast({ msg: "Ação realizada com sucesso!", type: 'success' });
    } catch (_Err) { setToast({ msg: _Err.message, type: 'error' }); }
  };

  const handleDeleteTask = async (id) => {
    if (isDemoUser(user)) {
      setTasks(prev => prev.filter(task => task.id !== id));
      setToast({ msg: "Tarefa demo excluída!", type: 'error' });
      return;
    }

    await deleteDoc(doc(db, 'gantt_items', id));
    setToast({ msg: "Tarefa excluída com sucesso!", type: 'error' });
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
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 p-5 bg-slate-200/50 overflow-x-auto" style={{ minHeight: '150px' }}>
                  {STATUS_COLUMNS.map(col => (
                    <div
                      key={col.id}
                      className={cn(
                        "min-w-[280px] flex flex-col gap-4 rounded-2xl border-2 p-3 shadow-inner",
                        COLUMN_STYLE[col.id]?.panel
                      )}
                    >
                      <div className={cn(
                        "sticky top-0 z-20 text-[11px] font-black uppercase tracking-[0.18em] flex items-center justify-between px-4 py-3 rounded-xl border shadow-sm",
                        COLUMN_STYLE[col.id]?.header
                      )}>
                        <div className="flex items-center gap-2">
                           <div className="w-2.5 h-2.5 rounded-full bg-white/85 shadow-sm"></div>
                           {col.title}
                        </div>
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] border border-white/30">
                          {itemTasks.filter(t => t.status === col.id).length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
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
                          <div className="text-slate-500 text-[12px] font-bold italic border-2 border-dashed border-white/70 rounded-2xl p-6 text-center bg-white/70">Nenhuma tarefa</div>
                        )}
                        <button 
                          className="w-full py-3 px-4 mt-1 text-[11px] font-bold text-slate-600 hover:text-sky-700 border border-dashed border-white/70 rounded-xl hover:border-sky-300 hover:bg-white transition-all flex items-center justify-center gap-2 bg-white/60"
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

      {/* Review Modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-sm bg-black/20 animate-in fade-in duration-300">
          <div className="bg-smartlab-surface border-2 border-smartlab-border rounded-[40px] shadow-2xl p-10 max-w-lg w-full relative animate-in zoom-in-95 duration-300">
            <h3 className="font-headline font-black text-2xl text-smartlab-on-surface uppercase italic tracking-tighter mb-4">
              {reviewTarget.action === 'approve' ? 'Aprovar Entrega' : 'Rejeitar Entrega'}
            </h3>
            <p className="text-sm text-smartlab-on-surface-variant mb-6 font-bold uppercase tracking-widest leading-relaxed opacity-60">
              {reviewTarget.action === 'approve' 
                ? 'Confirma que a tarefa foi concluída conforme o esperado?' 
                : 'Informe o motivo da rejeição para que o colaborador possa corrigir.'}
            </p>

            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={reviewTarget.action === 'approve' ? 'Observação opcional...' : 'Descreva o que precisa ser corrigido...'}
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-[24px] p-6 text-sm font-bold text-smartlab-on-surface focus:border-accent outline-none transition-all min-h-[120px] placeholder:text-smartlab-on-surface-variant/30"
            />

            <div className="flex items-center gap-4 mt-8">
              <button 
                onClick={() => setReviewTarget(null)}
                className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant hover:bg-smartlab-surface-low transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmReview}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 active:scale-95",
                  reviewTarget.action === 'approve' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-red-600 shadow-red-500/20"
                )}
              >
                {reviewTarget.action === 'approve' ? <Check size={16} /> : <X size={16} />}
                {reviewTarget.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  );
}
