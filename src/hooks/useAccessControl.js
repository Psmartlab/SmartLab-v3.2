import { useMemo, useCallback } from 'react';
import { useAccessControlContext } from '../contexts/AccessControlContext';
import { evaluateRules } from '../services/ruleEngine';
import { SCREEN_REGISTRY } from '../constants/screenPermissions';
import { normalizeRole } from '../utils/roles';

/**
 * useAccessControl(user)
 *
 * Hook central que combina RBAC (Firestore settings/rolePermissions)
 * com o Motor de Regras dinâmico (rules/).
 *
 * Lógica de Resolução:
 *  1. RBAC (Fase 1): Verifica rolePermissions[permissionKey][normalizedRole].
 *  2. Rules (Fase 2): Executa evaluateRules(screenRules, context).
 *  3. Decisão Final:
 *     - Rule 'allow' -> True (Sobrescreve RBAC)
 *     - Rule 'deny'  -> False (Sobrescreve RBAC)
 *     - Rule 'neutral' -> Respeita o RBAC
 *
 * @param {object} user - Objeto do usuário autenticado.
 * @returns {{ canAccessScreen, can, getDebugTrace, aclLoading }}
 */
export function useAccessControl(user) {
  const { rolePermissions, screenRules, aclLoading } = useAccessControlContext();

  // Normalização do role para Admin, Gerente de Projeto, Líder de Equipe ou Colaborador.
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);

  /**
   * Constrói o contexto de avaliação para o Rule Engine.
   */
  const buildEvalContext = useCallback(
    (screenId, extraContext = {}) => ({
      user: {
        uid: user?.uid || '',
        email: user?.email || '',
        role: normalizedRole,
        teamIds: user?.teamIds || [],
        projectIds: user?.projectIds || [],
        isDemo: Boolean(user?.isDemo),
      },
      screen: screenId || null,
      route: window.location?.pathname || null,
      ...extraContext,
    }),
    [user, normalizedRole]
  );

  /**
   * Resolve a permissão final combinando RBAC e Rules.
   */
  const resolveFinalDecision = useCallback(
    (permissionKey, context) => {
      // Fase 1: RBAC
      const rbacAllowed = Boolean(rolePermissions?.[permissionKey]?.[normalizedRole]);

      // Fase 2: Rules
      const { decision, log } = evaluateRules(screenRules, context);

      let finalDecision = false;
      if (decision === 'allow') {
        finalDecision = true;
      } else if (decision === 'deny') {
        finalDecision = false;
      } else {
        // neutral -> fallback para RBAC
        finalDecision = rbacAllowed;
      }

      return {
        rbacDecision: rbacAllowed,
        ruleDecision: decision,
        finalDecision,
        ruleLog: log,
      };
    },
    [rolePermissions, screenRules, normalizedRole]
  );

  /**
   * canAccessScreen(screenId, extraContext?)
   * Atalho para verificar acesso a uma tela específica.
   */
  const canAccessScreen = useCallback(
    (screenId, extraContext = {}) => {
      if (!user) return false;
      
      const screenEntry = SCREEN_REGISTRY[screenId];
      const permissionKey = screenEntry?.permissionKey || screenId;
      
      const context = buildEvalContext(screenId, extraContext);
      const { finalDecision } = resolveFinalDecision(permissionKey, context);
      
      return finalDecision;
    },
    [user, buildEvalContext, resolveFinalDecision]
  );

  /**
   * can(permissionKey, extraContext?)
   * Verificação genérica de permissão.
   */
  const can = useCallback(
    (permissionKey, extraContext = {}) => {
      if (!user) return false;
      
      const context = buildEvalContext(null, extraContext);
      const { finalDecision } = resolveFinalDecision(permissionKey, context);
      
      return finalDecision;
    },
    [user, buildEvalContext, resolveFinalDecision]
  );

  /**
   * getDebugTrace(screenId, extraContext?)
   * Retorna os detalhes da avaliação para ferramentas de diagnóstico.
   */
  const getDebugTrace = useCallback(
    (screenId, extraContext = {}) => {
      const screenEntry = SCREEN_REGISTRY[screenId];
      const permissionKey = screenEntry?.permissionKey || screenId;
      const context = buildEvalContext(screenId, extraContext);
      
      const result = resolveFinalDecision(permissionKey, context);
      
      return {
        rbacDecision: result.rbacDecision,
        ruleDecision: result.ruleDecision,
        finalDecision: result.finalDecision,
        normalizedRole,
        permissionKey,
        ruleLog: result.ruleLog,
        context,
      };
    },
    [buildEvalContext, resolveFinalDecision, normalizedRole]
  );

  return {
    canAccessScreen,
    can,
    getDebugTrace,
    aclLoading,
    normalizedRole, // Útil para UIs que precisam do role pronto
  };
}
