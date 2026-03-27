import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { validateRule, createRule, evaluateRules } from '../../services/ruleEngine';
import { SCREEN_REGISTRY } from '../../constants/screenPermissions';

import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Shield,
  GripVertical,
  Info,
  PlayCircle,
  Zap,
  User,
  Monitor,
  Search,
} from 'lucide-react';

import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────
// CONSTANTES DE METADADOS
// ─────────────────────────────────────────────

const FIELD_OPTIONS = [
  { value: 'user.role',     label: 'Cargo do Usuário (user.role)' },
  { value: 'user.email',    label: 'E-mail (user.email)' },
  { value: 'user.isDemo',   label: 'É Demo? (user.isDemo)' },
  { value: 'user.teams',    label: 'Equipes do Usuário (user.teams)' },
  { value: 'user.projects', label: 'Projetos do Usuário (user.projects)' },
  { value: 'screen',        label: 'Tela Acessada (screen)' },
  { value: 'route',         label: 'Rota da URL (route)' },
  { value: 'task.status',   label: 'Status da Tarefa (task.status)' },
  { value: 'team.id',       label: 'ID da Equipe (team.id)' },
];

const OPERATOR_OPTIONS = [
  { value: '==',          label: '== igual a' },
  { value: '!=',          label: '!= diferente de' },
  { value: 'in',          label: 'está em (in array)' },
  { value: 'not_in',      label: 'não está em (not_in)' },
  { value: 'includes',    label: 'inclui (includes)' },
  { value: '>',           label: '> maior que' },
  { value: '<',           label: '< menor que' },
  { value: 'starts_with', label: 'começa com' },
  { value: 'exists',      label: 'existe (any value)' },
  { value: 'not_exists',  label: 'não existe / nulo' },
];

const SCREEN_OPTIONS = [
  'screen:dashboard', 'screen:tasks', 'screen:checkins', 'screen:control',
  'screen:teams', 'screen:projects', 'screen:users', 'screen:settings',
  'screen:notifications', 'screen:seed',
];

const ROLE_OPTIONS = ['Admin', 'Gerente', 'User'];

const ACTION_COLORS = {
  allow:   'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  deny:    'text-red-600 bg-red-500/10 border-red-500/30',
  neutral: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
};

const EMPTY_CONDITION = { field: 'user.role', operator: '==', value: '' };

const EMPTY_FORM = {
  name: '',
  description: '',
  priority: 50,
  conditionType: 'AND',
  conditions: [{ ...EMPTY_CONDITION }],
  action: { type: 'deny', target: 'screen' },
  active: true,
};

// ─────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────

const Select = ({ value, onChange, children, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      'bg-smartlab-surface-low border-2 border-smartlab-border rounded-xl px-3 py-2 text-xs font-bold text-smartlab-on-surface focus:border-accent outline-none transition-colors',
      className
    )}
  >
    {children}
  </select>
);

const Input = ({ value, onChange, placeholder, type = 'text', className = '' }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={cn(
      'bg-smartlab-surface-low border-2 border-smartlab-border rounded-xl px-3 py-2 text-xs font-bold text-smartlab-on-surface focus:border-accent outline-none transition-colors w-full placeholder:text-smartlab-on-surface-variant/50',
      className
    )}
  />
);

