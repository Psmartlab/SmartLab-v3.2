/**
 * ruleEngine.js
 * Motor puro (sem side-effects) de avaliação de regras de acesso.
 *
 * CONVENÇÕES v3:
 *  - priority: menor número = maior prioridade (ex: 10 é avaliada antes de 100)
 *  - actions: objeto { type: 'allow'|'deny'|'neutral', target: 'screen'|'permission'|'*' }
 *  - conditionType: 'AND' | 'OR' (aplica-se a toda a lista de conditions)
 *  - Sem conditionGroups — use múltiplas regras para lógica complexa
 */

// ─────────────────────────────────────────────
// TIPOS (JSDoc para IntelliSense)
// ─────────────────────────────────────────────

/**
 * @typedef {'==' | '!=' | 'in' | 'not_in' | 'includes' | '>' | '<' | '>=' | '<=' | 'starts_with' | 'exists' | 'not_exists'} Operator
 *
 * @typedef {Object} Condition
 * @property {string} field      — Caminho no contexto: "user.role", "screen", "route", "task.status", "team.id"
 * @property {Operator} operator
 * @property {*} value           — Scalar ou array dependendo do operador
 *
 * @typedef {Object} RuleAction
 * @property {'allow'|'deny'|'neutral'} type
 * @property {'screen'|'permission'|'*'} [target]  — Para expansão futura
 *
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} active
 * @property {number} priority     — Menor = maior prioridade
 * @property {'AND'|'OR'} conditionType
 * @property {Condition[]} conditions
 * @property {RuleAction} action
 *
 * @typedef {Object} EvalContext
 * @property {{ uid: string, email: string, role: string, teams: string[], projects: string[], isDemo: boolean }} user
 * @property {string|null} screen   — screenId (ex: "screen:settings")
 * @property {string|null} route    — Caminho atual (ex: "/settings")
 * @property {{ id: string, status: string, assigneeId: string, teamId: string }|null} task
 * @property {{ id: string, managerId: string }|null} team
 *
 * @typedef {Object} DebugEntry
 * @property {string} ruleId
 * @property {string} ruleName
 * @property {number} priority
 * @property {boolean} matched
 * @property {string} reason
 * @property {'allow'|'deny'|'neutral'|null} appliedAction
 *
 * @typedef {Object} EvalResult
 * @property {'allow'|'deny'|'neutral'} decision
 * @property {Rule|null} matchedRule
 * @property {DebugEntry[]} log
 */

// ─────────────────────────────────────────────
// UTILITÁRIO: resolver valor de um campo no contexto
// ─────────────────────────────────────────────

/**
 * Resolve um caminho "user.role" no contexto.
 * Suporta até 2 níveis de profundidade.
 * @param {EvalContext} context
 * @param {string} fieldPath
 * @returns {*}
 */
