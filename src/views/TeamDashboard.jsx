import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, TrendingUp, Target, Activity, Share2, Award } from 'lucide-react';
import SectionHeader from '../components/common/SectionHeader';
import KpiCard from '../components/common/KpiCard';
import { cn } from '../utils/cn';

export default function TeamDashboard() {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTasks = onSnapshot(collection(db, 'gantt_items'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.level > 0));
    });
    return () => { unsubTeams(); unsubTasks(); };
  }, []);

  // Aggregations
  const activeTeams = new Set(tasks.map(t => t.teamId).filter(Boolean)).size;
  const avgTasksPerTeam = teams.length ? Math.round(tasks.length / teams.length) : 0;

  // Team performance table
  const teamPerformance = teams.map(team => {
    const teamTasks = tasks.filter(t => t.teamId === team.id);
    const todo = teamTasks.filter(t => t.status === 'TODO').length;
    const inProgress = teamTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = teamTasks.filter(t => t.status === 'DONE').length;
    const orphans = teamTasks.filter(t => !t.assignee).length;
    const total = teamTasks.length;
    const completionRate = total ? Math.round((done / total) * 100) : 0;

    return { ...team, todo, inProgress, done, orphans, total, completionRate };
  }).sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <SectionHeader 
        title="Squad Analytics"
        subtitle="Visão consolidada do desempenho, alocação e velocidade das equipes"
        className="mb-12"
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard title="Estrutura" value={teams.length} subtitle="Total de Equipes" icon={Users} status="info" />
        <KpiCard title="Life Operacional" value={activeTeams} subtitle="Equipes Ativas" icon={Activity} status="success" />
        <KpiCard title="Volume Work" value={tasks.length} subtitle="Tarefas Totais" icon={Target} status="warning" />
        <KpiCard title="Performance" value={avgTasksPerTeam} subtitle="Tarefas / Equipe" icon={TrendingUp} status="info" />
      </section>

      {/* Performance Table */}
      <section className="bg-smartlab-surface rounded-[32px] shadow-xl border-2 border-smartlab-border overflow-hidden mb-12 transition-all hover:shadow-2xl">
        <div className="p-10 border-b-2 border-smartlab-border/30 bg-smartlab-surface-low/50 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic">Carga de Trabalho por Equipe</h2>
            <p className="text-smartlab-on-surface-variant font-extrabold text-[10px] uppercase tracking-[0.2em] mt-1 italic">Distribuição de tarefas e velocidade de entrega por Squad</p>
          </div>
          <div className="w-14 h-14 bg-smartlab-primary rounded-2xl flex items-center justify-center text-accent shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-accent/20">
            <Award size={28} />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-smartlab-surface-low text-smartlab-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-smartlab-border/30 italic">
                <th className="px-10 py-6">Squad / Alocação</th>
                <th className="px-10 py-6 text-center">Backlog</th>
                <th className="px-10 py-6 text-center">Doing</th>
                <th className="px-10 py-6 text-center">Órfãs</th>
                <th className="px-10 py-6 text-center">OEE Squad</th>
                <th className="px-10 py-6">Status da Métrica</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-smartlab-border/10">
              {teamPerformance.map(team => (
                <tr key={team.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-10 py-8">
                    <span className="font-black text-smartlab-on-surface block tracking-tighter uppercase italic text-lg leading-tight group-hover:text-accent transition-colors">{team.name}</span>
                    <span className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mt-1 block opacity-60 italic">Operacionais: {team.members?.length || 0} Membros</span>
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-smartlab-on-surface-variant italic opacity-40">
                    {team.todo}
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-accent italic">
                    {team.inProgress}
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-red-500 italic">
                    {team.orphans}
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-smartlab-on-surface italic">
                    {team.done}
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                      <div className="flex-1 max-w-[160px] h-3 bg-smartlab-surface-low rounded-full overflow-hidden border border-smartlab-border p-[2px]">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-1000 relative overflow-hidden" 
                          style={{ width: `${team.completionRate}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                        </div>
                      </div>
                      <span className="text-sm font-black text-smartlab-on-surface italic">{team.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {teamPerformance.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-10 py-24 text-center text-smartlab-on-surface-variant font-black uppercase tracking-[0.3em] text-[10px] italic">
                    Nenhuma equipe registrada no sistema.
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