// Heurística para sugerir valor baseado no campo selecionado
function ValueInput({ field, operator, value, onChange }) {
  if (operator === 'exists' || operator === 'not_exists') {
    return <span className="text-xs text-smartlab-on-surface-variant italic px-2">— sem valor —</span>;
  }

  const needsArray = operator === 'in' || operator === 'not_in';
  const placeholder = needsArray ? 'Ex: Admin,Gerente' : 'Valor';

  if (field === 'screen') {
    if (needsArray) {
      return <Input value={value} onChange={onChange} placeholder="screen:tasks,screen:control" />;
    }
    return (
      <Select value={value} onChange={onChange} className="flex-1">
        <option value="">Selecione a tela...</option>
        {SCREEN_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
    );
  }

  if (field === 'user.role') {
    if (needsArray) {
      return <Input value={value} onChange={onChange} placeholder="Admin,Gerente" />;
    }
    return (
      <Select value={value} onChange={onChange} className="flex-1">
        <option value="">Selecione o cargo...</option>
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </Select>
    );
  }

  if (field === 'user.isDemo') {
    return (
      <Select value={value} onChange={onChange} className="flex-1">
        <option value="true">true</option>
        <option value="false">false</option>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={needsArray ? 'val1,val2,...' : placeholder}
    />
  );
}

// ─────────────────────────────────────────────
// FORMULÁRIO DE REGRA
// ─────────────────────────────────────────────

function RuleForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setCondition = (idx, key, val) => {
    const conds = [...form.conditions];
    conds[idx] = { ...conds[idx], [key]: val };
    // Reset value quando muda o operador para exists/not_exists
    if (key === 'operator' && (val === 'exists' || val === 'not_exists')) {
      conds[idx].value = '';
    }
    setForm((f) => ({ ...f, conditions: conds }));
  };

  const addCondition = () =>
    setForm((f) => ({ ...f, conditions: [...f.conditions, { ...EMPTY_CONDITION }] }));

  const removeCondition = (idx) =>
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    // Normaliza valores array (string "A,B" → ["A","B"])
    const normalizedConditions = form.conditions.map((c) => {
      if (c.operator === 'in' || c.operator === 'not_in') {
        const arr = typeof c.value === 'string'
          ? c.value.split(',').map((v) => v.trim()).filter(Boolean)
          : c.value;
        return { ...c, value: arr };
      }
      if (c.operator === 'exists' || c.operator === 'not_exists') {
        return { ...c, value: null };
      }
      // Parsear booleanos
      if (c.value === 'true') return { ...c, value: true };
      if (c.value === 'false') return { ...c, value: false };
      return c;
    });

    const ruleToValidate = createRule({ ...form, conditions: normalizedConditions });
    const errs = validateRule(ruleToValidate);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    setErrors([]);
    await onSave({ ...ruleToValidate, conditions: normalizedConditions });
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Nome e Prioridade */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            Nome da Regra *
          </label>
          <Input
            value={form.name}
            onChange={(v) => setField('name', v)}
            placeholder="Ex: Bloquear Settings para não-Admin"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            Prioridade * <span className="normal-case font-normal">(menor = 1ª)</span>
          </label>
          <Input
            type="number"
            value={form.priority}
            onChange={(v) => setField('priority', Number(v))}
            placeholder="Ex: 10"
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
          Descrição <span className="normal-case font-normal">(opcional)</span>
        </label>
        <Input
          value={form.description}
          onChange={(v) => setField('description', v)}
          placeholder="Descreva o propósito desta regra..."
        />
      </div>

      {/* Tipo de condição + Ação */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            Operador entre condições
          </label>
          <Select value={form.conditionType} onChange={(v) => setField('conditionType', v)}>
            <option value="AND">AND — todas as condições</option>
            <option value="OR">OR — qualquer condição</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            Ação *
          </label>
          <Select
            value={form.action?.type}
            onChange={(v) => setField('action', { type: v, target: 'screen' })}
          >
            <option value="deny">DENY — bloquear acesso</option>
            <option value="allow">ALLOW — liberar acesso</option>
            <option value="neutral">NEUTRAL — não interfere</option>
          </Select>
        </div>
      </div>

      {/* Condições */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
            Condições *
          </label>
          <button
            onClick={addCondition}
            className="flex items-center gap-1.5 text-[10px] font-black text-accent hover:text-accent/80 uppercase tracking-widest transition-colors"
          >
            <Plus size={12} /> Adicionar Condição
          </button>
        </div>

        {form.conditions.map((cond, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border flex-wrap"
          >
            {idx > 0 && (
              <span className="text-[9px] font-black uppercase tracking-widest text-accent px-2 py-1 bg-accent/10 rounded-lg border border-accent/20">
                {form.conditionType}
              </span>
            )}

            <Select
              value={cond.field}
              onChange={(v) => setCondition(idx, 'field', v)}
              className="flex-1 min-w-[160px]"
            >
              {FIELD_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </Select>

            <Select
              value={cond.operator}
              onChange={(v) => setCondition(idx, 'operator', v)}
              className="w-40"
            >
              {OPERATOR_OPTIONS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </Select>

            <div className="flex-1 min-w-[120px]">
              <ValueInput
                field={cond.field}
                operator={cond.operator}
                value={typeof cond.value === 'boolean' ? String(cond.value) : (Array.isArray(cond.value) ? cond.value.join(',') : cond.value ?? '')}
                onChange={(v) => setCondition(idx, 'value', v)}
              />
            </div>

            {form.conditions.length > 1 && (
              <button
                onClick={() => removeCondition(idx)}
                className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Erros de validação */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
          {errors.map((e, i) => (
            <p key={i} className="text-xs font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle size={12} /> {e}
            </p>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-3 pt-4 border-t-2 border-smartlab-border justify-end flex-wrap">
        <button
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-smartlab-on-surface-variant hover:bg-smartlab-surface-low border-2 border-smartlab-border transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-accent text-white shadow-lg shadow-accent/20 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 disabled:opacity-60"
        >
          <Check size={14} />
          {saving ? 'Salvando...' : 'Salvar Regra'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CARD DE REGRA (listagem)
// ─────────────────────────────────────────────

function RuleCard({ rule, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const actionStyle = ACTION_COLORS[rule.action?.type] ?? ACTION_COLORS.neutral;
  const actionLabel = (rule.action?.type ?? 'neutral').toUpperCase();

  return (
    <div
      className={cn(
        'border-2 rounded-2xl transition-all duration-300 overflow-hidden',
        rule.active
          ? 'border-smartlab-border bg-smartlab-surface'
          : 'border-smartlab-border/50 bg-smartlab-surface-low/50 opacity-60'
      )}
    >
      {/* Header do Card */}
      <div className="flex items-center gap-3 p-4 flex-wrap">
        {/* Prioridade */}
        <div className="w-10 h-10 rounded-xl bg-smartlab-surface-low border-2 border-smartlab-border flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-black text-smartlab-on-surface-variant">
            P{rule.priority ?? '?'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-sm text-smartlab-on-surface truncate">{rule.name}</p>
            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest', actionStyle)}>
              {actionLabel}
            </span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg border border-smartlab-border text-smartlab-on-surface-variant uppercase tracking-widest">
              {rule.conditionType ?? 'AND'} · {rule.conditions?.length ?? 0} cond.
            </span>
          </div>
          {rule.description && (
            <p className="text-xs text-smartlab-on-surface-variant mt-0.5 truncate">{rule.description}</p>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle ativo */}
          <button
            onClick={() => onToggle(rule)}
            title={rule.active ? 'Desativar regra' : 'Ativar regra'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
              rule.active
                ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'border-smartlab-border text-smartlab-on-surface-variant hover:bg-smartlab-surface-low'
            )}
          >
            {rule.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {rule.active ? 'Ativa' : 'Inativa'}
          </button>

          <button
            onClick={() => onEdit(rule)}
            title="Editar"
            className="p-2 rounded-xl text-smartlab-on-surface-variant hover:text-accent hover:bg-accent/10 border-2 border-smartlab-border transition-all"
          >
            <Edit2 size={14} />
          </button>

          {delConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(rule.id)}
                className="p-2 rounded-xl text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setDelConfirm(false)}
                className="p-2 rounded-xl text-smartlab-on-surface-variant hover:bg-smartlab-surface-low border-2 border-smartlab-border transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDelConfirm(true)}
              title="Excluir"
              className="p-2 rounded-xl text-smartlab-on-surface-variant hover:text-red-500 hover:bg-red-500/10 border-2 border-smartlab-border transition-all"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-2 rounded-xl text-smartlab-on-surface-variant hover:bg-smartlab-surface-low border-2 border-smartlab-border transition-all"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Condições expandidas */}
      {expanded && (
        <div className="px-4 pb-4 border-t-2 border-smartlab-border pt-4 flex flex-col gap-2 animate-in fade-in duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-1">
            Condições ({rule.conditionType})
          </p>
          {(rule.conditions ?? []).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
              {i > 0 && (
                <span className="text-[9px] font-black text-accent uppercase">{rule.conditionType}</span>
              )}
              <code className="px-2 py-1 bg-smartlab-surface-low rounded-lg border border-smartlab-border font-mono text-smartlab-on-surface">
                {c.field}
              </code>
              <span className="font-bold text-smartlab-on-surface-variant">{c.operator}</span>
              <code className="px-2 py-1 bg-smartlab-surface-low rounded-lg border border-smartlab-border font-mono text-accent">
                {Array.isArray(c.value) ? `[${c.value.join(', ')}]` : String(c.value ?? '—')}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function RuleEngineSection({ onSave }) {
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit' | 'simulate'
  const [editingRule, setEditingRule] = useState(null);

  // Estados do Simulador
  const [simContext, setSimContext] = useState({
    userEmail: '',
    screenId: 'screen:dashboard',
  });
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    const unsubRules = onSnapshot(
      collection(db, 'rules'),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
        setRules(data);
        setLoading(false);
      },
      (err) => {
        console.error('[RuleEngineSection] Erro ao carregar regras:', err);
        setLoading(false);
      }
    );

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.email));
    });

    return () => {
      unsubRules();
      unsubUsers();
    };
  }, []);

  const handleCreate = async (ruleData) => {
    const { id: _ignore, ...withoutId } = ruleData;
    const user = auth.currentUser;
    await addDoc(collection(db, 'rules'), {
      ...withoutId,
      createdAt: serverTimestamp(),
      createdByEmail: user?.email || 'sistema',
      lastUpdatedByEmail: user?.email || 'sistema',
    });
    onSave('Regra criada com sucesso!');
    setMode('list');
  };

  const handleEdit = async (ruleData) => {
    const { id, ...data } = ruleData;
    const user = auth.currentUser;
    await updateDoc(doc(db, 'rules', id), {
      ...data,
      updatedAt: serverTimestamp(),
      lastUpdatedByEmail: user?.email || 'sistema',
    });
    onSave('Regra atualizada!');
    setMode('list');
    setEditingRule(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'rules', id));
    onSave('Regra excluída.', 'error');
  };

  const handleToggle = async (rule) => {
    const user = auth.currentUser;
    await updateDoc(doc(db, 'rules', rule.id), { 
      active: !rule.active,
      lastUpdatedByEmail: user?.email || 'sistema',
      updatedAt: serverTimestamp(),
    });
    onSave(rule.active ? 'Regra desativada.' : 'Regra ativada!');
  };

  const startEdit = (rule) => {
    const normalizedConditions = (rule.conditions ?? []).map((c) => ({
      ...c,
      value: Array.isArray(c.value)
        ? c.value.join(',')
        : c.value === null || c.value === undefined
        ? ''
        : String(c.value),
    }));
    setEditingRule({ ...rule, conditions: normalizedConditions });
    setMode('edit');
  };

  const runSimulation = () => {
    const targetUser = users.find(u => u.email === simContext.userEmail);
    if (!targetUser && simContext.userEmail) {
      onSave('Usuário não encontrado.', 'error');
      return;
    }

    // Mock context para avaliação (parcialmente baseado no usuário real)
    const context = {
      user: targetUser ? {
        uid: targetUser.id,
        email: targetUser.email,
        role: targetUser.role || 'User',
        teams: targetUser.teams || [],
        projects: targetUser.projects || [],
        isDemo: targetUser.isDemo || false,
      } : {
        uid: 'anonymous',
        email: simContext.userEmail || 'anonymous@mock.com',
        role: 'User',
        teams: [],
        projects: [],
        isDemo: false
      },
      screen: simContext.screenId,
      route: SCREEN_REGISTRY[simContext.screenId]?.path || '/',
      task: null,
      team: null
    };

    // Rodar engine
    const result = evaluateRules(rules, context, { debug: false });
    setSimResult({ ...result, context });
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-smartlab-surface-low animate-pulse" />
        ))}
      </div>
    );
  }

  // ─── FORMULÁRIO (criar / editar) ───
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 pb-4 border-b-2 border-smartlab-border">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
            <Shield size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-black text-base text-smartlab-on-surface uppercase italic tracking-tight">
              {mode === 'create' ? 'Nova Regra' : 'Editar Regra'}
            </h3>
            <p className="text-[10px] text-smartlab-on-surface-variant uppercase tracking-widest font-bold">
              As alterações são aplicadas imediatamente
            </p>
          </div>
        </div>

        <RuleForm
          initial={mode === 'edit' ? editingRule : null}
          onSave={mode === 'edit' ? handleEdit : handleCreate}
          onCancel={() => { setMode('list'); setEditingRule(null); }}
        />
      </div>
    );
  }

  // ─── SIMULADOR ───
  if (mode === 'simulate') {
    return (
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between pb-4 border-b-2 border-smartlab-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center">
              <Zap size={18} className="text-purple-500" />
            </div>
            <div>
              <h3 className="font-black text-base text-smartlab-on-surface uppercase italic tracking-tight">ACL Simulator</h3>
              <p className="text-[10px] text-smartlab-on-surface-variant uppercase tracking-widest font-bold">Inspecione o motor de regras</p>
            </div>
          </div>
          <button onClick={() => setMode('list')} className="p-2 hover:bg-smartlab-surface-low rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs Simulação */}
          <div className="flex flex-col gap-4 p-6 bg-smartlab-surface-low/50 rounded-3xl border-2 border-smartlab-border">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant flex items-center gap-2"><User size={12}/> Selecionar Usuário</label>
              <Select value={simContext.userEmail} onChange={v => setSimContext(s => ({...s, userEmail: v}))}>
                <option value="">(Simular como Visitante/Anonymous)</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.name || u.email} ({u.role})</option>)}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant flex items-center gap-2"><Monitor size={12}/> Selecionar Tela</label>
              <Select value={simContext.screenId} onChange={v => setSimContext(s => ({...s, screenId: v}))}>
                {Object.keys(SCREEN_REGISTRY).map(id => <option key={id} value={id}>{SCREEN_REGISTRY[id].label} ({id})</option>)}
              </Select>
            </div>

            <button 
              onClick={runSimulation}
              className="mt-2 w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle size={16} /> Rodar Simulação
            </button>
          </div>

          {/* Resultado Simulação */}
          <div className="flex flex-col p-6 bg-smartlab-surface border-2 border-smartlab-border rounded-3xl min-h-[300px]">
             {!simResult ? (
               <div className="flex flex-col items-center justify-center flex-1 text-smartlab-on-surface-variant opacity-30 gap-3">
                 <Search size={48} strokeWidth={1} />
                 <p className="text-xs font-black uppercase tracking-widest">Aguardando Execução</p>
               </div>
             ) : (
               <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">Resultado</p>
                    <span className={cn(
                      'px-3 py-1 rounded-lg font-black text-xs uppercase italic tracking-tight border-2',
                      simResult.decision === 'allow' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                      simResult.decision === 'deny' ? 'bg-red-500/10 text-red-600 border-red-500/20' : 
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    )}>
                      {simResult.decision.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-4 bg-smartlab-surface-low rounded-2xl border border-smartlab-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-2">Trace de Avaliação</p>
                    <div className="flex flex-col gap-2">
                       {simResult.log.map((entry, idx) => (
                         <div key={idx} className="flex flex-col gap-1 border-b border-smartlab-border last:border-0 pb-2 mb-1 last:mb-0">
                           <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-smartlab-on-surface truncate max-w-[150px]">
                                {entry.ruleName} <span className="text-[9px] font-normal opacity-50">(P{entry.priority})</span>
                              </span>
                              <span className={cn(
                                'text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded',
                                entry.matched ? 'bg-emerald-500 text-white' : 'bg-smartlab-border text-smartlab-on-surface-variant'
                              )}>
                                {entry.matched ? 'MATCH' : 'SKIP'}
                              </span>
                           </div>
                           <p className="text-[10px] font-mono text-smartlab-on-surface-variant/70 leading-relaxed overflow-x-auto whitespace-pre pb-1">
                             {entry.reason}
                           </p>
                           {entry.appliedAction && (
                             <p className="text-[10px] font-black text-purple-600 uppercase">→ Ação: {entry.appliedAction}</p>
                           )}
                         </div>
                       ))}
                       {simResult.log.length === 0 && <p className="text-xs italic text-smartlab-on-surface-variant">Nenhuma regra ativa correspondeu.</p>}
                    </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  // ─── LISTAGEM ───
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Banner informativo */}
      <div className="flex items-start gap-4 p-4 bg-accent/5 border-2 border-accent/20 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <Info size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="text-xs text-smartlab-on-surface-variant relative">
          <p className="font-black text-smartlab-on-surface mb-0.5">Motor de Regras de Acesso</p>
          <p>
            Regras são avaliadas em ordem de <strong>prioridade (menor = 1ª)</strong> após o RBAC básico.
            Uma regra <strong>ALLOW</strong> pode liberar o que o RBAC negou; <strong>DENY</strong> bloqueia mesmo que o RBAC permita.
          </p>
        </div>
        <button 
          onClick={() => setMode('simulate')}
          className="ml-auto px-4 py-2 bg-smartlab-surface-low border-2 border-smartlab-border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white hover:border-accent transition-all flex items-center gap-2 group-hover:scale-105"
        >
          <PlayCircle size={14} /> Abrir Simulador
        </button>
      </div>


      {/* Header da listagem */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-black text-sm text-smartlab-on-surface">
            {rules.length} {rules.length === 1 ? 'regra cadastrada' : 'regras cadastradas'}
          </p>
          <p className="text-xs text-smartlab-on-surface-variant">
            {rules.filter((r) => r.active).length} ativa{rules.filter((r) => r.active).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-accent text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          <Plus size={14} /> Nova Regra
        </button>
      </div>

      {/* Lista de regras */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-smartlab-on-surface-variant">
          <div className="w-16 h-16 rounded-2xl bg-smartlab-surface-low border-2 border-smartlab-border flex items-center justify-center">
            <Shield size={28} className="opacity-30" />
          </div>
          <p className="text-sm font-black uppercase tracking-widest italic">Nenhuma regra criada</p>
          <p className="text-xs text-center max-w-sm">
            Crie regras dinâmicas para controlar o acesso às telas e funcionalidades do sistema.
          </p>
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-accent text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:brightness-110 transition-all mt-2"
          >
            <Plus size={14} /> Criar Primeira Regra
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={startEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Dica de debug */}
      <div className="flex items-center gap-2 p-3 bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl">
        <code className="text-[10px] font-mono text-smartlab-on-surface-variant">
          localStorage.setItem('acl_debug', 'true')
        </code>
        <span className="text-[10px] text-smartlab-on-surface-variant">→ ver trace de avaliação no console</span>
      </div>
    </div>
  );
}
