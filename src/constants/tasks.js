export const STATUS_COLUMNS = [
  { id: 'TODO', title: 'A Fazer', dotClass: 'bg-black', cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-black shadow-sm' },
  { id: 'IN_PROGRESS', title: 'Em Andamento', dotClass: 'bg-yellow-400', cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-yellow-400 shadow-sm z-10' },
  { id: 'UNDER_REVIEW', title: 'Em Avaliação', dotClass: 'bg-blue-500', cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-blue-500 shadow-sm' },
  { id: 'DONE', title: 'Concluído', dotClass: 'bg-emerald-500', cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-emerald-500 shadow-sm opacity-95 text-emerald-900 font-medium' }
];

export const PRIORITIES = [
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Media', label: 'Média' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Critica', label: 'Crítica' }
];

export const TASK_LEVELS = [
  { value: 1, label: 'Nível 1 — Tarefa Principal' },
  { value: 2, label: 'Nível 2 — Subtarefa' },
  { value: 3, label: 'Nível 3 — Atividade' },
  { value: 4, label: 'Nível 4 — Micro-atividade' },
];
