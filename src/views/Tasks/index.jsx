import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Plus, AlertCircle, Loader2, CheckCircle2, Clock, Eye, ListTodo, Check, X } from 'lucide-react';
import { isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../../utils/roles';
import SectionHeader from '../../components/common/SectionHeader';
import KpiCard from '../../components/common/KpiCard';
import { cn } from '../../utils/cn';
import { logAction } from '../../utils/audit';
import { STATUS_COLUMNS } from '../../constants/tasks';
import TaskCard from './TaskCard';
import SharedTaskModal from '../../components/tasks/SharedTaskModal';
import Toast from '../../components/Toast';
import { demoProjects, demoTasks, demoTeams, demoUsers, isDemoUser, makeDemoId } from '../../services/demoData';

export default function Tasks({ user }) {
  const [allTasks, setAllTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskData, setTaskData] = useState({ 
    name: '', description: '', priority: 'Media', status: 'TODO', 
    plannedStart: '', plannedEnd: '', assignee: '', 
    teamId: '', projectId: '', level: 1, uploadFolderUrl: '' 
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [reviewTask, setReviewTask] = useState(null);

  useEffect(() => {
    if (isDemoUser(user)) {
      const timer = setTimeout(() => {
        setAllTasks(demoTasks);
        setUsers(demoUsers);
        setTeams(demoTeams);
        setProjects(demoProjects);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const unsubTasks = onSnapshot(query(collection(db, 'gantt_items')), (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTasks(allData);
      setLoading(false);
    }, (err) => {
      setErrorMsg("Erro de conexão: " + err.message);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubUsers(); unsubTeams(); unsubProjects(); };
  }, [user]);

  const openModal = (task = null, status = 'TODO') => {
    setCurrentTask(task);
    if (task) {
      setTaskData({ ...task, level: task.level ?? 1, uploadFolderUrl: task.uploadFolderUrl || '' });
    } else {
      setTaskData({ 
        name: '', description: '', priority: 'Media', status, 
        plannedStart: new Date().toISOString().split('T')[0], 
        plannedEnd: '', assignee: user?.email || '', teamId: '', projectId: '', level: 1, uploadFolderUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // VALIDAÇÃO: Todos os campos exceto observações são obrigatórios.
    if (!taskData.name || !taskData.description || !taskData.priority || !taskData.status || !taskData.plannedStart || !taskData.plannedEnd || !taskData.teamId || !taskData.projectId) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios (Título, Descrição, Prioridade, Status, Datas, Equipe e Projeto).");
      return;
    }

    setIsModalOpen(false);

    if (isDemoUser(user)) {
      const finalAssignee = taskData.assignee === '' ? null : taskData.assignee;
      const finalData = { ...taskData, level: Number(taskData.level ?? 1), assignee: finalAssignee, updatedAt: new Date().toISOString() };
      if (currentTask?.id) {
        setAllTasks(prev => prev.map(task => task.id === currentTask.id ? { ...task, ...finalData } : task));
        setToast({ msg: 'Tarefa demo atualizada!', type: 'success' });
      } else {
        setAllTasks(prev => [{ ...finalData, id: makeDemoId('task'), createdAt: new Date().toISOString() }, ...prev]);
        setToast({ msg: 'Tarefa demo criada!', type: 'success' });
      }
      return;
    }

    try {
      // Gravar assignee: null se estiver 'Sem responsável' (vazio)
      const finalAssignee = taskData.assignee === '' ? null : taskData.assignee;
      const finalUrl = taskData.uploadFolderUrl?.trim() ? taskData.uploadFolderUrl.trim() : null;
      const finalData = { ...taskData, level: Number(taskData.level ?? 1), assignee: finalAssignee, uploadFolderUrl: finalUrl, updatedAt: serverTimestamp() };

      if (currentTask?.id) {
        await updateDoc(doc(db, 'gantt_items', currentTask.id), finalData);
        logAction(auth.currentUser?.email || user?.email, 'UPDATE', 'TASK', `Editou "${taskData.name}"`);
        setToast({ msg: 'Tarefa atualizada!', type: 'success' });
      } else {
        await addDoc(collection(db, 'gantt_items'), { ...finalData, createdAt: serverTimestamp() });
        logAction(auth.currentUser?.email || user?.email, 'CREATE', 'TASK', `Criou "${finalData.name}"`);
        setToast({ msg: 'Tarefa criada!', type: 'success' });
      }
    } catch (err) {
      setErrorMsg("Erro: " + err.message);
    }
  };

  const updateStatus = async (taskId, newStatus, title) => {
    const isManager = _isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);
    let finalStatus = (newStatus === 'DONE' && !isManager) ? 'UNDER_REVIEW' : newStatus;

    if (isDemoUser(user)) {
      setAllTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: finalStatus, updatedAt: new Date().toISOString() } : task));
      setToast({ msg: finalStatus === 'UNDER_REVIEW' ? 'Enviado para avaliação!' : `Tarefa movida: ${title}`, type: 'info' });
      return;
    }
    
    await updateDoc(doc(db, 'gantt_items', taskId), { status: finalStatus, updatedAt: serverTimestamp() });
    logAction(auth.currentUser?.email || user?.email, 'UPDATE', 'TASK', `Moveu "${title}" para ${finalStatus}`);
    
    if (finalStatus === 'UNDER_REVIEW') {
      setToast({ msg: 'Enviado para avaliação!', type: 'info' });
      const admins = users.filter(u => _isAdmin(u.role));
      for (const admin of admins) {
        await addDoc(collection(db, 'notifications'), { 
          to: admin.email, 
          from: auth.currentUser?.email || user?.email, 
          title: 'Tarefa Aguardando Avaliação', 
          message: `A tarefa "${title}" de ${auth.currentUser?.email || user?.email} está pronta para ser avaliada.`, 
          type: 'info', read: false, createdAt: serverTimestamp() 
        });
      }
    }
  };

  const handleReview = (task, action) => {
    setReviewTask({ task, action, note: '' });
  };

  const confirmReview = async () => {
    if (!reviewTask) return;
    const { task, action, note } = reviewTask;

    try {
      if (isDemoUser(user)) {
        if (action === 'reject' && !note) {
          setToast({ msg: 'Motivo da rejeição é obrigatório.', type: 'error' });
          return;
        }
        setAllTasks(prev => prev.map(item => item.id === task.id
          ? { ...item, status: action === 'approve' ? 'DONE' : 'IN_PROGRESS', validationNote: action === 'approve' ? note : '', rejectionNote: action === 'reject' ? note : '' }
          : item
        ));
        setReviewTask(null);
        setToast({ msg: action === 'approve' ? 'Tarefa demo aprovada!' : 'Tarefa demo rejeitada.', type: action === 'approve' ? 'success' : 'warning' });
        return;
      }

      if (action === 'approve') {
        await updateDoc(doc(db, 'gantt_items', task.id), { status: 'DONE', rejectionNote: '', validationNote: note, isValidated: true, updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'notifications'), { to: task.assignee, from: auth.currentUser?.email || user?.email, title: 'Tarefa Validada', message: `Sua tarefa "${task.name}" foi aprovada. ${note}`, type: 'success', read: false, createdAt: serverTimestamp() });
        setToast({ msg: 'Tarefa aprovada!', type: 'success' });
      } else {
        if (!note) {
          setToast({ msg: 'Motivo da rejeição é obrigatório.', type: 'error' });
          return;
        }
        await updateDoc(doc(db, 'gantt_items', task.id), { status: 'IN_PROGRESS', rejectionNote: note, isValidated: false, updatedAt: serverTimestamp() });
        await addDoc(collection(db, 'notifications'), { to: task.assignee, from: auth.currentUser?.email || user?.email, title: 'Tarefa Rejeitada', message: note, type: 'warning', read: false, createdAt: serverTimestamp() });
        setToast({ msg: 'Tarefa rejeitada.', type: 'warning' });
      }
      setReviewTask(null);
    } catch (err) {
      setToast({ msg: 'Erro na avaliação: ' + err.message, type: 'error' });
    }
  };

  const handleDelete = async (id, title) => {
    if (isDemoUser(user)) {
      setAllTasks(prev => prev.filter(task => task.id !== id));
      setToast({ msg: `Tarefa demo removida: ${title}`, type: 'error' });
      return;
    }

    await deleteDoc(doc(db, 'gantt_items', id));
    logAction(auth.currentUser?.email || user?.email, 'DELETE', 'TASK', `Excluiu "${title}"`);
    setToast({ msg: 'Tarefa removida.', type: 'error' });
  };

  const projectById = useMemo(() => 
    projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}), 
  [projects]);

  const teamById = useMemo(() => 
    teams.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}), 
  [teams]);

  if (loading) return <div className="flex items-center justify-center h-full gap-2"><Loader2 className="animate-spin text-primary" /> Carregando...</div>;

  const userProjects = user?.projectIds || [];
  const userTeams = user?.teamIds || [];

  const tasks = allTasks.filter(t => {
    const taskLevel = t.level ?? 1;
    if (taskLevel <= 0) return false;
    
    if (!showUnassigned) {
      if (_isAdmin(user?.role)) return true;
      return t.assignee === user?.email;
    } else {
      if (t.assignee === user?.email) return true;
      if (t.assignee === null) {
        if (_isAdmin(user?.role)) return true;
        if (isProjectManager(user?.role) && userProjects.includes(t.projectId)) return true;
        if (isTeamLeader(user?.role) && userTeams.includes(t.teamId)) return true;
      }
      return false;
    }
  });


  return (
    <div className="pb-12 animate-in fade-in duration-500 h-full flex flex-col">
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-2xl text-red-500 flex items-center gap-3 font-black text-xs uppercase tracking-widest italic animate-in slide-in-from-top-4">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}
      
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">
            Operação & Workflow
          </h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            Gerencie o fluxo de trabalho e prazos com precisão cirúrgica
          </p>
        </div>
      </header>

      <div className="mb-4 flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm font-bold text-smartlab-on-surface-variant cursor-pointer group">
          <input 
            type="checkbox" 
            checked={showUnassigned} 
            onChange={e => setShowUnassigned(e.target.checked)} 
            className="w-4 h-4 rounded border-slate-300 text-smartlab-primary focus:ring-smartlab-primary" 
          />
          <span className="group-hover:text-smartlab-primary transition-colors">Mostrar não atribuídas do meu escopo</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <KpiCard title="Pendentes" value={tasks.filter(t => t.status === 'TODO').length} subtitle="Na Fila" icon={ListTodo} status="info" />
        <KpiCard title="Execução" value={tasks.filter(t => t.status === 'IN_PROGRESS').length} subtitle="Em Andamento" icon={Clock} status="warning" />
        <KpiCard title="Avaliação" value={tasks.filter(t => t.status === 'UNDER_REVIEW').length} subtitle="Aguardando" icon={Eye} status="info" />
        <KpiCard title="Concluídas" value={tasks.filter(t => t.status === 'DONE').length} subtitle="Total Entregue" icon={CheckCircle2} status="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 overflow-x-auto pb-8 min-h-0 flex-1 custom-scrollbar">
        {STATUS_COLUMNS.map(col => (
          <div
            key={col.id}
            className={cn(
              "min-w-[280px] flex flex-col gap-4 rounded-2xl border-2 p-3 shadow-inner",
              col.panelClass
            )}
          >
            <div className={cn(
              "sticky top-0 z-20 flex items-center justify-between rounded-xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] shadow-sm",
              col.headerClass
            )}>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-white/85 shadow-sm" />
                <h3 className="font-black text-[11px] uppercase tracking-[0.18em]">
                  {col.title}
                </h3>
                <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[10px] font-black text-white">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <button 
                onClick={() => openModal(null, col.id)}
                className="rounded-xl p-2 text-white/85 transition-all hover:bg-white/15 hover:text-white"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pb-2">
              {tasks.filter(t => t.status === col.id).map(t => (
                  <TaskCard 
                    key={t.id} task={t} column={col} user={user} 
                    onDelete={handleDelete} onEdit={openModal} 
                    onUpdateStatus={updateStatus} onReview={handleReview} 
                    projectById={projectById} teamById={teamById}
                  />
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-white/70 bg-white/70 p-6 text-center text-[12px] font-bold italic text-slate-500">
                  Nenhuma tarefa
                </div>
              )}
              <button
                onClick={() => openModal(null, col.id)}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/70 bg-white/60 px-4 py-3 text-[11px] font-bold text-slate-600 transition-all hover:border-sky-300 hover:bg-white hover:text-sky-700"
              >
                <Plus size={14} /> Adicionar em {col.title}
              </button>
            </div>
          </div>
        ))}
      </div>

      <SharedTaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setErrorMsg(null); }}
        currentTask={currentTask}
        taskData={taskData}
        setTaskData={setTaskData}
        onSubmit={handleSubmit}
        teams={teams}
        users={users}
        projects={projects}
        currentUser={user}
        allItems={allTasks.filter(t => typeof t.level === 'number' && t.level >= 0)}
        error={errorMsg}
      />

      {/* Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-sm bg-black/20 animate-in fade-in duration-300">
          <div className="bg-smartlab-surface border-2 border-smartlab-border rounded-[40px] shadow-2xl p-10 max-w-lg w-full relative animate-in zoom-in-95 duration-300">
            <h3 className="font-headline font-black text-2xl text-smartlab-on-surface uppercase italic tracking-tighter mb-4">
              {reviewTask.action === 'approve' ? 'Aprovar Entrega' : 'Rejeitar Entrega'}
            </h3>
            <p className="text-sm text-smartlab-on-surface-variant mb-6 font-bold uppercase tracking-widest leading-relaxed opacity-60">
              {reviewTask.action === 'approve' 
                ? 'Confirma que a tarefa foi concluída conforme o esperado?' 
                : 'Informe o motivo da rejeição para que o colaborador possa corrigir.'}
            </p>

            <textarea
              value={reviewTask.note}
              onChange={(e) => setReviewTask(s => ({ ...s, note: e.target.value }))}
              placeholder={reviewTask.action === 'approve' ? 'Observação opcional...' : 'Descreva o que precisa ser corrigido...'}
              className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-[24px] p-6 text-sm font-bold text-smartlab-on-surface focus:border-accent outline-none transition-all min-h-[120px] placeholder:text-smartlab-on-surface-variant/30"
            />

            <div className="flex items-center gap-4 mt-8">
              <button 
                onClick={() => setReviewTask(null)}
                className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant hover:bg-smartlab-surface-low transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmReview}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-105 active:scale-95",
                  reviewTask.action === 'approve' ? "bg-emerald-600 shadow-emerald-500/20" : "bg-red-600 shadow-red-500/20"
                )}
              >
                {reviewTask.action === 'approve' ? <Check size={16} /> : <X size={16} />}
                {reviewTask.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  );
}
