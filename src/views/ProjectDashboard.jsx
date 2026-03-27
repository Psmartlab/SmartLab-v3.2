import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, BarChart3, AlertCircle, PlayCircle, Layers, TrendingUp } from 'lucide-react';
import SectionHeader from '../components/common/SectionHeader';
import KpiCard from '../components/common/KpiCard';
import { cn } from '../utils/cn';

export default function ProjectDashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProjects(); unsubTasks(); };
  }, []);

  const today = new Date();
  today.setHours(0,0,0,0);

  // Aggregations
  const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'Ativo').length;
  const overdueTasks = tasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < today).length;

  // Project progress table
  const projectProgress = projects.map(proj => {
    const projTasks = tasks.filter(t => t.projectId === proj.name || t.projectId === proj.id);
    const done = projTasks.filter(t => t.status === 'DONE').length;
    const total = projTasks.length;
    const overdue = projTasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < today).length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return { ...proj, done, total, overdue, progress };
  }).sort((a, b) => b.progress - a.progress);

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <SectionHeader 
        title="Project Radar"
        subtitle="Visão consolidada do progresso, prazos e marcos dos projetos em tempo real"
        className="mb-12"
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard title="Portfólio" value={projects.length} subtitle="Total de Projetos" icon={Briefcase} status="info" />
        <KpiCard title="Ativos" value={activeProjects} subtitle="Em Execução" icon={PlayCircle} status="success" />
        <KpiCard title="OEE Médio" value={`${projects.length ? Math.round(projectProgress.reduce((acc, curr) => acc + curr.progress, 0) / projects.length) : 0}%`} subtitle="Performance Global" icon={BarChart3} status="info" />
        <KpiCard title="Risco" value={overdueTasks} subtitle="Tarefas em Atraso" icon={AlertCircle} status="error" />
      </section>

      {/* Progress Table */}
      <section className="bg-smartlab-surface rounded-[32px] shadow-xl border-2 border-smartlab-border overflow-hidden mb-12 transition-all hover:shadow-2xl">
        <div className="p-10 border-b-2 border-smartlab-border/30 bg-smartlab-surface-low/50 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic">Saúde dos Projetos</h2>
            <p className="text-smartlab-on-surface-variant font-extrabold text-[10px] uppercase tracking-[0.2em] mt-1 italic">Análise de OEE e prazos por unidade</p>
          </div>
          <div className="w-14 h-14 bg-smartlab-primary rounded-2xl flex items-center justify-center text-accent shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-accent/20">
            <Layers size={28} />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-smartlab-surface-low text-smartlab-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-smartlab-border/30 italic">
                <th className="px-10 py-6">Projeto / ID</th>
                <th className="px-10 py-6">Owner Equipe</th>
                <th className="px-10 py-6 text-center">Status Alerta</th>
                <th className="px-10 py-6">Progresso Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-smartlab-border/10">
              {projectProgress.map(proj => (
                <tr key={proj.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-10 py-8">
                    <span className="font-black text-smartlab-on-surface block tracking-tighter uppercase italic text-lg leading-tight group-hover:text-accent transition-colors">{proj.name}</span>
                    <span className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mt-1 block opacity-60 italic">
                      {proj.status === 'Active' || proj.status === 'Ativo' ? 'Fase de Execução' : proj.status}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-smartlab-surface-low border border-smartlab-border flex items-center justify-center text-[10px] font-black text-accent shadow-sm">
                        {proj.teamId?.charAt(0).toUpperCase() || '—'}
                      </div>
                      <span className="text-[11px] font-black text-smartlab-on-surface-variant uppercase tracking-tight">{proj.teamId || 'SEM ALOCAÇÃO'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    {proj.overdue > 0 ? (
                      <span className="px-4 py-2 bg-red-500/10 text-red-500 border-2 border-red-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-inner animate-pulse">
                        {proj.overdue} Tasks Críticas
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-accent bg-accent/5 px-4 py-2 rounded-xl border-2 border-accent/10 uppercase tracking-widest shadow-inner">Estável</span>
                    )}
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-black text-smartlab-on-surface italic">{proj.progress}%</span>
                        <span className="text-[9px] font-black text-smartlab-on-surface-variant uppercase tracking-[0.2em] opacity-40">{proj.done}/{proj.total} ENTREGAS</span>
                      </div>
                      <div className="h-3 bg-smartlab-surface-low rounded-full overflow-hidden border border-smartlab-border p-[2px]">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000 relative overflow-hidden shadow-[0_0_10px_rgba(14,165,233,0.3)]",
                            proj.progress === 100 ? 'bg-accent' : 
                            proj.progress < 30 ? 'bg-red-500' : 
                            'bg-accent'
                          )} 
                          style={{ width: `${proj.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {projectProgress.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-10 py-24 text-center text-smartlab-on-surface-variant font-black uppercase tracking-[0.3em] text-[10px] italic">
                    Nenhum projeto registrado no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
