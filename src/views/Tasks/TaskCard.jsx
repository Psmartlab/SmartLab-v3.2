import { Trash2, Pencil, ArrowLeft, ArrowRight, User, BellRing, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
import { isAdmin, isProjectManager, isTeamLeader } from '../../utils/roles';

function TaskCard({ task, column, user, onDelete, onEdit, onUpdateStatus, onReview }) {
  const isOverdue = task.status !== 'DONE' && task.plannedEnd && new Date(task.plannedEnd).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
  
  const isManager = isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);

  const today = new Date(); today.setHours(0,0,0,0);
  const due = task.plannedEnd ? new Date(task.plannedEnd) : null;
  if (due) due.setHours(0,0,0,0);
  const daysLeft = due ? Math.round((due - today) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={cn(
      "group relative p-6 rounded-[24px] border-2 transition-all duration-300 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]",
      isOverdue 
        ? "bg-red-500/10 border-red-500/30 text-red-500" 
        : "bg-smartlab-surface border-smartlab-border hover:border-accent/40"
    )}>
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[24px] pointer-events-none" />

      {isOverdue && (
        <div className="absolute -top-3 left-6 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg animate-bounce">
          <BellRing size={12} fill="white" /> Atrasado {Math.abs(daysLeft)}d
        </div>
      )}

      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col gap-1 pr-14">
          <h4 className={cn(
            "m-0 font-headline font-black text-base tracking-tight leading-tight group-hover:text-smartlab-primary transition-colors",
            column.id === 'DONE' ? 'line-through opacity-40' : 'text-smartlab-on-surface'
          )}>
            {task.name}
          </h4>
          {task.description && (
            <p className="text-[11px] font-bold text-smartlab-on-surface-variant opacity-70 line-clamp-2 leading-relaxed mt-1">
              {task.description}
            </p>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest shadow-sm",
            task.priority === 'Alta' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
            task.priority === 'Media' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 
            'bg-smartlab-primary/10 border-smartlab-border text-smartlab-on-surface-variant'
          )}>
            {task.priority || 'Normal'}
          </span>
        </div>
      </div>


      {task.rejectionNote && task.status === 'IN_PROGRESS' && (
        <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
          Rejeitada: {task.rejectionNote}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-5 border-t-2 border-smartlab-border/30 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-smartlab-surface-low border border-smartlab-border flex items-center justify-center text-accent text-[10px] font-black shadow-inner shrink-0">
            {task.assignee ? task.assignee.charAt(0).toUpperCase() : <User size={12} className="text-amber-500" />}
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest italic truncate max-w-[100px]",
            !task.assignee 
              ? "bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-lg border border-amber-500/20 shadow-sm translate-y-[1px]"
              : "text-smartlab-on-surface-variant opacity-60"
          )}>
            {task.assignee ? task.assignee.split('@')[0] : 'SEM RESPONSÁVEL'}
          </span>
        </div>

        <div className="flex items-center gap-2">
           <button 
             className="p-2.5 bg-smartlab-surface-low text-smartlab-on-surface-variant/40 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-transparent hover:border-red-500/20" 
             onClick={(e) => { e.stopPropagation(); onDelete(task.id, task.name); }} 
             title="Excluir"
           >
             <Trash2 size={14} />
           </button>
           <button 
             className="p-2.5 bg-smartlab-surface-low text-smartlab-on-surface-variant/40 hover:text-accent hover:bg-accent/5 rounded-xl transition-all border border-transparent hover:border-accent/20" 
             onClick={(e) => { e.stopPropagation(); onEdit(task); }} 
             title="Editar"
           >
             <Pencil size={14} />
           </button>
           
           <div className="w-[1px] h-6 bg-smartlab-border/50 mx-1" />

           {task.status === 'UNDER_REVIEW' && isManager && (
             <div className="flex gap-1.5 animate-in zoom-in duration-300">
                <button className="px-3 py-2 bg-accent text-white rounded-xl hover:bg-accent/80 transition-all font-black text-[9px] uppercase tracking-widest shadow-md" onClick={(e) => { e.stopPropagation(); onReview(task, 'approve'); }}>Validar</button>
                <button className="p-2 bg-smartlab-surface-low text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm" onClick={(e) => { e.stopPropagation(); onReview(task, 'reject'); }}><ArrowLeft size={14} /></button>
             </div>
           )}

           {column.id !== 'TODO' && column.id !== 'DONE' && column.id !== 'UNDER_REVIEW' && (
             <button 
               className="p-2.5 bg-smartlab-surface-low text-smartlab-on-surface-variant/60 hover:text-accent border border-smartlab-border hover:border-accent/40 rounded-xl transition-all shadow-sm active:scale-90" 
               onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, column.id === 'IN_PROGRESS' ? 'TODO' : 'IN_PROGRESS', task.name); }}
             >
               <ArrowLeft size={16} />
             </button>
           )}
           {column.id !== 'DONE' && column.id !== 'UNDER_REVIEW' && (
             <button 
               className="p-2.5 bg-smartlab-primary text-white hover:bg-accent border border-accent/20 rounded-xl transition-all shadow-lg active:scale-90 group/btn" 
               onClick={(e) => { e.stopPropagation(); onUpdateStatus(task.id, column.id === 'TODO' ? 'IN_PROGRESS' : 'DONE', task.name); }}
             >
               <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
             </button>
           )}
        </div>
      </div>

      {/* Date floating badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[9px] font-black text-smartlab-on-surface-variant bg-smartlab-surface-low px-2 py-1 rounded-lg border border-smartlab-border opacity-40 group-hover:opacity-100 transition-opacity italic">
        <Calendar size={10} className="text-accent" />
        {task.plannedEnd ? new Date(task.plannedEnd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '∞'}
      </div>
    </div>
  );
}

export default TaskCard;