function resolveField(context, fieldPath) {
  const parts = fieldPath.split('.');
  let current = context;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// ─────────────────────────────────────────────
// AVALIAÇÃO DE UMA CONDIÇÃO
// ─────────────────────────────────────────────

/**
 * @param {Condition} condition
 * @param {EvalContext} context
 * @returns {{ result: boolean, reason: string }}
 */
function evaluateCondition(condition, context) {
  const { field, operator, value } = condition;
  const actual = resolveField(context, field);
  const a = actual;
  const v = value;

  switch (operator) {
    case '==':
      return { result: a == v, reason: `${field}(${a}) == ${v}` };

    case '!=':
      return { result: a != v, reason: `${field}(${a}) != ${v}` };

    case 'in': {
      const arr = Array.isArray(v) ? v : [v];
      return { result: arr.includes(a), reason: `${field}(${a}) in [${arr}]` };
    }

    case 'not_in': {
      const arr = Array.isArray(v) ? v : [v];
      return { result: !arr.includes(a), reason: `${field}(${a}) not_in [${arr}]` };
    }

    case 'includes': {
      const result = Array.isArray(a) && a.includes(v);
      return { result, reason: `${field}([${a}]) includes ${v}` };
    }

    case '>':
      return { result: Number(a) > Number(v), reason: `${field}(${a}) > ${v}` };
    case '<':
      return { result: Number(a) < Number(v), reason: `${field}(${a}) < ${v}` };
    case '>=':
      return { result: Number(a) >= Number(v), reason: `${field}(${a}) >= ${v}` };
    case '<=':
      return { result: Number(a) <= Number(v), reason: `${field}(${a}) <= ${v}` };

    case 'starts_with': {
      const result = typeof a === 'string' && a.startsWith(String(v));
      return { result, reason: `${field}(${a}) starts_with ${v}` };
    }

    case 'exists':
      return { result: a !== null && a !== undefined, reason: `${field} exists` };

    case 'not_exists':
      return { result: a === null || a === undefined, reason: `${field} not_exists` };

    default:
      console.warn(`[RuleEngine] Operador desconhecido: "${operator}"`);
      return { result: false, reason: `Operador desconhecido: ${operator}` };
  }
}

// ─────────────────────────────────────────────
// AVALIAÇÃO DE UMA REGRA
// ─────────────────────────────────────────────

/**
 * @param {Rule} rule
 * @param {EvalContext} context
 * @returns {{ matched: boolean, reason: string }}
 */
function evaluateRule(rule, context) {
  const { conditions, conditionType } = rule;

  if (!conditions || conditions.length === 0) {
    return { matched: false, reason: 'Nenhuma condição definida' };
  }

  const results = conditions.map((c) => evaluateCondition(c, context));

  let matched;
  if (conditionType === 'OR') {
    matched = results.some((r) => r.result);
  } else {
    // AND (padrão)
    matched = results.every((r) => r.result);
  }

  const conditionsReason = results
    .map((r, i) => `[${r.result ? '✓' : '✗'}] ${r.reason}`)
    .join(` ${conditionType || 'AND'} `);

  return { matched, reason: conditionsReason };
}

// ─────────────────────────────────────────────
// ENGINE PRINCIPAL
// ─────────────────────────────────────────────

const DEBUG_KEY = 'acl_debug';

/**
 * Avalia uma lista de regras contra o contexto fornecido.
 * Ordem de avaliação: priority ASC (menor = maior prioridade).
 *
 * @param {Rule[]} rules
 * @param {EvalContext} context
 * @param {{ debug?: boolean }} [options]
 * @returns {EvalResult}
 */
export function evaluateRules(rules, context, options = {}) {
  const isDebug =
    options.debug === true ||
    (typeof localStorage !== 'undefined' && localStorage.getItem(DEBUG_KEY) === 'true');

  const log = /** @type {DebugEntry[]} */ ([]);

  // 1. Filtrar regras ativas
  const activeRules = rules.filter((r) => r.active !== false);

  // 2. Ordenar por priority ASC (menor = maior prioridade)
  const sorted = [...activeRules].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

  if (isDebug) {
    console.groupCollapsed(
      `[ACL] ▶ Avaliando ${context.screen ?? context.route ?? 'contexto'} | role=${context.user?.role} uid=${context.user?.uid}`
    );
    console.log('[ACL] Contexto completo:', context);
    console.log(`[ACL] Regras ativas: ${sorted.length} (de ${rules.length} total)`);
  }

  // 3. Avaliar cada regra em ordem
  for (const rule of sorted) {
    const { matched, reason } = evaluateRule(rule, context);

    const entry = {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority ?? 999,
      matched,
      reason,
      appliedAction: matched ? rule.action?.type ?? rule.action : null,
    };

    log.push(entry);

    if (isDebug) {
      const prefix = matched ? '✓' : '·';
      const action = matched ? ` → ACTION: ${entry.appliedAction}` : '';
      console.log(
        `[ACL] ${prefix} [P${entry.priority}] "${rule.name}"${action}\n      ${reason}`
      );
    }

    if (matched) {
      const decision = rule.action?.type ?? rule.action ?? 'neutral';

      if (isDebug) {
        console.log(
          `%c[ACL] ■ Decisão Final: ${decision.toUpperCase()} (por regra "${rule.name}")`,
          `color: ${decision === 'allow' ? 'green' : decision === 'deny' ? 'red' : 'gray'}`
        );
        console.groupEnd();
      }

      return { decision, matchedRule: rule, log };
    }
  }

  // 4. Nenhuma regra bateu → neutral
  if (isDebug) {
    console.log('[ACL] · Nenhuma regra matched → decision: neutral');
    console.groupEnd();
  }

  return { decision: 'neutral', matchedRule: null, log };
}

/**
 * Helper para criar uma regra no formato correto.
 * @param {Partial<Rule>} partial
 * @returns {Rule}
 */
export function createRule(partial) {
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name ?? 'Nova Regra',
    description: partial.description ?? '',
    active: partial.active ?? true,
    priority: partial.priority ?? 100,
    conditionType: partial.conditionType ?? 'AND',
    conditions: partial.conditions ?? [],
    action: partial.action ?? { type: 'neutral', target: '*' },
  };
}

/**
 * Valida uma regra e retorna lista de erros.
 * @param {Rule} rule
 * @returns {string[]}
 */
export function validateRule(rule) {
  const errors = [];
  if (!rule.id) errors.push('id é obrigatório');
  if (!rule.name) errors.push('name é obrigatório');
  if (!rule.action?.type) errors.push('action.type é obrigatório (allow | deny | neutral)');
  if (!['allow', 'deny', 'neutral'].includes(rule.action?.type)) {
    errors.push(`action.type inválido: "${rule.action?.type}"`);
  }
  if (!['AND', 'OR'].includes(rule.conditionType)) {
    errors.push(`conditionType inválido: "${rule.conditionType}"`);
  }
  if (!rule.conditions || rule.conditions.length === 0) {
    errors.push('Pelo menos uma condition é necessária');
  }
  return errors;
}
