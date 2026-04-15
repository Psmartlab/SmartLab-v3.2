import React, { useState, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import TeamDashboard from './TeamDashboard';
import ProjectDashboard from './ProjectDashboard';
import UserDashboard from './UserDashboard';
import KpiCard from '../components/common/KpiCard';
import TabSwitcher from '../components/common/TabSwitcher';
import SectionHeader from '../components/common/SectionHeader';
import { cn } from '../utils/cn';
import { LayoutDashboard, Users, Database, Shield, ListTodo, History, Eye, CheckCircle2, AlertTriangle, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../utils/roles';

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('geral');
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [expandedKpi, setExpandedKpi] = useState(null);
  
  const isAdmin = _isAdmin(user?.role);
  const container = useRef();

  useGSAP(() => {
    // Sections fade & float up
    gsap.from('.dashboard-section', {
      duration: 1,
      y: 40,
      opacity: 0,
      stagger: 0.15,
      ease: 'power3.out',
    });
  }, { scope: container, dependencies: [currentTab] });

  useEffect(() => {
    // Escuta tarefas em tempo real
    const qTasks = query(collection(db, 'gantt_items'));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const t = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.level > 0);
      setTasks(t);
    }, (err) => console.error("Erro ao buscar tarefas:", err));

    // Escuta projetos em tempo real
    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      const p = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(p);
    }, (err) => console.error("Erro ao buscar projetos:", err));

    // Escuta equipes em tempo real
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubTeams = onSnapshot(qTeams, (snap) => {
      const t = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(t);
    }, (err) => console.error("Erro ao buscar equipes:", err));

    return () => {
      unsubTasks();
      unsubProjects();
      unsubTeams();
    };
  }, []);

  const teamPerformance = teams.map(team => {
    const teamTasks = tasks.filter(t => t.teamId === team.id);
    const todo = teamTasks.filter(t => t.status === 'TODO').length;
    const inProgress = teamTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = teamTasks.filter(t => t.status === 'DONE').length;
    const total = teamTasks.length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;
    return { ...team, todo, inProgress, done, total, completionRate };
  }).sort((a, b) => b.completionRate - a.completionRate);

  const todoTasks = tasks.filter(t => t.status === 'TODO');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const underReviewTasks = tasks.filter(t => t.status === 'UNDER_REVIEW');
  const doneTasks = tasks.filter(t => t.status === 'DONE');
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'DONE') return false;
    if (!t.plannedEnd) return false;
    return new Date(t.plannedEnd) < new Date();
  });

  const unassignedTasks = tasks.filter(t => !t.assignee && (
    isAdmin || 
    (isProjectManager(user?.role) && (user?.projectIds || []).includes(t.projectId)) ||
    (isTeamLeader(user?.role) && (user?.teamIds || []).includes(t.teamId))
  ));

  const handleKpiClick = (status) => {
    setExpandedKpi(expandedKpi === status ? null : status);
  };

  const renderExpandedList = () => {
    if (!expandedKpi) return null;
    let list = [];
    if (expandedKpi === 'TODO') list = todoTasks;
    if (expandedKpi === 'IN_PROGRESS') list = inProgressTasks;
    if (expandedKpi === 'UNDER_REVIEW') list = underReviewTasks;
    if (expandedKpi === 'DONE') list = doneTasks;
    if (expandedKpi === 'OVERDUE') list = overdueTasks;
    if (expandedKpi === 'UNASSIGNED') {
      list = [...unassignedTasks].sort((a,b) => {
        if (!a.plannedEnd) return 1;
        if (!b.plannedEnd) return -1;
        return new Date(a.plannedEnd) - new Date(b.plannedEnd);
      }).slice(0, 5);
    }

    const getKpiTitle = () => {
      switch(expandedKpi) {
        case 'TODO': return 'Tarefas Pendentes';
        case 'IN_PROGRESS': return 'Em Andamento';
        case 'UNDER_REVIEW': return 'Em Avaliação';
        case 'DONE': return 'Concluídas';
        case 'OVERDUE': return 'Atrasadas';
        case 'UNASSIGNED': return 'Sem Responsável (5 Mais Urgentes)';
        default: return '';
      }
    };

    return (
      <div className="mb-8 p-6 bg-slate-50 rounded-xl border-2 border-slate-200 animate-in fade-in zoom-in duration-300 shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline font-black text-lg text-smartlab-primary tracking-tight">
            Detalhes: {getKpiTitle()}
          </h3>
          <button onClick={() => setExpandedKpi(null)} className="text-slate-400 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined font-black">close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.length === 0 ? (
            <p className="text-slate-400 text-sm italic col-span-full">Nenhuma tarefa encontrada neste status.</p>
          ) : list.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-slate-200/60 hover:border-slate-300 transition-colors">
              <span className="font-medium text-slate-700 truncate mr-2" title={t.name}>{t.name}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md shrink-0 uppercase tracking-tighter border border-slate-100">
                {projects.find(p => p.id === t.projectId)?.name || t.projectName || 'Geral'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const chartData = useMemo(() => [
    {"day": "SEG", "height": "40%", "active": false},
    {"day": "TER", "height": "65%", "active": false},
    {"day": "QUA", "height": "85%", "active": true},
    {"day": "QUI", "height": "50%", "active": false},
    {"day": "SEX", "height": "75%", "active": false},
    {"day": "SÁB", "height": "30%", "active": false}
  ], []);

  const renderGeral = () => (
    <>
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 w-full">
        {[
          { title: 'Pendente', value: todoTasks.length, subtitle: 'A Fazer', icon: ListTodo, status: 'default', key: 'TODO' },
          { title: 'Fluxo', value: inProgressTasks.length, subtitle: 'Em Andamento', icon: History, status: 'warning', key: 'IN_PROGRESS' },
          { title: 'Revisão', value: underReviewTasks.length, subtitle: 'Em Avaliação', icon: Eye, status: 'info', key: 'UNDER_REVIEW' },
          { title: 'Fim', value: doneTasks.length, subtitle: 'Concluídas', icon: CheckCircle2, status: 'success', key: 'DONE' },
          { title: 'Alerta', value: overdueTasks.length, subtitle: 'Atrasadas', icon: AlertTriangle, status: 'danger', key: 'OVERDUE' },
          { title: 'Órfãs', value: unassignedTasks.length, subtitle: 'Sem Responsável', icon: Users, status: 'danger', key: 'UNASSIGNED' },
        ].map((card, i) => (
          <KpiCard
            key={card.key}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            status={card.status}
            isExpanded={expandedKpi === card.key}
            onClick={() => handleKpiClick(card.key)}
            style={{ animationDelay: `${i * 80}ms` }}
            className="animate-fade-up"
          />
        ))}
      </section>

      {renderExpandedList()}

      <section className={cn(
        "dashboard-section grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
      )}>
        <div className="lg:col-span-2 bg-smartlab-surface p-8 rounded-[32px] shadow-xl border-2 border-smartlab-border flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <SectionHeader 
            title="Fluxo de Produtividade"
            subtitle="Análise de Rendimento Operacional em tempo real"
            className="mb-8"
          >
            <div className="flex gap-2">
              <select className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl font-black text-[10px] py-2.5 px-5 focus:border-accent outline-none uppercase tracking-widest text-smartlab-on-surface-variant transition-all hover:border-smartlab-on-surface">
                <option>Esta Semana</option>
                <option>Última Semana</option>
              </select>
            </div>
          </SectionHeader>
          
          <div className="flex-1 flex items-end justify-between gap-3 sm:gap-6 mt-auto border-b-2 border-smartlab-border/50 pb-2 pt-8 min-h-[300px]">
            {chartData.map((bar) => (
              <div key={bar.day} className="flex flex-col items-center gap-4 flex-1 justify-end group/bar">
                <div 
                  className={cn(
                    "w-full max-w-16 rounded-t-2xl transition-all duration-700 cursor-pointer relative",
                    bar.active 
                      ? 'bg-accent shadow-[0_0_30px_rgba(14,165,233,0.3)]' 
                      : 'bg-smartlab-surface-low hover:bg-accent/20'
                  )}
                  style={{ height: bar.height }}
                >
                  {bar.active && <div className="absolute -top-1 left-0 w-full h-1 bg-white/40 rounded-full blur-[2px]" />}
                </div>
                <span className={cn(
                  "text-[10px] font-black tracking-[0.2em] uppercase italic transition-colors",
                  bar.active ? 'text-accent' : 'text-smartlab-on-surface-variant group-hover/bar:text-smartlab-on-surface'
                )}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-smartlab-primary text-white p-10 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col justify-between border-2 border-white/5 group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent opacity-[0.05] rounded-full blur-[60px] -mr-24 -mt-24 group-hover:bg-accent/10 transition-colors" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-8 font-headline tracking-tight text-white leading-none">
              Ações<br/>Rápidas
            </h2>
            <div className="space-y-4">
              {[
                { icon: Shield, label: 'Criar Equipe', sub: 'Novo squad', onClick: () => navigate('/teams?action=new') },
                { icon: Users, label: 'Convidar Membro', sub: 'Expandir equipe', onClick: () => navigate('/control') },
                { icon: Rocket, label: 'Lançar Projeto', sub: 'Nova iniciativa', onClick: () => navigate('/projects?action=new') },
              ].map((action, idx) => (
                <button key={idx} onClick={action.onClick} className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white text-white hover:text-smartlab-primary rounded-2xl transition-all border-2 border-white/5 group/btn">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl group-hover/btn:bg-smartlab-primary/5 transition-colors">
                      <action.icon size={20} className="text-accent group-hover/btn:text-smartlab-primary transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-[11px] uppercase tracking-[0.1em]">{action.label}</p>
                      <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-0.5">{action.sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-accent opacity-30 group-hover/btn:opacity-100 transition-all">arrow_forward</span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative z-10 mt-12 pt-8 border-t-2 border-white/5">
            <p className="text-white/30 text-[9px] font-black leading-relaxed flex items-center gap-3 uppercase tracking-[0.3em]">
               <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
               Cloud Sync: Online
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-section bg-smartlab-surface rounded-[24px] shadow-[var(--glass-shadow)] border-2 border-smartlab-border overflow-hidden mb-12">
        <div className="p-8 border-b-2 border-smartlab-border flex flex-col md:flex-row justify-between md:items-center gap-4 bg-smartlab-surface-low/30">
          <SectionHeader 
            title="Carga de Trabalho por Equipe" 
            subtitle="Distribuição de tarefas e velocidade de entrega por Squad" 
            className="mb-0"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-smartlab-surface-low text-smartlab-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] border-b border-smartlab-border">
                <th className="px-8 py-5">Squad / Alocação</th>
                <th className="px-8 py-5 text-center">Backlog</th>
                <th className="px-8 py-5 text-center">Doing</th>
                <th className="px-8 py-5 text-center">OEE Squad</th>
                <th className="px-8 py-5">Status da Métrica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-smartlab-border">
              {teamPerformance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center text-smartlab-on-surface-variant italic font-medium">Nenhuma equipe registrada no sistema.</td>
                </tr>
              ) : teamPerformance.slice(0, 5).map(team => (
                <tr key={team.id} className="hover:bg-smartlab-surface-low/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-bold text-smartlab-on-surface block group-hover:text-black transition-colors">{team.name}</span>
                    <span className="text-[10px] text-smartlab-on-surface-variant mt-1 block font-black uppercase tracking-widest">{team.members?.length || 0} Membros</span>
                  </td>
                  <td className="px-8 py-6 text-center text-lg font-black text-smartlab-on-surface-variant opacity-60">
                    {team.todo}
                  </td>
                  <td className="px-8 py-6 text-center text-lg font-black text-accent">
                    {team.inProgress}
                  </td>
                  <td className="px-8 py-6 text-center text-lg font-black text-smartlab-on-surface">
                    {team.done}
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-full max-w-[120px] h-2 bg-smartlab-border rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        team.completionRate > 80 ? 'bg-emerald-500' : team.completionRate < 30 ? 'bg-red-500' : 'bg-smartlab-on-surface'
                      )} style={{ width: `${team.completionRate || 0}%` }}></div>
                    </div>
                    <span className="text-[10px] font-black mt-2 block text-smartlab-on-surface-variant uppercase tracking-tighter">{team.completionRate || 0}% concluído</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section bg-smartlab-surface rounded-[24px] shadow-[var(--glass-shadow)] border-2 border-smartlab-border overflow-hidden mb-12">
        <div className="p-8 border-b-2 border-smartlab-border flex flex-col md:flex-row justify-between md:items-center gap-4 bg-smartlab-surface-low/30">
          <SectionHeader 
            title="Status de Projetos" 
            subtitle="Monitoramento de Iniciativas Críticas" 
            className="mb-0"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-smartlab-surface-low text-smartlab-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] border-b border-smartlab-border">
                <th className="px-8 py-5">Projeto</th>
                <th className="px-8 py-5">Líder</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-smartlab-border">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-12 text-center text-smartlab-on-surface-variant italic font-medium">Nenhum projeto registrado no sistema.</td>
                </tr>
              ) : projects.slice(0, 5).map(proj => (
                <tr key={proj.id} className="hover:bg-smartlab-surface-low/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-bold text-smartlab-on-surface block group-hover:text-black transition-colors">{proj.name}</span>
                    <span className="text-[10px] text-smartlab-on-surface-variant mt-1 block font-black uppercase tracking-widest">{proj.area || 'Diversos'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-smartlab-on-surface flex items-center justify-center text-[10px] font-black text-smartlab-surface">
                        {proj.leader?.charAt(0) || 'L'}
                      </div>
                      <span className="text-sm font-bold text-smartlab-on-surface">{proj.leader || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 text-[9px] font-black rounded border uppercase tracking-widest shadow-sm",
                      proj.status === 'Crítico' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-smartlab-surface-low text-smartlab-on-surface-variant border-smartlab-border'
                    )}>
                      {proj.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-full max-w-[120px] h-2 bg-smartlab-border rounded-full overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        proj.progress > 80 ? 'bg-emerald-500' : proj.progress < 30 ? 'bg-red-500' : 'bg-smartlab-on-surface'
                      )} style={{ width: `${proj.progress || 0}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mt-1 block opacity-60 italic">
                      {projects.find(p => p.id === proj.id)?.name || proj.name}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );


  const tabs = useMemo(() => [
    { id: 'geral', label: 'Geral', icon: 'dashboard', lucideIcon: LayoutDashboard },
    { id: 'teams', label: 'Equipes', icon: 'groups', lucideIcon: Users },
    { id: 'projects', label: 'Projetos', icon: 'engineering', lucideIcon: Database },
    { id: 'users', label: 'Usuários', icon: 'manage_accounts', lucideIcon: Shield }
  ].filter(tab => {
    if (tab.id === 'users') return isAdmin;
    if (tab.id === 'teams' || tab.id === 'projects') return isAdmin || isProjectManager(user?.role) || isTeamLeader(user?.role);
    return true;
  }), [isAdmin, user?.role]);

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'teams': return <TeamDashboard />;
      case 'projects': return <ProjectDashboard />;
      case 'users': return <UserDashboard />;
      default: return renderGeral();
    }
  };

  return (
    <div className="pb-12 perspective-[1500px]" ref={container}>
      <header className="dashboard-section flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">
            {currentTab === 'geral' ? 'Intelligence Hub' : 
             currentTab === 'teams' ? 'Squad Analytics' :
             currentTab === 'projects' ? 'Project Radar' : 'Access Control'}
          </h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            {currentTab === 'geral' ? 'Visão consolidada da operação SmartLab' : 'Métricas granulares por contexto estratégico'}
          </p>
        </div>

        <TabSwitcher 
          tabs={tabs} 
          activeTab={currentTab} 
          onTabChange={setCurrentTab} 
        />
      </header>

      <div className="dashboard-section">
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default Dashboard;
