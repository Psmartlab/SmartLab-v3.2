import React, { useState } from 'react';
import { Trash2, Pencil, ArrowLeft, ArrowRight, User, Calendar, FolderOpen, X } from 'lucide-react';
import TaskMetaBadges from '../../components/tasks/TaskMetaBadges';
import { cn } from '../../utils/cn';
import { isAdmin, isProjectManager, isTeamLeader } from '../../utils/roles';

function TaskCard({ task, column, user, onDelete, onEdit, onUpdateStatus, onReview, projectById, teamById }) {
  const [delConfirm, setDelConfirm] = useState(false);
  const projectName = projectById?.[task.projectId] || 'Sem Projeto';
  const teamName = teamById?.[task.teamId] || 'Sem Equipe';
  const isManager = isAdmin(user?.role) || isProjectManager(user?.role) || isTeamLeader(user?.role);
  const isOverdue =
    task.status !== 'DONE' &&
    task.plannedEnd &&
    new Date(task.plannedEnd).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  const dueLabel = task.plannedEnd
    ? new Date(`${task.plannedEnd}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : 'Sem prazo';

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        isOverdue
          ? 'border-red-200 bg-red-50/90'
          : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span
          className="max-w-full truncate rounded-md border border-smartlab-primary/20 bg-smartlab-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-smartlab-primary"
          title={`Projeto: ${projectName}`}
        >
          Projeto: {projectName}
        </span>
        <span
          className="max-w-full truncate rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500"
          title={teamName}
        >
          {teamName}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <h4
          className={cn(
            'break-words text-sm font-black leading-tight tracking-tight text-smartlab-on-surface',
            column.id === 'DONE' && 'opacity-50 line-through'
          )}
        >
          {task.name}
        </h4>
        {task.description && (
          <p className="mt-2 break-words text-[11px] font-bold leading-relaxed text-smartlab-on-surface-variant opacity-80 line-clamp-3">
            {task.description}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TaskMetaBadges item={task} className="max-w-full" />
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-smartlab-border bg-smartlab-surface-low px-2 py-1 text-[9px] font-black italic text-smartlab-on-surface-variant">
          <Calendar size={10} className="shrink-0 text-accent" />
          <span className="whitespace-nowrap">{dueLabel}</span>
        </div>
      </div>

      {task.uploadFolderUrl && (
        <a
          href={task.uploadFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-500/20"
          onClick={(e) => e.stopPropagation()}
          title="Abrir pasta"
        >
          <FolderOpen size={10} className="shrink-0" />
          <span className="truncate">Abrir Pasta</span>
        </a>
      )}

      {task.rejectionNote && task.status === 'IN_PROGRESS' && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600">
          {task.rejectionNote}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-2 text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60">
          <span>Progresso</span>
          <span>{task.progress || 0}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full border border-smartlab-border/30 bg-smartlab-surface-low">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-out"
            style={{ width: `${task.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-smartlab-border/40 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-smartlab-border bg-smartlab-surface-low text-[10px] font-black text-accent">
            {task.assignee ? task.assignee.charAt(0).toUpperCase() : <User size={12} className="text-amber-500" />}
          </div>
          <span
            className={cn(
              'min-w-0 truncate text-[10px] font-black uppercase tracking-widest italic',
              task.assignee
                ? 'text-smartlab-on-surface-variant opacity-70'
                : 'rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-600'
            )}
            title={task.assignee || 'Sem responsavel'}
          >
            {task.assignee ? task.assignee.split('@')[0] : 'Sem Responsavel'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {delConfirm ? (
            <>
              <button
                className="rounded-xl bg-red-600 p-2.5 text-white transition-all hover:brightness-110"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id, task.name);
                }}
                title="Confirmar exclusao"
              >
                <Trash2 size={14} />
              </button>
              <button
                className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-500 transition-all hover:bg-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setDelConfirm(false);
                }}
                title="Cancelar exclusao"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              className="rounded-xl border border-transparent bg-smartlab-surface-low p-2.5 text-smartlab-on-surface-variant/50 transition-all hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                setDelConfirm(true);
              }}
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            className="rounded-xl border border-transparent bg-smartlab-surface-low p-2.5 text-smartlab-on-surface-variant/50 transition-all hover:border-accent/20 hover:bg-accent/5 hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          {task.status === 'UNDER_REVIEW' && isManager && (
            <>
              <button
                className="rounded-xl bg-accent px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition-all hover:bg-accent/85"
                onClick={(e) => {
                  e.stopPropagation();
                  onReview(task, 'approve');
                }}
              >
                Validar
              </button>
              <button
                className="rounded-xl border border-red-500/20 bg-smartlab-surface-low p-2 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onReview(task, 'reject');
                }}
                title="Rejeitar"
              >
                <ArrowLeft size={14} />
              </button>
            </>
          )}

          {column.id !== 'TODO' && column.id !== 'DONE' && column.id !== 'UNDER_REVIEW' && (
            <button
              className="rounded-xl border border-smartlab-border bg-smartlab-surface-low p-2.5 text-smartlab-on-surface-variant/70 transition-all hover:border-accent/40 hover:text-accent"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(task.id, column.id === 'IN_PROGRESS' ? 'TODO' : 'IN_PROGRESS', task.name);
              }}
              title="Mover para tras"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {column.id !== 'DONE' && column.id !== 'UNDER_REVIEW' && (
            <button
              className="rounded-xl border border-accent/20 bg-smartlab-primary p-2.5 text-white transition-all hover:bg-accent"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(task.id, column.id === 'TODO' ? 'IN_PROGRESS' : 'DONE', task.name);
              }}
              title="Mover para frente"
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
