import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Plus, ChevronRight, ChevronDown, Edit2, Trash2, X, Check,
  Calendar, ZoomIn, ZoomOut, Target, Briefcase, Layers,
  Activity, CheckSquare, AlignLeft, Loader2, FolderOpen,
  AlertCircle, Clock, User, Flag, BarChart2
} from 'lucide-react';
import { cn } from '../utils/cn';

// ─── helpers ────────────────────────────────────────────────────────────────

const normalizeRole = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'administrador') return 'Admin';
  if (r === 'gerente de projeto' || r === 'project manager') return 'Gerente de Projeto';
  if (r === 'gerente' || r === 'manager' || r === 'gestor' || r === 'líder de equipe' || r === 'lider de equipe') return 'Líder de Equipe';
  return 'Colaborador';
};

const LEVEL_CONFIG = [
  { label: 'Projeto',    icon: Briefcase,   color: 'text-violet-500',  bar: '#7c3aed', dot: 'bg-violet-500',  indent: 0  },
  { label: 'Tarefa N1', icon: Layers,       color: 'text-orange-500',  bar: '#ea580c', dot: 'bg-orange-500',  indent: 16 },
  { label: 'Tarefa N2', icon: Target,       color: 'text-cyan-400',    bar: '#06b6d4', dot: 'bg-cyan-400',    indent: 32 },
  { label: 'Tarefa N3', icon: Activity,     color: 'text-lime-500',    bar: '#65a30d', dot: 'bg-lime-500',    indent: 48 },
  { label: 'Tarefa N4', icon: CheckSquare,  color: 'text-pink-500',    bar: '#db2777', dot: 'bg-pink-500',    indent: 64 },
];

const STATUS_OPTIONS = [
  { value: 'not_started', label: '⚪ Não Iniciado' },
  { value: 'in_progress', label: '🔵 Em Andamento' },
  { value: 'completed',   label: '🟢 Concluído'    },
  { value: 'delayed',     label: '🔴 Atrasado'     },
  { value: 'on_hold',     label: '🟡 Em Espera'    },
];

const PRIORITY_OPTIONS = ['Baixa', 'Média', 'Alta', 'Crítica'];

const ROW_H = 50;
const LEFT_W = 340;

const today = () => new Date().toISOString().slice(0, 10);

const parseDate = (s) => s ? new Date(s + 'T00:00:00') : null;

const diffDays = (a, b) => Math.round((b - a) / 86400000);

const fmtDate = (s) => {
  if (!s) return '—';
  const d = parseDate(s);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── WBS numbering ──────────────────────────────────────────────────────────

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
  // WBS rules:
  //   Level 0 (Projeto): absolute index → "1", "2", "3"
  //   Level 1 (Tarefa N1): resets inside each project → "1", "2", "3"
  //   Level 2+ : parent.wbs + "." + childIndex → "1.1", "1.1.2", …
  const walk = (arr, parentWbs, parentLevel) => {
    sort(arr).forEach((node, idx) => {
      if (node.level <= 1) {
        // Level 0 and Level 1 both use simple sequential numbers
        node.wbs = `${idx + 1}`;
      } else {
        node.wbs = parentWbs ? `${parentWbs}.${idx + 1}` : `${idx + 1}`;
      }
      walk(node.children, node.wbs, node.level);
    });
  };
  walk(roots, '', -1);
  const flat = [];
  const flatten = arr => arr.forEach(n => { flat.push(n); flatten(n.children); });
  flatten(roots);
  return flat;
}

// ─── zoom helpers ───────────────────────────────────────────────────────────

const ZOOM_MODES = [
  { key: 'day',   label: 'Dia',   dayWidth: 40 },
  { key: 'week',  label: 'Semana', dayWidth: 14 },
  { key: 'month', label: 'Mês',   dayWidth: 5  },
];

