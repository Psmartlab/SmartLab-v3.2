import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, AlertTriangle, TrendingUp, Mail, Calendar, CheckCircle, Search, Filter, FileText, Send } from 'lucide-react';
import { isAdmin as _isAdmin } from '../utils/roles';

export default function Notifications({ user }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    overdueCount: 0,
    performanceReport: [],
  });

  useEffect(() => {
    // Basic data fetching for report generation
    const unsubTasks = onSnapshot(collection(db, 'gantt_items'), (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(taskList);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0,0,0,0);
      const overdue = taskList.filter(t => t.status !== 'DONE' && t.plannedEnd && new Date(t.plannedEnd) < today);
      
      setStats(prev => ({ ...prev, overdueCount: overdue.length }));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubTasks(); unsubUsers(); };
  }, []);

  const generateReport = () => {
    // Simple report logic: users with most tasks and status
    const report = users.map(u => {
      const userTasks = tasks.filter(t => t.assignee === u.email);
      const done = userTasks.filter(t => t.status === 'DONE').length;
      const total = userTasks.length;
      const perf = total > 0 ? Math.round((done / total) * 100) : 0;
      return { name: u.name, done, total, perf };
    }).sort((a, b) => b.perf - a.perf);

    setStats(prev => ({ ...prev, performanceReport: report }));
    alert("Relatórios de desempenho gerados com sucesso!");
  };

  const sendAlerts = () => {
    alert("Mensagens de alerta enviadas para responsáveis por tarefas atrasadas.");
  };

  if (!_isAdmin(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 text-center gap-6">
        <div className="p-6 bg-red-50 text-red-500 rounded-[32px] border-2 border-red-100 shadow-lg">
          <AlertTriangle size={64} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-950 font-headline tracking-tighter uppercase italic">Acesso Negado</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Apenas administradores podem acessar esta central.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Central do Admin</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">Gestão de alertas, métricas e campanhas</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-smartlab-surface-low text-smartlab-on-surface rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-smartlab-border shadow-sm border-2 border-smartlab-border group" onClick={() => alert("Configuração atualizada.")}>
            <Filter size={18} className="text-accent group-hover:scale-110 transition-transform" /> Configurar
          </button>
          <button className="flex items-center justify-center gap-3 px-8 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95 group" onClick={generateReport}>
            <FileText size={18} className="text-accent group-hover:rotate-12 transition-transform" /> Gerar Relatórios
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Alertas Ativos */}
        <div className="bg-white rounded-[32px] p-8 border-2 border-slate-300 shadow-sm flex flex-col gap-6 group hover:border-slate-950 transition-all">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-950 font-headline tracking-tighter uppercase italic flex items-center gap-2">
              <AlertTriangle size={24} className="text-red-500" /> Alertas Críticos
            </h3>
            <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 italic">Alta Prioridade</span>
          </div>
          <div className="flex items-end justify-between p-6 bg-slate-50 rounded-[24px] border-2 border-slate-100 border-dashed group-hover:bg-red-50/20 group-hover:border-red-100 transition-all">
            <div>
              <div className="text-7xl font-black text-slate-950 tracking-tighter italic m-0 flex items-baseline gap-1">
                {stats.overdueCount}
                <span className="text-xs text-slate-300 not-italic uppercase tracking-widest pl-2">Pendências</span>
              </div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">Tarefas fora do prazo detectadas</p>
            </div>
            <button className="p-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2" onClick={sendAlerts}>
              <Send size={16} /> Notificar
            </button>
          </div>
        </div>

        {/* Compromissos */}
        <div className="bg-white rounded-[32px] p-8 border-2 border-slate-300 shadow-sm flex flex-col gap-6 group hover:border-slate-950 transition-all">
          <h3 className="text-lg font-black text-slate-950 font-headline tracking-tighter uppercase italic flex items-center gap-2">
            <Calendar size={24} className="text-blue-500" /> Próximos Eventos
          </h3>
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-between group-hover:bg-blue-50/20 group-hover:border-blue-100 transition-all">
               <div className="flex flex-col gap-1">
                 <span className="font-black text-slate-950 text-sm tracking-tight uppercase">Reunião de Alinhamento</span>
                 <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Amanhã • 10:00</span>
               </div>
               <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-between group-hover:bg-blue-50/20 group-hover:border-blue-100 transition-all">
               <div className="flex flex-col gap-1">
                 <span className="font-black text-slate-950 text-sm tracking-tight uppercase">Review de Sprints</span>
                 <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-widest">Sexta • 14:00</span>
               </div>
               <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
          </div>
          <button className="w-full py-3 bg-slate-50 text-slate-400 border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-slate-300 hover:text-slate-900 transition-all" onClick={() => alert("Lembretes enviados.")}>
             Disparar Lembretes em Massa
          </button>
        </div>
      </div>

      {stats.performanceReport.length > 0 && (
        <div className="bg-white rounded-[32px] border-2 border-slate-300 shadow-sm overflow-hidden mb-8">
           <div className="bg-slate-50 p-6 border-b-2 border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-950 font-headline tracking-tighter uppercase italic flex items-center gap-2">
                <TrendingUp size={24} className="text-emerald-500" /> Ranking de Desempenho
              </h3>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Baseado em tarefas concluídas</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-slate-100 italic uppercase tracking-[0.2em] text-[9px] font-black text-slate-400">
                   <th className="px-8 py-4">Membro da Equipe</th>
                   <th className="px-8 py-4">Concluídas</th>
                   <th className="px-8 py-4">Total</th>
                   <th className="px-8 py-4 text-right">Eficiência</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {stats.performanceReport.map((r, i) => (
                   <tr key={i} className="hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-5 font-black text-slate-950 tracking-tight text-sm uppercase">{r.name}</td>
                     <td className="px-8 py-5 font-bold text-slate-500 text-sm">{r.done}</td>
                     <td className="px-8 py-5 font-bold text-slate-500 text-sm">{r.total}</td>
                     <td className="px-8 py-5 text-right">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${r.perf > 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                         {r.perf}%
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}
      
      {/* Mensagens Padrão */}
      <div className="bg-white rounded-[32px] p-8 border-2 border-slate-300 shadow-sm flex flex-col gap-6 group hover:border-slate-950 transition-all">
        <h3 className="text-lg font-black text-slate-950 font-headline tracking-tighter uppercase italic flex items-center gap-2">
          <Mail size={24} className="text-indigo-500" /> Comunicação Automatizada
        </h3>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Campanhas de engajamento e feedback quinzenal.</p>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <select className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-black uppercase tracking-widest text-xs text-slate-800 focus:border-slate-800 outline-none transition-all flex-1 appearance-none cursor-pointer">
            <option>Relatório Quinzenal de Metas</option>
            <option>Feedback Mensal 360º</option>
            <option>Lembrete de OKRs e Performance</option>
          </select>
          <button className="w-full md:w-auto px-10 py-4 bg-slate-950 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-lg active:scale-95" onClick={() => alert("Campanha disparada.")}>
             Disparar Campanha
          </button>
        </div>
      </div>
    </div>
  );
}
