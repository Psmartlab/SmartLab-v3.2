import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Plus, AlertCircle, Loader2, CheckCircle2, Clock, Eye, ListTodo } from 'lucide-react';
import SectionHeader from '../../components/common/SectionHeader';
import KpiCard from '../../components/common/KpiCard';
import { cn } from '../../utils/cn';
import { logAction } from '../../utils/audit';
import { STATUS_COLUMNS } from '../../constants/tasks';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskData, setTaskData] = useState({ title: '', description: '', priority: 'Media', status: 'TODO', startDate: '', dueDate: '', assignee: '', teamId: '', projectId: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const unsubTasks = onSnapshot(query(collection(db, 'tasks')), (snap) => {
      const allTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(allTasks.filter(t => t.assignee === user?.email));
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
      setTaskData({ ...task });
    } else {
      setTaskData({ 
        title: '', description: '', priority: 'Media', status, 
        startDate: new Date().toISOString().split('T')[0], 
        dueDate: '', assignee: user?.role === 'User' ? user.email : (user?.email || ''), teamId: '', projectId: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // VALIDAÇÃO: Todos os campos exceto observações são obrigatórios.
    if (!taskData.title || !taskData.description || !taskData.priority || !taskData.status || !taskData.startDate || !taskData.dueDate || !taskData.teamId || !taskData.projectId) {
      alert("Por favor, preencha todos os campos obrigatórios (Título, Descrição, Prioridade, Status, Datas, Equipe e Projeto).");
      return;
    }

    setIsModalOpen(false);

    try {
      // Força a atribuição da tarefa criada no "Minhas Tarefas" para o usuário logado
      const finalData = { ...taskData, assignee: user.email };

      if (currentTask?.id) {
        await updateDoc(doc(db, 'tasks', currentTask.id), finalData);
        logAction(auth.currentUser.email, 'UPDATE', 'TASK', `Editou "${taskData.title}"`);
      } else {
        await addDoc(collection(db, 'tasks'), { ...finalData, created_by: user.uid || user.id, created_at: serverTimestamp() });
        logAction(auth.currentUser.email, 'CREATE', 'TASK', `Criou "${finalData.title}"`);
      }
    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const updateStatus = async (taskId, newStatus, title) => {
    const isManager = user?.role === 'Admin' || user?.role === 'Gerente' || user?.role === 'Manager';
    let finalStatus = (newStatus === 'DONE' && !isManager) ? 'UNDER_REVIEW' : newStatus;
    
    await updateDoc(doc(db, 'tasks', taskId), { status: finalStatus });
    logAction(auth.currentUser.email, 'UPDATE', 'TASK', `Moveu "${title}" para ${finalStatus}`);
    
    if (finalStatus === 'UNDER_REVIEW') {
      alert("Enviado para avaliação!");
      const admins = users.filter(u => u.role === 'Admin');
      for (const admin of admins) {
        await addDoc(collection(db, 'notifications'), { 
          to: admin.email, 
          from: auth.currentUser.email, 
          title: 'Tarefa Aguardando Avaliação', 
          message: `A tarefa "${title}" de ${auth.currentUser.email} está pronta para ser avaliada.`, 
          type: 'info', read: false, createdAt: serverTimestamp() 
        });
      }
    }
  };

  const handleReview = async (task, action) => {
    if (action === 'approve') {
      const note = prompt("Observação de validação (opcional):") || '';
      await updateDoc(doc(db, 'tasks', task.id), { status: 'DONE', rejectionNote: '', validationNote: note, isValidated: true });
      await addDoc(collection(db, 'notifications'), { to: task.assignee, from: auth.currentUser.email, title: 'Tarefa Validada', message: `Sua tarefa "${task.title}" foi aprovada. ${note}`, type: 'success', read: false, createdAt: serverTimestamp() });
    } else {
      const note = prompt("Motivo da rejeição:");
      if (!note) return;
      await updateDoc(doc(db, 'tasks', task.id), { status: 'IN_PROGRESS', rejectionNote: note, isValidated: false });
      await addDoc(collection(db, 'notifications'), { to: task.assignee, from: auth.currentUser.email, title: 'Tarefa Rejeitada', message: note, type: 'warning', read: false, createdAt: serverTimestamp() });
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm("Excluir tarefa?")) {
      await deleteDoc(doc(db, 'tasks', id));
      logAction(auth.currentUser.email, 'DELETE', 'TASK', `Excluiu "${title}"`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full gap-2"><Loader2 className="animate-spin text-primary" /> Carregando...</div>;

  return (
    <div className="pb-12 animate-in fade-in duration-500 h-full flex flex-col">
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-2xl text-red-500 flex items-center gap-3 font-black text-xs uppercase tracking-widest italic animate-in slide-in-from-top-4">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}
      
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">
            Task Control Center
          </h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            Gerencie o fluxo de trabalho e prazos com precisão cirúrgica
          </p>
        </div>
        <button 
          className="flex items-center gap-3 px-8 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95 group" 
          onClick={() => openModal()}
        >
          <Plus size={18} className="text-accent group-hover:rotate-90 transition-transform" /> 
          Nova Tarefa
        </button>
      </header>

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

      <TaskModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
        currentTask={currentTask} taskData={taskData} setTaskData={setTaskData} 
        onSubmit={handleSubmit} teams={teams} users={users} projects={projects} currentUser={user} 
      />
    </div>
  );
}
