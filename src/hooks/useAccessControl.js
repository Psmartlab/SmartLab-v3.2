import { useMemo, useCallback } from 'react';
import { useAccessControlContext } from '../contexts/AccessControlContext';
import { evaluateRules } from '../services/ruleEngine';
import { SCREEN_REGISTRY } from '../constants/screenPermissions';
import { normalizeRole } from '../utils/roles';

/**
 * useAccessControl(user)
 *
 * Hook central que combina duas fases de avaliação:
 *
 * FASE 1 — RBAC
 *   Consulta rolePermissions[permissionKey][role]
 *   Resultado: true | false | undefined (permissão não configurada = false por padrão)
 *
 * FASE 2 — Rule Engine
 *   Avalia regras dinâmicas da coleção `rules/`
 *   Resultado: 'allow' | 'deny' | 'neutral'
 *   As regras PODEM sobrescrever o RBAC (regras têm última palavra)
 *
 * RESOLUÇÃO FINAL:
 *   1. Se fase 1 = deny E fase 2 = neutral → DENIED
 *   2. Se fase 2 = allow → ALLOWED (sobrescreve o RBAC)
 *   3. Se fase 2 = deny  → DENIED (sobrescreve o RBAC)
 *   4. Se fase 2 = neutral → resultado da fase 1
 *
 * @param {object} user — objeto completo do usuário autenticado
 * @returns {{ canAccessScreen, can, getDebugTrace, aclLoading }}
 */
export function useAccessControl(user) {
  const { rolePermissions, screenRules, aclLoading } = useAccessControlContext();

  // Normaliza o role do usuário para o formato canônico via utils
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);

  // Contexto base rico para o Rule Engine
  const buildContext = useCallback(
    (screenId = null, extraContext = {}) => ({
      user: {
        uid: user?.uid ?? null,
        email: user?.email ?? null,
        role: normalizedRole,
        teamIds: user?.teamIds ?? [],
        projectIds: user?.projectIds ?? [],
        isDemo: user?.isDemo ?? false,
      },
      screen: screenId,
      route: screenId ? SCREEN_REGISTRY[screenId]?.path ?? null : null,
      task: extraContext.task ?? null,
      team: extraContext.team ?? null,
      ...extraContext,
    }),
    [user, normalizedRole]
  );

  /**
   * Avalia a permissão de uma chave genérica (permissionKey ou permissionId) via RBAC.
   * @param {string} permissionKey — ex: "nav.settings", "tasks.delete"
   * @returns {boolean}
   */
  const evalRBAC = useCallback(
    (permissionKey) => {
      const permMap = rolePermissions[permissionKey];
      if (!permMap) return false; // permissão não configurada = negar por padrão
      return permMap[normalizedRole] === true;
    },
    [rolePermissions, normalizedRole]
  );

  /**
   * Resolve acesso final combinando RBAC + Rule Engine.
   * @param {string} permissionKey
   * @param {object} context
   * @returns {{ allowed: boolean, phase1: boolean, phase2Result: EvalResult }}
   */
  const resolveAccess = useCallback(
    (permissionKey, context) => {
      // Fase 1 — RBAC
      const rbacAllow = evalRBAC(permissionKey);

      // Fase 2 — Rule Engine
      const phase2Result = evaluateRules(screenRules, context);
      const { decision } = phase2Result;

      let allowed;
      if (decision === 'allow') {
        allowed = true; // Regra sobrescreve RBAC (libera)
      } else if (decision === 'deny') {
        allowed = false; // Regra sobrescreve RBAC (bloqueia)
      } else {
        // neutral → cai no RBAC
        allowed = rbacAllow;
      }

      return { allowed, phase1: rbacAllow, phase2Result };
    },
    [evalRBAC, screenRules]
  );

  /**
   * Verifica se o usuário pode acessar uma tela pelo screenId.
   * @param {string} screenId — ex: "screen:settings"
   * @param {object} [extraContext] — contexto adicional (task, team, etc.)
   * @returns {boolean}
   */
  const canAccessScreen = useCallback(
    (screenId, extraContext = {}) => {
      if (!user) return false;
      const screen = SCREEN_REGISTRY[screenId];
      if (!screen) return false;

      // ── Admin: acesso irrestrito a todas as telas ──────────────────────
      if (normalizedRole === 'Admin') return true;
      // ─────────────────────────────────────────────────────────────────

      // ─────────────────────────────────────────────────────────────────

      const context = buildContext(screenId, extraContext);
      const { allowed } = resolveAccess(screen.permissionKey, context);
      return allowed;
    },
    [user, normalizedRole, buildContext, resolveAccess]
  );

  /**
   * Verifica uma permissão granular (botões, campos, ações).
   * @param {string} permissionKey — ex: "tasks.delete", "users.edit_role"
   * @param {object} [extraContext]
   * @returns {boolean}
   */
  const can = useCallback(
    (permissionKey, extraContext = {}) => {
      if (!user) return false;
      const context = buildContext(null, extraContext);
      const { allowed } = resolveAccess(permissionKey, context);
      return allowed;
    },
    [user, buildContext, resolveAccess]
  );

  /**
   * Retorna o trace completo de avaliação para debug.
   * @param {string} screenId
   * @param {object} [extraContext]
   * @returns {{ allowed: boolean, phase1: boolean, phase2: EvalResult, context: object }}
   */
  const getDebugTrace = useCallback(
    (screenId, extraContext = {}) => {
      const screen = SCREEN_REGISTRY[screenId];
      if (!screen) return { allowed: false, phase1: false, phase2: null, context: null };

      const context = buildContext(screenId, extraContext);
      const result = resolveAccess(screen.permissionKey, context);

      return {
        screenId,
        permissionKey: screen.permissionKey,
        role: normalizedRole,
        allowed: result.allowed,
        phase1_rbac: result.phase1,
        phase2_rules: result.phase2Result,
        context,
      };
    },
    [buildContext, resolveAccess, normalizedRole]
  );

  return {
    /** true se as regras do Firestore ainda estão carregando */
    aclLoading,
    /** Verifica acesso a uma tela por screenId */
    canAccessScreen,
    /** Verifica permissão granular por permissionKey */
    can,
    /** Retorna trace completo para debug */
    getDebugTrace,
    /** Role normalizado do usuário atual */
    normalizedRole,
  };
}
