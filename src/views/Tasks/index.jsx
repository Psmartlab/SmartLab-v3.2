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
  }, [user?.uid]);

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <KpiCard title="Pendentes" value={tasks.filter(t => t.status === 'TODO').length} subtitle="Na Fila" icon={ListTodo} status="info" />
        <KpiCard title="Execução" value={tasks.filter(t => t.status === 'IN_PROGRESS').length} subtitle="Em Andamento" icon={Clock} status="warning" />
        <KpiCard title="Avaliação" value={tasks.filter(t => t.status === 'UNDER_REVIEW').length} subtitle="Aguardando" icon={Eye} status="info" />
        <KpiCard title="Concluídas" value={tasks.filter(t => t.status === 'DONE').length} subtitle="Total Entregue" icon={CheckCircle2} status="success" />
      </div>

      <div className="flex gap-8 overflow-x-auto pb-8 min-h-0 flex-1 custom-scrollbar">
        {STATUS_COLUMNS.map(col => (
          <div key={col.id} className="flex-1 flex flex-col rounded-[32px] border-2 border-smartlab-border bg-smartlab-surface-low/30 backdrop-blur-xl min-w-[340px] shadow-lg relative overflow-hidden group/column">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 group-hover/column:opacity-100 transition-opacity" />
            
            <div className="px-8 py-6 border-smartlab-border/30 bg-smartlab-surface/50 sticky top-0 z-20 flex items-center justify-between backdrop-blur-md border-b-2">
              <div className="flex items-center gap-3">
                <div className={cn("w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", col.dotClass)} />
                <h3 className="font-headline font-black text-xs uppercase tracking-[0.2em] text-smartlab-on-surface-variant italic">
                  {col.title}
                </h3>
                <span className="ml-2 text-[10px] font-black bg-smartlab-primary text-white px-2.5 py-1 rounded-lg border border-accent/20 shadow-sm leading-none">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <button 
                onClick={() => openModal(null, col.id)}
                className="p-2 hover:bg-accent/10 hover:text-accent rounded-xl transition-all text-smartlab-on-surface-variant/40"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-5 p-6 overflow-y-auto custom-scrollbar flex-1 pb-10">
              {tasks.filter(t => t.status === col.id).map(t => (
                  <TaskCard 
                    key={t.id} task={t} column={col} user={user} 
                    onDelete={handleDelete} onEdit={openModal} 
                    onUpdateStatus={updateStatus} onReview={handleReview} 
                    projectById={projectById} teamById={teamById}
                  />
              ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 opacity-20 group-hover/column:opacity-30 transition-opacity">
                   <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-smartlab-on-surface-variant mb-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Coluna Vazia</span>
                </div>
              )}
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