function getTimelineRange(items) {
  const dates = items.flatMap(i => [i.plannedStart, i.plannedEnd, i.actualStart, i.actualEnd].filter(Boolean));
  if (!dates.length) {
    const t = today();
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
    // group by ISO week
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
    // month
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

// ─── Main component ──────────────────────────────────────────────────────────

export default function Projects({ user }) {
  const role = normalizeRole(user?.role);
  const canWrite  = role === 'Admin' || role === 'Gerente de Projeto';
  const canAssign = role === 'Líder de Equipe';

  const [items, setItems]         = useState([]);
  const [allUsers, setAllUsers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [collapsed, setCollapsed] = useState(new Set());
  const [zoomIdx, setZoomIdx]     = useState(1);
  const [modal, setModal]         = useState(null); // { mode:'create'|'edit', item, parentItem? }
  const [tooltip, setTooltip]     = useState(null); // { x,y, item }
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const leftRef  = useRef(null);
  const rightRef = useRef(null);
  const syncing  = useRef(false);

  const zoom    = ZOOM_MODES[zoomIdx];
  const tree    = useMemo(() => buildTree(items), [items]);
  const { start: rangeStart, end: rangeEnd } = useMemo(() => getTimelineRange(items), [items]);
  const columns = useMemo(() => buildColumns(rangeStart, rangeEnd, zoom.key), [rangeStart, rangeEnd, zoom.key]);
  const totalDays = diffDays(rangeStart, rangeEnd) + 1;
  const ganttWidth = totalDays * zoom.dayWidth;

  // visible rows after collapse filter
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

  // ── Firestore listeners ──
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 5000);
    const unsub = onSnapshot(collection(db, 'gantt_items'),
      s => { setItems(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); clearTimeout(timer); },
      () => { setLoading(false); clearTimeout(timer); }
    );
    const unsubU = onSnapshot(collection(db, 'users'),
      s => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    return () => { clearTimeout(timer); unsub(); unsubU(); };
  }, []);

  // ── Synchronized scroll ──
  const syncScroll = useCallback((src) => {
    if (syncing.current) return;
    syncing.current = true;
    const other = src === leftRef.current ? rightRef.current : leftRef.current;
    if (other) other.scrollTop = src.scrollTop;
    setTimeout(() => { syncing.current = false; }, 16);
  }, []);

  // ── Scroll to today ──
  const scrollToToday = useCallback(() => {
    if (!rightRef.current) return;
    const dayOffset = diffDays(rangeStart, new Date());
    const px = dayOffset * zoom.dayWidth - 200;
    rightRef.current.scrollLeft = Math.max(0, px);
  }, [rangeStart, zoom.dayWidth]);

  // ── collapse toggle ──
  const toggleCollapse = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasChildren = (id) => tree.some(n => n.parentId === id);

  // ── Open modal ──
  const openCreate = (parentItem = null) => {
    const level = parentItem ? Math.min(parentItem.level + 1, 4) : 0;
    setForm({
      name: '', description: '', level,
      parentId: parentItem?.id || null,
      projectId: parentItem?.projectId || parentItem?.id || '',
      plannedStart: today(), plannedEnd: today(),
      actualStart: '', actualEnd: '',
      progress: 0, status: 'not_started',
      assignee: '', priority: 'Média',
    });
    setModal({ mode: 'create', parentItem });
  };

  const openEdit = (item) => {
    setForm({ ...item });
    setModal({ mode: 'edit', item });
  };

  // ── Save ──
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description || '',
        level: form.level ?? 0,
        parentId: form.parentId || null,
        projectId: form.projectId || '',
        plannedStart: form.plannedStart || '',
        plannedEnd: form.plannedEnd || '',
        actualStart: form.actualStart || '',
        actualEnd: form.actualEnd || '',
        progress: Number(form.progress) || 0,
        status: form.status || 'not_started',
        assignee: form.assignee || '',
        priority: form.priority || 'Média',
        updatedAt: serverTimestamp(),
      };
      if (modal.mode === 'create') {
        const ref = await addDoc(collection(db, 'gantt_items'), { ...data, createdAt: serverTimestamp() });
        if (data.level === 0) {
          await updateDoc(ref, { projectId: ref.id });
        }
      } else {
        await updateDoc(doc(db, 'gantt_items', modal.item.id), data);
      }
      setModal(null);
    } catch (err) { alert('Erro ao salvar: ' + err.message); }
    setSaving(false);
  };

  // ── Delete cascade ──
  const handleDelete = async (item) => {
    if (!window.confirm(`Excluir "${item.name}" e todos os seus subitens?`)) return;
    setDeleting(item.id);
    try {
      const getAllDescendantIds = (id) => {
        const children = tree.filter(n => n.parentId === id);
        return children.reduce((acc, c) => [...acc, c.id, ...getAllDescendantIds(c.id)], []);
      };
      const ids = [item.id, ...getAllDescendantIds(item.id)];
      await Promise.all(ids.map(id => deleteDoc(doc(db, 'gantt_items', id))));
    } catch (err) { alert('Erro ao excluir: ' + err.message); }
    setDeleting(null);
  };

  // ── Bar position helpers ──
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

  const isLate = (item) => {
    if (item.status === 'completed') return false;
    if (!item.plannedEnd) return false;
    return parseDate(item.plannedEnd) < new Date();
  };

  // Cor da barra sempre pelo nível hierárquico (LEVEL_CONFIG)
  const barColor = (item) => LEVEL_CONFIG[item.level]?.bar || '#8b5cf6';

  // ── Permission helper ──
  const canEdit = (item) => {
    if (canWrite) return true;
    if (canAssign && item.assignee === (user?.email || '')) return true;
    return false;
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center gap-3 p-8 text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">
      <Loader2 size={18} className="animate-spin" /> Carregando Gantt...
    </div>
  );

  const todayOffset = diffDays(rangeStart, new Date()) * zoom.dayWidth;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 px-6 py-5 border-b-2 border-smartlab-border bg-smartlab-surface shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-4xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Projetos</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-[10px] uppercase tracking-[0.2em] opacity-60">
            {tree.filter(i => i.level === 0).length} projeto(s) · {tree.length} itens · Gráfico de Gantt WBS
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-smartlab-surface-low border-2 border-smartlab-border rounded-xl text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="w-8 h-2 rounded-full bg-gray-300/70 inline-block" /> Planejado</span>
            <span className="flex items-center gap-1.5"><span className="w-8 h-2 rounded-full bg-violet-500 inline-block" /> Executado</span>
          </div>

          {/* Zoom */}
          <div className="flex rounded-xl overflow-hidden border-2 border-smartlab-border">
            {ZOOM_MODES.map((z, i) => (
              <button key={z.key}
                onClick={() => setZoomIdx(i)}
                className={cn('px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                  i === zoomIdx
                    ? 'bg-smartlab-primary text-white'
                    : 'bg-smartlab-surface-low text-smartlab-on-surface-variant hover:bg-smartlab-border'
                )}>
                {z.label}
              </button>
            ))}
          </div>

          {/* Today */}
          <button onClick={scrollToToday}
            className="flex items-center gap-2 px-4 py-2.5 bg-smartlab-surface-low border-2 border-smartlab-border text-smartlab-on-surface-variant rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-smartlab-on-surface transition-all">
            <Calendar size={14} /> Hoje
          </button>

          {/* New project */}
          {canWrite && (
            <button onClick={() => openCreate(null)}
              className="flex items-center gap-2 px-5 py-2.5 bg-smartlab-primary text-white rounded-xl font-black text-[10px] uppercase tracking-[0.15em] hover:scale-105 transition-all shadow-lg active:scale-95 group">
              <Plus size={15} className="group-hover:rotate-90 transition-transform" /> Novo Projeto
            </button>
          )}
        </div>
      </header>

      {/* ── EMPTY STATE ─────────────────────────────────────────── */}
      {tree.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-24 gap-4">
          <FolderOpen size={52} className="text-smartlab-border" />
          <p className="text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">
            Nenhum item cadastrado. {canWrite ? 'Clique em "Novo Projeto" para começar.' : ''}
          </p>
        </div>
      )}

      {/* ── GANTT BODY ──────────────────────────────────────────── */}
      {tree.length > 0 && (
        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

          {/* LEFT PANEL */}
          <div
            ref={leftRef}
            onScroll={e => syncScroll(e.currentTarget)}
            className="shrink-0 overflow-y-auto overflow-x-hidden border-r-2 border-smartlab-border bg-smartlab-surface"
            style={{ width: LEFT_W }}>

            {/* Left header */}
            <div className="sticky top-0 z-10 h-[56px] flex items-end px-4 pb-2 bg-smartlab-surface border-b-2 border-smartlab-border shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60">Item / WBS</span>
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

                  {/* Collapse toggle */}
                  <button
                    onClick={() => hasKids && toggleCollapse(item.id)}
                    className={cn('w-5 h-5 flex items-center justify-center rounded transition-colors shrink-0',
                      hasKids ? 'hover:bg-smartlab-border cursor-pointer' : 'opacity-0 pointer-events-none'
                    )}>
                    {hasKids
                      ? (isCollapsed ? <ChevronRight size={13} className={cfg.color} /> : <ChevronDown size={13} className={cfg.color} />)
                      : null}
                  </button>

                  {/* Dot */}
                  <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />

                  {/* Icon */}
                  <Icon size={12} className={cn(cfg.color, 'shrink-0')} />

                  {/* WBS + Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[9px] font-black text-smartlab-on-surface-variant opacity-50 shrink-0">{item.wbs}</span>
                      <span className="text-[11px] font-black text-smartlab-on-surface truncate leading-none">{item.name}</span>
                    </div>
                    <div className="text-[9px] text-smartlab-on-surface-variant opacity-50 truncate mt-0.5">
                      {item.assignee || cfg.label} · {item.progress ?? 0}%
                    </div>
                  </div>

                  {/* Actions (hover) */}
                  <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                    {canWrite && item.level < 4 && (
                      <button onClick={() => openCreate(item)}
                        title="Adicionar subitem"
                        className="p-1 rounded hover:bg-smartlab-primary hover:text-white text-smartlab-on-surface-variant transition-all">
                        <Plus size={11} />
                      </button>
                    )}
                    {canEdit(item) && (
                      <button onClick={() => openEdit(item)}
                        title="Editar"
                        className="p-1 rounded hover:bg-blue-100 hover:text-blue-600 text-smartlab-on-surface-variant transition-all">
                        <Edit2 size={11} />
                      </button>
                    )}
                    {canWrite && (
                      <button onClick={() => handleDelete(item)}
                        title="Excluir"
                        disabled={deleting === item.id}
                        className="p-1 rounded hover:bg-red-100 hover:text-red-500 text-smartlab-on-surface-variant transition-all">
                        {deleting === item.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT PANEL */}
          <div
            ref={rightRef}
            onScroll={e => syncScroll(e.currentTarget)}
            className="flex-1 overflow-auto"
            style={{ position: 'relative' }}>

            <div style={{ width: ganttWidth, minWidth: '100%', position: 'relative' }}>

              {/* Timeline header */}
              <div className="sticky top-0 z-10 bg-smartlab-surface border-b-2 border-smartlab-border shrink-0" style={{ height: 56 }}>
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
                        className={cn('flex flex-col items-center justify-center border-r border-smartlab-border/30 shrink-0 text-center',
                          isWeekend && zoom.key === 'day' ? 'bg-amber-50/50' : ''
                        )}
                        style={{ width: w, minWidth: w }}>
                        <span className="text-[9px] font-black text-smartlab-on-surface-variant opacity-80 leading-none">{label1}</span>
                        {w > 20 && <span className="text-[8px] text-smartlab-on-surface-variant opacity-40 mt-0.5">{label2}</span>}
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
                    width: 2, background: '#ef4444', zIndex: 5, pointerEvents: 'none'
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      background: '#ef4444', color: 'white',
                      fontSize: 8, fontWeight: 900, padding: '1px 4px',
                      borderRadius: '0 0 4px 4px', letterSpacing: 1, whiteSpace: 'nowrap'
                    }}>HOJE</div>
                  </div>
                )}

                {/* Weekend shading */}
                {zoom.key === 'day' && columns.map((col, ci) => {
                  const isWE = col.date.getDay() === 0 || col.date.getDay() === 6;
                  if (!isWE) return null;
                  const x = ci * zoom.dayWidth;
                  return (
                    <div key={ci} style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: x, width: zoom.dayWidth,
                      background: 'rgba(251,191,36,0.07)', pointerEvents: 'none'
                    }} />
                  );
                })}

                {/* Grid lines */}
                {columns.map((col, ci) => {
                  const x = (zoom.key === 'day' ? ci : columns.slice(0, ci).reduce((s, c) => s + c.span, 0)) * zoom.dayWidth;
                  return (
                    <div key={ci} style={{
                      position: 'absolute', top: 0, bottom: 0, left: x,
                      width: 1, background: 'rgba(0,0,0,0.06)', pointerEvents: 'none'
                    }} />
                  );
                })}

                {/* Rows */}
                {visibleRows.map((item) => {
                  const pX = barX(item.plannedStart);
                  const pW = barW(item.plannedStart, item.plannedEnd);
                  const aX = barX(item.actualStart || item.plannedStart);
                  const fullW = barW(item.actualStart || item.plannedStart, item.actualEnd || item.plannedEnd);
                  const aW = fullW * ((item.progress ?? 0) / 100);
                  const bColor = barColor(item);

                  // Two parallel tracks:
                  //   track 1 (top)    → planned bar  — top offset: 30% of ROW_H
                  //   track 2 (bottom) → executed bar  — top offset: 56% of ROW_H
                  const BAR_H    = 8;
                  const TRACK_P  = Math.round(ROW_H * 0.28); // planned track top
                  const TRACK_A  = Math.round(ROW_H * 0.56); // actual  track top

                  return (
                    <div key={item.id}
                      className="border-b border-smartlab-border/30 hover:bg-smartlab-surface-low/40 transition-colors"
                      style={{ height: ROW_H, position: 'relative' }}>

                      {/* ── Track 1: Planned (gray) ── */}
                      {pW > 0 && (
                        <>
                          {/* background rail */}
                          <div style={{
                            position: 'absolute',
                            left: pX, top: TRACK_P,
                            width: pW, height: BAR_H,
                            background: 'rgba(156,163,175,0.30)',
                            borderRadius: 999,
                            zIndex: 1,
                          }} />
                          {/* label */}
                          {pW > 52 && (
                            <span style={{
                              position: 'absolute',
                              left: pX + 5, top: TRACK_P,
                              height: BAR_H, lineHeight: `${BAR_H}px`,
                              fontSize: 7, fontWeight: 900,
                              color: 'rgba(0,0,0,0.38)',
                              letterSpacing: 0.8, zIndex: 3,
                              pointerEvents: 'none',
                            }}>PLAN</span>
                          )}
                        </>
                      )}

                      {/* ── Track 2: Executed (colored) ── */}
                      {fullW > 0 && (
                        <>
                          {/* full-width backdrop (gray) showing total actual span */}
                          <div style={{
                            position: 'absolute',
                            left: aX, top: TRACK_A,
                            width: fullW, height: BAR_H,
                            background: 'rgba(156,163,175,0.18)',
                            borderRadius: 999,
                            zIndex: 1,
                          }} />
                          {/* progress fill */}
                          {aW > 0 && (
                            <div
                              onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, item })}
                              onMouseLeave={() => setTooltip(null)}
                              style={{
                                position: 'absolute',
                                left: aX, top: TRACK_A,
                                width: aW, height: BAR_H,
                                background: bColor,
                                borderRadius: 999,
                                zIndex: 2,
                                cursor: 'default',
                                boxShadow: `0 1px 6px ${bColor}55`,
                              }} />
                          )}
                          {/* label */}
                          {fullW > 52 && (
                            <span style={{
                              position: 'absolute',
                              left: aX + 5, top: TRACK_A,
                              height: BAR_H, lineHeight: `${BAR_H}px`,
                              fontSize: 7, fontWeight: 900,
                              color: 'rgba(255,255,255,0.85)',
                              letterSpacing: 0.8, zIndex: 3,
                              pointerEvents: 'none',
                            }}>{item.progress ?? 0}%</span>
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
      )}

      {/* ── TOOLTIP ─────────────────────────────────────────────── */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 8,
          zIndex: 9999, pointerEvents: 'none',
          background: 'var(--color-smartlab-on-surface, #1a1a2e)',
          color: 'var(--color-smartlab-surface, #fff)',
          borderRadius: 12, padding: '8px 12px',
          fontSize: 10, fontWeight: 700, lineHeight: 1.7,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          minWidth: 180,
        }}>
          <div style={{ fontWeight: 900, fontSize: 11, marginBottom: 4 }}>{tooltip.item.name}</div>
          <div>📅 Plan: {fmtDate(tooltip.item.plannedStart)} → {fmtDate(tooltip.item.plannedEnd)}</div>
          {tooltip.item.actualStart && <div>✅ Real: {fmtDate(tooltip.item.actualStart)} → {fmtDate(tooltip.item.actualEnd)}</div>}
          <div>📊 Progresso: {tooltip.item.progress ?? 0}%</div>
          <div>🏷 Status: {STATUS_OPTIONS.find(s => s.value === tooltip.item.status)?.label || tooltip.item.status}</div>
          {tooltip.item.assignee && <div>👤 {tooltip.item.assignee}</div>}
        </div>
      )}

      {/* ── MODAL ───────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-smartlab-on-surface/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-smartlab-surface rounded-[28px] border-2 border-smartlab-border shadow-2xl w-full max-w-[560px] relative animate-in fade-in zoom-in duration-300 overflow-hidden max-h-[90vh] flex flex-col">

            {/* Color strip by level */}
            <div style={{ height: 5, background: LEVEL_CONFIG[form.level ?? 0]?.bar || '#8b5cf6' }} />

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b-2 border-smartlab-border shrink-0">
              <div>
                <h2 className="text-xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-none">
                  {modal.mode === 'create' ? 'Novo Item' : 'Editar Item'}
                </h2>
                <p className="text-[10px] font-bold text-smartlab-on-surface-variant opacity-60 uppercase tracking-widest mt-1">
                  {LEVEL_CONFIG[form.level ?? 0]?.label}
                  {modal.parentItem ? ` · filho de "${modal.parentItem.name}"` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setModal(null)}
                className="text-smartlab-on-surface-variant hover:text-smartlab-on-surface transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-8 py-6 flex flex-col gap-5">

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Nome *</label>
                <input autoFocus required
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3.5 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all placeholder:text-smartlab-on-surface-variant placeholder:opacity-30"
                  placeholder="Nome do item..."
                  value={form.name || ''}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1.5"><AlignLeft size={11} /> Descrição</label>
                <textarea rows={2}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3.5 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all resize-none placeholder:text-smartlab-on-surface-variant placeholder:opacity-30"
                  placeholder="Detalhes ou objetivo..."
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Início Planejado</label>
                  <input type="date"
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                    value={form.plannedStart || ''}
                    onChange={e => setForm(f => ({ ...f, plannedStart: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Fim Planejado</label>
                  <input type="date"
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                    value={form.plannedEnd || ''}
                    onChange={e => setForm(f => ({ ...f, plannedEnd: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Início Real</label>
                  <input type="date"
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                    value={form.actualStart || ''}
                    onChange={e => setForm(f => ({ ...f, actualStart: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Fim Real</label>
                  <input type="date"
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                    value={form.actualEnd || ''}
                    onChange={e => setForm(f => ({ ...f, actualEnd: e.target.value }))} />
                </div>
              </div>

              {/* Progress */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1.5">
                  <BarChart2 size={11} /> Progresso — {form.progress ?? 0}%
                </label>
                <div className="relative">
                  <input type="range" min={0} max={100} step={1}
                    className="w-full accent-smartlab-primary"
                    value={form.progress ?? 0}
                    onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} />
                  <div className="mt-1 h-2 bg-smartlab-surface-low rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${form.progress ?? 0}%`, background: LEVEL_CONFIG[form.level ?? 0]?.bar || '#8b5cf6' }} />
                  </div>
                </div>
              </div>

              {/* Status + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Status</label>
                  <select
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-black text-[11px] text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer"
                    value={form.status || 'not_started'}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1"><Flag size={11} /> Prioridade</label>
                  <select
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-black text-[11px] text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer"
                    value={form.priority || 'Média'}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Assignee */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1"><User size={11} /> Responsável</label>
                <select
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-3 font-black text-[11px] text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer"
                  value={form.assignee || ''}
                  onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}>
                  <option value="">— Sem responsável —</option>
                  {allUsers.map(u => <option key={u.id} value={u.email}>{u.name || u.email}</option>)}
                </select>
              </div>

              {/* Level (read-only) */}
              <div className="flex items-center gap-2 px-4 py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                {React.createElement(LEVEL_CONFIG[form.level ?? 0]?.icon || Briefcase, { size: 14, className: LEVEL_CONFIG[form.level ?? 0]?.color })}
                <span className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
                  Nível {form.level ?? 0} — {LEVEL_CONFIG[form.level ?? 0]?.label}
                </span>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-4 px-8 py-5 border-t-2 border-smartlab-border shrink-0">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-3.5 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-smartlab-border hover:bg-smartlab-border transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3.5 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {modal.mode === 'create' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
