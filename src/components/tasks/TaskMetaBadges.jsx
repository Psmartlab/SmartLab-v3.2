import React from 'react';
import { AlertCircle, User, Flag, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * TaskMetaBadges
 * Componente reutilizável para exibir metadados de tarefas de forma consistente.
 */
const TaskMetaBadges = ({ item, className }) => {
  if (!item) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDone = item.status === 'DONE';
  const hasPlannedEnd = !!item.plannedEnd;
  const plannedEnd = hasPlannedEnd ? new Date(item.plannedEnd + 'T23:59:59') : null;
  const isOverdue = !isDone && plannedEnd && plannedEnd < new Date();

  const isUnassigned = !item.assignee;

  // Mapeamento de Prioridade
  const priorityCfg = {
    'Alta': { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500', label: 'Alta' },
    'Media': { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500', label: 'Média' },
    'Baixa': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500', label: 'Baixa' },
  }[item.priority] || { bg: 'bg-smartlab-primary/10', border: 'border-smartlab-border', text: 'text-smartlab-on-surface-variant', label: item.priority || 'Normal' };

  // Mapeamento de Status
  const statusLabels = {
    'TODO': 'Pendente',
    'IN_PROGRESS': 'Em Curso',
    'UNDER_REVIEW': 'Revisão',
    'DONE': 'Concluído'
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Badge de Atraso */}
      {isOverdue && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-600 border border-red-500/30 rounded-md text-[8px] font-black uppercase tracking-widest animate-pulse">
          <AlertCircle size={10} /> Atrasado
        </span>
      )}

      {/* Badge Sem Responsável */}
      {isUnassigned && !isDone && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md text-[8px] font-black uppercase tracking-widest">
          <User size={10} /> Sem Responsável
        </span>
      )}

      {/* Badge de Prioridade */}
      <span className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 border rounded-md text-[8px] font-black uppercase tracking-widest",
        priorityCfg.bg, priorityCfg.border, priorityCfg.text
      )}>
        <Flag size={10} /> {priorityCfg.label}
      </span>

      {/* Badge de Status */}
      <span className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 bg-smartlab-surface-low border border-smartlab-border rounded-md text-[8px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-70",
        isDone && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 opacity-100"
      )}>
        {isDone ? <CheckCircle2 size={10} /> : <Clock size={10} />}
        {statusLabels[item.status] || item.status}
      </span>
    </div>
  );
};

export default TaskMetaBadges;
