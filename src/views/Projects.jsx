import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Plus, ChevronRight, ChevronDown, Edit2, Trash2, X, Check,
  Calendar, Briefcase, Layers, Target, Activity, CheckSquare,
  AlignLeft, Loader2, FolderOpen, AlertCircle, Flag, BarChart2
} from 'lucide-react';
import { cn } from '../utils/cn';
import TaskMetaBadges from '../components/tasks/TaskMetaBadges';
import { isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../utils/roles';

// --- constants -------------------------------------------------------------

const LEVEL_CONFIG = [
  { label: 'Projeto',    icon: Briefcase,   color: 'text-violet-500',  bar: '#7c3aed', dot: 'bg-violet-500',  indent: 0  },
  { label: 'Tarefa N1', icon: Layers,       color: 'text-orange-500',  bar: '#ea580c', dot: 'bg-orange-500',  indent: 16 },
  { label: 'Tarefa N2', icon: Target,       color: 'text-cyan-400',    bar: '#06b6d4', dot: 'bg-cyan-400',    indent: 32 },
  { label: 'Tarefa N3', icon: Activity,     color: 'text-lime-500',    bar: '#65a30d', dot: 'bg-lime-500',    indent: 48 },
  { label: 'Tarefa N4', icon: CheckSquare,  color: 'text-pink-500',    bar: '#db2777', dot: 'bg-pink-500',    indent: 64 },
];

const STATUS_OPTIONS = [
  { value: 'TODO',         label: '⚪ A Fazer' },
  { value: 'IN_PROGRESS',  label: '🔵 Em Andamento' },
  { value: 'UNDER_REVIEW', label: '🟡 Em Revisão' },
  { value: 'DONE',         label: '🟢 Concluído' }
];

const PRIORITY_OPTIONS = [
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Media', label: 'Média' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Critica', label: 'Crítica' }
];

const ROW_H = 50;
const LEFT_W = 340;

