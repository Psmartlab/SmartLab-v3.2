export const STATUS_COLUMNS = [
  {
    id: 'TODO',
    title: 'A Fazer',
    dotClass: 'bg-black',
    cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-black shadow-sm',
    panelClass: 'bg-slate-100/95 border-slate-300',
    headerClass: 'bg-slate-900 text-white border-slate-900',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Em Andamento',
    dotClass: 'bg-yellow-400',
    cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-yellow-400 shadow-sm z-10',
    panelClass: 'bg-amber-50/95 border-amber-300',
    headerClass: 'bg-amber-500 text-white border-amber-500',
  },
  {
    id: 'UNDER_REVIEW',
    title: 'Em Avaliacao',
    dotClass: 'bg-blue-500',
    cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-blue-500 shadow-sm',
    panelClass: 'bg-blue-50/95 border-blue-300',
    headerClass: 'bg-blue-600 text-white border-blue-600',
  },
  {
    id: 'DONE',
    title: 'Concluido',
    dotClass: 'bg-emerald-500',
    cardClass: 'bg-white border-2 border-slate-300 border-l-[6px] border-l-emerald-500 shadow-sm opacity-95 text-emerald-900 font-medium',
    panelClass: 'bg-emerald-50/95 border-emerald-300',
    headerClass: 'bg-emerald-600 text-white border-emerald-600',
  }
];

export const PRIORITIES = [
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Media', label: 'Media' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Critica', label: 'Critica' }
];

export const TASK_LEVELS = [
  { value: 1, label: 'Nivel 1 - Tarefa Principal' },
  { value: 2, label: 'Nivel 2 - Subtarefa' },
  { value: 3, label: 'Nivel 3 - Atividade' },
  { value: 4, label: 'Nivel 4 - Micro-atividade' },
];
