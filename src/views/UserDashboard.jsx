import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserCheck, PieChart, BadgeCheck, Timer, Users, TrendingUp } from 'lucide-react';
import SectionHeader from '../components/common/SectionHeader';
import KpiCard from '../components/common/KpiCard';
import { cn } from '../utils/cn';

export default function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubUsers(); unsubTasks(); };
  }, []);

  // Use the email or name to match assignee for users
  const userPerformance = users.map(u => {
    // some tasks might match by user.name or user.email
    const userTasks = tasks.filter(t => t.assignee === u.name || t.assignee === u.email);
    const done = userTasks.filter(t => t.status === 'DONE').length;
    const underReview = userTasks.filter(t => t.status === 'UNDER_REVIEW').length;
    const inProgress = userTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const total = userTasks.length;
    
    return { ...u, done, underReview, inProgress, total };
  }).sort((a, b) => b.done - a.done);

  const activeAssignees = new Set(tasks.map(t => t.assignee).filter(Boolean)).size;
  const totalCompleted = tasks.filter(t => t.status === 'DONE').length;
  
  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <SectionHeader 
        title="Acesso e Performance"
        subtitle="Visão consolidada da assiduidade e rendimento individual em tempo real"
        className="mb-12"
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <KpiCard title="Total" value={users.length} subtitle="Membros da Rede" icon={Users} status="info" />
        <KpiCard title="Ativos" value={activeAssignees} subtitle="Operando Agora" icon={Timer} status="success" />
        <KpiCard title="Entregas" value={totalCompleted} subtitle="Total Concluído" icon={BadgeCheck} status="warning" />
        <KpiCard title="OEE" value={`${users.length && tasks.length ? Math.round((activeAssignees / users.length) * 100) : 0}%`} subtitle="Engajamento Médio" icon={TrendingUp} status="info" />
      </section>

      {/* Hero Table */}
      <section className="bg-smartlab-surface rounded-[32px] shadow-xl border-2 border-smartlab-border overflow-hidden mb-12 transition-all hover:shadow-2xl">
        <div className="p-10 border-b-2 border-smartlab-border/30 bg-smartlab-surface-low/50 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic">Top Performance Individual</h2>
            <p className="text-smartlab-on-surface-variant font-extrabold text-[10px] uppercase tracking-[0.2em] mt-1 italic">Ranking de produtividade e assiduidade</p>
          </div>
          <div className="w-14 h-14 bg-smartlab-primary rounded-2xl flex items-center justify-center text-accent shadow-[0_0_20px_rgba(14,165,233,0.3)] border border-accent/20">
            <BadgeCheck size={28} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="bg-smartlab-surface-low text-smartlab-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] border-b-2 border-smartlab-border/30 italic">
                <th className="px-10 py-6">Usuário / Cargo</th>
                <th className="px-10 py-6 text-center">Entregues</th>
                <th className="px-10 py-6 text-center">Em Avaliação</th>
                <th className="px-10 py-6 text-center">Andamento</th>
                <th className="px-10 py-6 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-smartlab-border/10">
              {userPerformance.map((user, index) => (
                <tr key={user.id} className="hover:bg-accent/5 transition-colors group">
                  <td className="px-10 py-8 flex items-center gap-5">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all relative",
                      index === 0 
                        ? 'bg-accent text-white border-accent shadow-[0_0_20px_rgba(14,165,233,0.4)] scale-110' 
                        : 'bg-smartlab-surface-low text-smartlab-on-surface-variant border-smartlab-border'
                    )}>
                      {index === 0 ? <BadgeCheck size={24} /> : user.name?.charAt(0) || user.email?.charAt(0)}
                      {index === 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-accent rounded-full flex items-center justify-center shadow-lg border-2 border-accent">
                        <span className="text-[10px] font-black">1</span>
                      </div>}
                    </div>
                    <div>
                      <span className="font-black text-smartlab-on-surface block tracking-tighter uppercase italic text-lg leading-tight group-hover:text-accent transition-colors">{user.name || user.email}</span>
                      <span className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mt-1 block opacity-60 italic">{user.role || 'Operador Nível I'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-accent italic">
                    {user.done}
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-smartlab-on-surface italic opacity-80">
                    {user.underReview}
                  </td>
                  <td className="px-10 py-8 text-center text-xl font-black font-headline text-smartlab-on-surface-variant italic opacity-40">
                    {user.inProgress}
                  </td>
                  <td className="px-10 py-8 text-center">
                    <span className="text-2xl font-black font-headline text-smartlab-on-surface border-b-4 border-accent/20 pb-1 italic">{user.total}</span>
                  </td>
                </tr>
              ))}
              {userPerformance.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-10 py-24 text-center text-smartlab-on-surface-variant font-black uppercase tracking-[0.3em] text-[10px] italic">
                    Nenhum registro de performance detectado no sistema.
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