const todayStr = () => new Date().toISOString().slice(0, 10);
const parseDate = (s) => s ? new Date(s + 'T00:00:00') : null;
const diffDays = (a, b) => Math.round((b - a) / 86400000);
const fmtDate = (s) => {
  if (!s) return '—';
  const d = parseDate(s);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const ZOOM_MODES = [
  { key: 'day',   label: 'Dia',   dayWidth: 40 },
  { key: 'week',  label: 'Semana', dayWidth: 14 },
  { key: 'month', label: 'Mês',   dayWidth: 5  },
];

// --- helpers ---------------------------------------------------------------

function buildTree(items) {
  const byId = {};
  items.forEach(i => { byId[i.id] = { ...i, children: [] }; });
  const roots = [];
  items.forEach(i => {
    if (i.parentId && byId[i.parentId]) {
      byId[i.parentId].children.push(byId[i.id]);
    } else {
      roots.push(byId[i.id]);
    }
  });
  const sort = arr => arr.sort((a, b) => (a.plannedStart || '').localeCompare(b.plannedStart || '') || (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  
  const walk = (arr, parentWbs, parentLevel) => {
    sort(arr).forEach((node, idx) => {
      node.wbs = parentLevel === -1 ? `${idx + 1}` : `${parentWbs}.${idx + 1}`;
      walk(node.children, node.wbs, node.level);
    });
  };
  walk(roots, '', -1);
  const flat = [];
  const flatten = arr => arr.forEach(n => { flat.push(n); flatten(n.children); });
  flatten(roots);
  return flat;
}

function getTimelineRange(items) {
  const dates = items.flatMap(i => [i.plannedStart, i.plannedEnd, i.actualStart, i.actualEnd].filter(Boolean));
  if (!dates.length) {
    const t = todayStr();
    return { start: parseDate(t), end: parseDate(t) };
  }
  const sorted = dates.slice().sort();
  const start = parseDate(sorted[0]);
  const end   = parseDate(sorted[sorted.length - 1]);
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 30);
  return { start, end };
}

function buildColumns(start, end, zoom) {
  const cols = [];
  const cur = new Date(start);
  const total = diffDays(start, end) + 1;

  if (zoom === 'day') {
    for (let d = 0; d < total; d++) {
      cols.push({ date: new Date(cur), span: 1 });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (zoom === 'week') {
    let group = null;
    for (let d = 0; d < total; d++) {
      const dow = cur.getDay();
      if (!group || dow === 1) {
        if (group) cols.push(group);
        group = { date: new Date(cur), span: 0 };
      }
      group.span++;
      cur.setDate(cur.getDate() + 1);
    }
    if (group) cols.push(group);
  } else {
    let group = null;
    for (let d = 0; d < total; d++) {
      const m = cur.getMonth(), y = cur.getFullYear();
      if (!group || group.month !== m || group.year !== y) {
        if (group) cols.push(group);
        group = { date: new Date(cur), span: 0, month: m, year: y };
      }
      group.span++;
      cur.setDate(cur.getDate() + 1);
    }
    if (group) cols.push(group);
  }
  return cols;
}

// --- Internal Component: ProjectBlock --------------------------------------

function ProjectBlock({
  projectItems, root, user, allUsers, zoomIdx,
  collapsed, toggleCollapse, openCreate, openEdit, handleDelete,
  canWrite, deleting, tooltip, setTooltip
}) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncing = useRef(false);

  const zoom = ZOOM_MODES[zoomIdx];
  const tree = useMemo(() => buildTree(projectItems), [projectItems]);
  const { start: rangeStart, end: rangeEnd } = useMemo(() => getTimelineRange(projectItems), [projectItems]);
  const columns = useMemo(() => buildColumns(rangeStart, rangeEnd, zoom.key), [rangeStart, rangeEnd, zoom.key]);
  const totalDays = diffDays(rangeStart, rangeEnd) + 1;
  const ganttWidth = totalDays * zoom.dayWidth;

  const visibleRows = useMemo(() => {
    const visible = [];
    const shouldHide = (node) => {
      let cur = node;
      while (cur.parentId) {
        if (collapsed.has(cur.parentId)) return true;
        cur = tree.find(n => n.id === cur.parentId) || {};
      }
      return false;
    };
    tree.forEach(n => { if (!shouldHide(n)) visible.push(n); });
    return visible;
  }, [tree, collapsed]);

  const syncScroll = useCallback((src) => {
    if (syncing.current) return;
    syncing.current = true;
    const other = src === leftRef.current ? rightRef.current : leftRef.current;
    if (other) other.scrollTop = src.scrollTop;
    setTimeout(() => { syncing.current = false; }, 16);
  }, []);

  const hasChildren = (id) => tree.some(n => n.parentId === id);

  const barX = (dateStr) => {
    if (!dateStr) return 0;
    const d = parseDate(dateStr);
    return Math.max(0, diffDays(rangeStart, d)) * zoom.dayWidth;
  };
  const barW = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const s = parseDate(startStr), e = parseDate(endStr);
    return Math.max(zoom.dayWidth, (diffDays(s, e) + 1) * zoom.dayWidth);
  };

  const isLate = (item) => item.status !== 'DONE' && item.plannedEnd && parseDate(item.plannedEnd) < parseDate(todayStr());
  const barColor = (item) => isLate(item) ? '#ef4444' : (LEVEL_CONFIG[item.level]?.bar || '#8b5cf6');

  const canEdit = (item) => {
    if (_isAdmin(user?.role) || isProjectManager(user?.role)) return true;
    if (isTeamLeader(user?.role) && (!item.assignee || item.assignee === (user?.email || ''))) return true;
    return false;
  };

  const todayOffset = diffDays(rangeStart, new Date()) * zoom.dayWidth;

  // Stats calculation
  const total = projectItems.length;
  const unassignedCount = projectItems.filter(i => !i.assignee).length;
  const unassignedPercent = total === 0 ? 0 : Math.round((unassignedCount / total) * 100);

  return (
    <div className="bg-smartlab-surface border-2 border-smartlab-border rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col">
      {/* Block Header */}
      <div className="px-8 py-6 border-b-2 border-smartlab-border bg-smartlab-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-none flex items-center gap-3">
            <span className={cn("p-2 rounded-xl bg-smartlab-surface-low border-2 border-smartlab-border", root ? "text-violet-500" : "text-amber-500")}>
              {root ? <Briefcase size={20} /> : <AlertCircle size={20} />}
            </span>
            {root ? root.name : "Fila de Atendimento (Sem Projeto)"}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <span className="px-2 py-0.5 bg-smartlab-surface-low rounded-lg border border-smartlab-border text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
              {total} ITENS
            </span>
            <span className={cn("px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-widest",
              unassignedPercent > 0 ? "bg-red-500/5 border-red-500/10 text-red-500" : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500"
            )}>
              {unassignedPercent}% NÃO ATRIBUÍDAS
            </span>
          </div>
        </div>
        {canWrite && root && (
           <button onClick={() => openCreate(root)}
           className="flex items-center gap-2 px-4 py-2 bg-smartlab-primary/10 text-smartlab-primary rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-smartlab-primary hover:text-white transition-all self-start md:self-center">
           <Plus size={14} /> Adicionar Item
         </button>
        )}
      </div>

      {/* Block Content */}
      <div className="flex h-[450px] overflow-hidden">
        {/* LEFT PANEL */}
        <div
          ref={leftRef}
          onScroll={e => syncScroll(e.currentTarget)}
          className="shrink-0 overflow-y-auto overflow-x-hidden border-r-2 border-smartlab-border bg-smartlab-surface scrollbar-hide"
          style={{ width: LEFT_W }}>
          
          <div className="sticky top-0 z-10 h-[50px] flex items-end px-4 pb-2 bg-smartlab-surface border-b border-smartlab-border shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-40">Estrutura WBS / Tarefas</span>
          </div>

          {visibleRows.map((item) => {
            const cfg = LEVEL_CONFIG[item.level] || LEVEL_CONFIG[0];
            const Icon = cfg.icon;
            const hasKids = hasChildren(item.id);
            const isCollapsed = collapsed.has(item.id);

            return (
              <div key={item.id}
                className="group flex items-center gap-1.5 border-b border-smartlab-border/50 hover:bg-smartlab-surface-low transition-colors shrink-0"
                style={{ height: ROW_H, paddingLeft: cfg.indent + 8, paddingRight: 8 }}>

                <button
                  onClick={() => hasKids && toggleCollapse(item.id)}
                  className={cn('w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0',
                    hasKids ? 'hover:bg-smartlab-border cursor-pointer' : 'opacity-0 pointer-events-none'
                  )}>
                  {hasKids
                    ? (isCollapsed ? <ChevronRight size={13} className={cfg.color} /> : <ChevronDown size={13} className={cfg.color} />)
                    : null}
                </button>

                <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
                <Icon size={12} className={cn(cfg.color, 'shrink-0')} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[8px] font-black text-smartlab-on-surface-variant opacity-40 shrink-0">{item.wbs}</span>
                    <span className="text-[11px] font-bold text-smartlab-on-surface truncate leading-none">{item.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 opacity-40 text-[8px] font-black uppercase tracking-widest mt-0.5 ml-[19px]">
                    PROJETO: {root ? root.name : 'SEM PROJETO'}
                  </div>
                  <TaskMetaBadges item={item} className="mt-1 opacity-80" />
                </div>

                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                   {canWrite && item.level < 4 && (
                    <button onClick={() => openCreate(item)} title="Novo" className="p-1 rounded hover:bg-smartlab-primary/20 text-smartlab-primary transition-all">
                      <Plus size={12} />
                    </button>
                  )}
                  {canEdit(item) && (
                    <button onClick={() => openEdit(item)} title="Editar" className="p-1 rounded hover:bg-blue-100/50 text-blue-500 transition-all">
                      <Edit2 size={12} />
                    </button>
                  )}
                  {canWrite && (
                    <button onClick={() => handleDelete(item)} title="Excluir" disabled={deleting === item.id} className="p-1 rounded hover:bg-red-100/50 text-red-500 transition-all">
                      {deleting === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT PANEL (GANTT) */}
        <div
          ref={rightRef}
          onScroll={e => syncScroll(e.currentTarget)}
          className="flex-1 overflow-auto bg-smartlab-surface-low/30"
          style={{ position: 'relative' }}>
          <div style={{ width: ganttWidth, minWidth: '100%', position: 'relative' }}>
            
            {/* Timeline header */}
            <div className="sticky top-0 z-10 bg-smartlab-surface border-b border-smartlab-border shrink-0" style={{ height: 50 }}>
              <div className="flex h-full">
                {columns.map((col, ci) => {
                  const w = col.span * zoom.dayWidth;
                  let label1 = '', label2 = '';
                  const isWeekend = col.date.getDay() === 0 || col.date.getDay() === 6;

                  if (zoom.key === 'day') {
                    label1 = `${col.date.getDate()}/${col.date.getMonth() + 1}`;
                    label2 = WEEKDAYS_PT[col.date.getDay()];
                  } else if (zoom.key === 'week') {
                    const wn = Math.ceil(((col.date - new Date(col.date.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
                    label1 = `S${wn}`;
                    label2 = `${col.date.getDate()}/${col.date.getMonth() + 1}`;
                  } else {
                    label1 = MONTHS_PT[col.date.getMonth()];
                    label2 = col.date.getFullYear();
                  }

                  return (
                    <div key={ci}
                      className={cn('flex flex-col items-center justify-center border-r border-smartlab-border/20 shrink-0 text-center',
                        isWeekend && zoom.key === 'day' ? 'bg-amber-50/20' : ''
                      )}
                      style={{ width: w, minWidth: w }}>
                      <span className="text-[9px] font-black text-smartlab-on-surface-variant opacity-60 leading-none">{label1}</span>
                      {w > 25 && <span className="text-[7px] text-smartlab-on-surface-variant opacity-30 mt-0.5 uppercase font-bold">{label2}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows area */}
            <div style={{ position: 'relative' }}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= ganttWidth && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: todayOffset + zoom.dayWidth / 2,
                  width: 1.5, background: '#ef4444', zIndex: 5, pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    background: '#ef4444', color: 'white', fontSize: 7, fontWeight: 900, padding: '1px 3px',
                    borderRadius: '0 0 4px 4px', letterSpacing: 0.5, whiteSpace: 'nowrap'
                  }}>HOJE</div>
                </div>
              )}

              {visibleRows.map((item) => {
                const pX = barX(item.plannedStart);
                const pW = barW(item.plannedStart, item.plannedEnd);
                const aX = barX(item.actualStart || item.plannedStart);
                const fullW = barW(item.actualStart || item.plannedStart, item.actualEnd || item.plannedEnd);
                const aW = fullW * ((item.progress ?? 0) / 100);
                const bColor = barColor(item);

                return (
                  <div key={item.id}
                    className="border-b border-smartlab-border/20 hover:bg-smartlab-surface-low/20 transition-colors"
                    style={{ height: ROW_H, position: 'relative' }}>

                    {/* Planned Track */}
                    {pW > 0 && (
                      <div style={{
                        position: 'absolute', left: pX, top: ROW_H * 0.28,
                        width: pW, height: 7, background: 'rgba(156,163,175,0.20)',
                        borderRadius: 99, zIndex: 1,
                      }} />
                    )}

                    {/* Execution Track */}
                    {fullW > 0 && (
                      <>
                        <div style={{
                          position: 'absolute', left: aX, top: ROW_H * 0.56,
                          width: fullW, height: 8, background: 'rgba(156,163,175,0.12)',
                          borderRadius: 99, zIndex: 1,
                        }} />
                        {aW > 0 && (
                          <div
                            onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, item })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{
                              position: 'absolute', left: aX, top: ROW_H * 0.56,
                              width: Math.max(2, aW), height: 8,
                              background: !item.assignee ? 'transparent' : bColor,
                              border: !item.assignee ? `1.5px dashed ${bColor === '#ef4444' ? '#ef4444' : '#f59e0b'}` : 'none',
                              borderRadius: 99, zIndex: 2, cursor: 'default',
                              boxShadow: !item.assignee ? 'none' : `0 1px 4px ${bColor}44`,
                            }} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main component ----------------------------------------------------------

export default function Projects({ user }) {
  const canWrite = isProjectManager(user?.role) || _isAdmin(user?.role);
  const [items, setItems] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(new Set());
  const [zoomIdx, setZoomIdx] = useState(1);
  const [modal, setModal] = useState(null); 
  const [tooltip, setTooltip] = useState(null); 
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gantt_items'), s => {
      setItems(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubU = onSnapshot(collection(db, 'users'), s => {
      setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubT = onSnapshot(collection(db, 'teams'), s => {
      setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub(); unsubU(); unsubT(); };
  }, []);

  const projectById = useMemo(() => 
    items.filter(i => i.level === 0).reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {}), 
  [items]);

  const teamById = useMemo(() => 
    teams.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}), 
  [teams]);

  const toggleCollapse = useCallback((id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const openCreate = (parentItem = null) => {
    const level = parentItem ? Math.min(parentItem.level + 1, 4) : 0;
    setForm({
      name: '', description: '', level, uploadFolderUrl: '',
      parentId: parentItem?.id || null,
      projectId: parentItem?.projectId || parentItem?.id || '',
      teamId: parentItem?.teamId || '',
      plannedStart: todayStr(), plannedEnd: todayStr(),
      actualStart: '', actualEnd: '',
      progress: 0, status: 'TODO',
      assignee: null, priority: 'Media',
    });
    setModal({ mode: 'create', parentItem });
  };

  const openEdit = (item) => {
    setForm({ ...item });
    setModal({ mode: 'edit', item });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    
    // Validation for Tasks
    if (form.level > 0) {
      if (!form.teamId || !form.plannedStart || !form.plannedEnd) {
        alert("Equipe e Prazos são obrigatórios para tarefas.");
        return;
      }
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description || '',
        uploadFolderUrl: form.uploadFolderUrl?.trim() || null,
        level: form.level ?? 0,
        parentId: form.parentId || null,
        projectId: form.projectId || '',
        teamId: form.teamId || '',
        plannedStart: form.plannedStart || '',
        plannedEnd: form.plannedEnd || '',
        actualStart: form.actualStart || '',
        actualEnd: form.actualEnd || '',
        progress: Number(form.progress) || 0,
        status: form.status || 'TODO',
        assignee: (form.assignee && form.assignee.trim() !== '') ? form.assignee : null,
        priority: form.priority?.replace('Média', 'Media').replace('Crítica', 'Critica') || 'Media',
        updatedAt: serverTimestamp(),
      };

      if (modal.mode === 'create') {
        const ref = await addDoc(collection(db, 'gantt_items'), { ...data, createdAt: serverTimestamp() });
        if (data.level === 0) await updateDoc(ref, { projectId: ref.id });
      } else {
        await updateDoc(doc(db, 'gantt_items', modal.item.id), data);
      }
      setModal(null);
    } catch (_Err) { alert('Erro: ' + _Err.message); }
    setSaving(false);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    setDeleting(item.id);
    try { await deleteDoc(doc(db, 'gantt_items', item.id)); }
    catch (_Err) { alert('Erro: ' + _Err.message); }
    setDeleting(null);
  };

  const roots = useMemo(() => items.filter(i => i.level === 0).sort((a,b) => a.name.localeCompare(b.name)), [items]);
  const orphans = useMemo(() => items.filter(i => i.level !== 0 && !i.projectId), [items]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-smartlab-on-surface-variant gap-4">
      <Loader2 size={32} className="animate-spin text-smartlab-primary" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Sincronizando Cronogramas...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-smartlab-surface-low/10" style={{ minHeight: 0 }}>
      {/* Header Centralizado */}
      <header className="px-10 py-8 flex flex-col md:flex-row justify-between md:items-end gap-6 border-b-2 border-smartlab-border bg-smartlab-surface shadow-sm shrink-0">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tighter text-smartlab-on-surface font-headline m-0 leading-none">Visão Geral</h1>
          <p className="text-smartlab-primary font-bold text-[11px] uppercase tracking-[0.25em] flex items-center gap-2">
            <span className="w-8 h-1 bg-smartlab-primary rounded-full" />
            Portfólio de Projetos & Atividades ({items.length} itens)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl overflow-hidden">
            {ZOOM_MODES.map((z, i) => (
              <button key={z.key} onClick={() => setZoomIdx(i)}
                className={cn('px-4 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all',
                  i === zoomIdx ? 'bg-smartlab-primary text-white shadow-inner' : 'text-smartlab-on-surface-variant hover:bg-smartlab-border'
                )}>{z.label}</button>
            ))}
          </div>

          {canWrite && (
            <button onClick={() => openCreate(null)}
              className="flex items-center gap-2 px-6 py-3 bg-smartlab-primary text-white rounded-[18px] font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_10px_20px_rgba(124,58,237,0.3)] active:scale-95 group">
              <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Novo Projeto
            </button>
          )}
        </div>
      </header>

      {/* Main Body (Scroll de Blocos) */}
      <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
        {roots.length === 0 && orphans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 opacity-30">
            <FolderOpen size={64} />
            <p className="font-black text-xs uppercase tracking-widest">Nenhuma atividade registrada.</p>
          </div>
        ) : (
          <>
            {roots.map(root => (
              <ProjectBlock
                key={root.id}
                root={root}
                projectItems={items.filter(i => i.projectId === root.id || i.id === root.id)}
                allUsers={allUsers}
                user={user}
                zoomIdx={zoomIdx}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                openCreate={openCreate}
                openEdit={openEdit}
                handleDelete={handleDelete}
                canWrite={canWrite}
                deleting={deleting}
                tooltip={tooltip}
                setTooltip={setTooltip}
              />
            ))}

            {orphans.length > 0 && (
              <ProjectBlock
                root={null}
                projectItems={orphans}
                allUsers={allUsers}
                user={user}
                zoomIdx={zoomIdx}
                collapsed={collapsed}
                toggleCollapse={toggleCollapse}
                openCreate={openCreate}
                openEdit={openEdit}
                handleDelete={handleDelete}
                canWrite={canWrite}
                deleting={deleting}
                tooltip={tooltip}
                setTooltip={setTooltip}
              />
            )}
          </>
        )}
      </div>

      {/* Tooltip & Modals (Global) */}
      {tooltip && (
        <div className="fixed z-[9999] pointer-events-none bg-smartlab-on-surface text-white rounded-2xl p-4 text-[10px] font-bold shadow-2xl animate-in fade-in duration-200"
          style={{ left: tooltip.x + 20, top: tooltip.y - 20, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-sm font-black mb-2 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-smartlab-primary rounded-full" />
              {tooltip.item.name}
            </div>
            <div className="flex flex-col gap-0.5 ml-[22px] mt-1 text-[8px] font-black uppercase tracking-widest text-smartlab-primary/80">
              <div>PROJETO: {projectById[tooltip.item.projectId] || projectById[tooltip.item.id] || 'SEM PROJETO'}</div>
              <div>EQUIPE: {teamById[tooltip.item.teamId] || 'SEM EQUIPE'}</div>
            </div>
          </div>
          <div className="space-y-1 opacity-80">
            <div>📅 Planejado: {fmtDate(tooltip.item.plannedStart)} a {fmtDate(tooltip.item.plannedEnd)}</div>
            <div>📊 Progresso: {tooltip.item.progress ?? 0}%</div>
            <div>🏷 Status: {STATUS_OPTIONS.find(s => s.value === tooltip.item.status)?.label || tooltip.item.status}</div>
            {tooltip.item.assignee && <div>👤 {tooltip.item.assignee}</div>}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-smartlab-on-surface/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-smartlab-surface rounded-[40px] border-2 border-smartlab-border shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-10 pt-10 pb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-smartlab-on-surface italic uppercase tracking-tighter">
                  {modal.mode === 'create' ? 'Configurar Item' : 'Dados da Atividade'}
                </h2>
                <div className="text-[10px] font-black uppercase text-smartlab-primary tracking-widest mt-1">
                  Nível {form.level} · {LEVEL_CONFIG[form.level]?.label}
                </div>
              </div>
              <button type="button" onClick={() => setModal(null)} className="p-3 bg-smartlab-surface-low rounded-2xl hover:bg-smartlab-border transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Título do Item</label>
                <input required autoFocus className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all"
                  value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Descrição</label>
                <textarea className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all h-20 resize-none"
                  value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-xs">
                   <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Início Planejado {form.level > 0 && "*"}</label>
                  <input type="date" className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                    value={form.plannedStart || ''} onChange={e => setForm(f => ({ ...f, plannedStart: e.target.value }))} />
                </div>
                <div className="space-y-1.5 text-xs">
                   <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Término Planejado {form.level > 0 && "*"}</label>
                  <input type="date" className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                    value={form.plannedEnd || ''} onChange={e => setForm(f => ({ ...f, plannedEnd: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-xs">
                   <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Início Realizado</label>
                  <input type="date" className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                    value={form.actualStart || ''} onChange={e => setForm(f => ({ ...f, actualStart: e.target.value }))} />
                </div>
                <div className="space-y-1.5 text-xs">
                   <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Término Realizado</label>
                  <input type="date" className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold outline-none focus:border-smartlab-primary"
                    value={form.actualEnd || ''} onChange={e => setForm(f => ({ ...f, actualEnd: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">Progresso Global</label>
                  <span className="text-lg font-black text-smartlab-primary">{form.progress}%</span>
                </div>
                <input type="range" className="w-full accent-smartlab-primary h-2 rounded-full" value={form.progress || 0} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Estado</label>
                  <select className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                    value={form.status || 'TODO'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Prioridade</label>
                  <select className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                    value={form.priority || 'Media'} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Equipe {form.level > 0 && "*"}</label>
                  <select className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                    value={form.teamId || ''} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}>
                    <option value="">— Sem equipe —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">Responsável</label>
                  <select className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-[11px] outline-none"
                    value={form.assignee || ''} onChange={e => setForm(f => ({ ...f, assignee: e.target.value || null }))}>
                    <option value="">— Sem responsável —</option>
                    {allUsers.map(u => <option key={u.id} value={u.email}>{u.name || u.email}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant ml-1">URL da Pasta (Repositório)</label>
                <input type="url" className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-primary outline-none transition-all"
                  placeholder="https://..."
                  value={form.uploadFolderUrl || ''} onChange={e => setForm(f => ({ ...f, uploadFolderUrl: e.target.value }))} />
              </div>
            </div>

            <div className="p-10 border-t-2 border-smartlab-border flex gap-4">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-4 bg-smartlab-surface-low rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black/5 transition-all">Descartar</button>
              <button type="submit" disabled={saving} className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 shadow-lg flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Confirmar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
