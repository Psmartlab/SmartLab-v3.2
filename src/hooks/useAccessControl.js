import { useCallback, useMemo } from 'react';
import { useAccessControlContext } from '../contexts/AccessControlContext';
import { evaluateRules } from '../services/ruleEngine';
import { normalizeRole } from '../utils/roles';
import { SCREEN_REGISTRY } from '../constants/screenPermissions';

/**
 * useAccessControl
 * Hook refinado para controle de acesso (ACL).
 * Combina RBAC (Firestore settings/rolePermissions) com Rule Engine dinâmico.
 * 
 * Ordem de Resolução:
 * 1. RBAC (Base): Verifica rolePermissions[key][role]
 * 2. Rules (Dinâmico): Avalia regras via evaluateRules
 * 3. Decisão Final: 'allow' força true, 'deny' força false, 'neutral' usa RBAC.
 */
export function useAccessControl(user) {
  const { rolePermissions, screenRules, aclLoading } = useAccessControlContext();

  // Role canônico: Admin, Gerente de Projeto, Líder de Equipe ou Colaborador
  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);

  /**
   * can(permissionKey, extraContext?)
   * Função base de avaliação de acesso.
   */
  const can = useCallback((permissionKey, extraContext = {}) => {
    if (!user) return false;

    // 1. RBAC (Fallback)
    const rbacDecision = rolePermissions?.[permissionKey]?.[normalizedRole] === true;

    // 2. Rule Engine
    const evalContext = {
      user: {
        ...user,
        role: normalizedRole,
        uid: user.uid,
        email: user.email,
        teamIds: user.teamIds || [],
        projectIds: user.projectIds || [],
      },
      permissionKey,
      ...extraContext
    };

    const { decision } = evaluateRules(screenRules, evalContext);

    // 3. Resolução
    if (decision === 'allow') return true;
    if (decision === 'deny') return false;
    
    // neutral -> fallback para RBAC
    return rbacDecision;
  }, [user, normalizedRole, rolePermissions, screenRules]);

  /**
   * canAccessScreen(screenId, extraContext?)
   * Atalho para telas. Por padrão usa o id da tela como permissionKey.
   */
  const canAccessScreen = useCallback((screenId, extraContext = {}) => {
    const permissionKey = SCREEN_REGISTRY[screenId]?.permissionKey || screenId;
    return can(permissionKey, { screen: screenId, ...extraContext });
  }, [can]);

  /**
   * getDebugTrace(permissionKey, extraContext?)
   * Retorna detalhes da avaliação para depuração.
   */
  const getDebugTrace = useCallback((permissionKey, extraContext = {}) => {
    const rbacDecision = rolePermissions?.[permissionKey]?.[normalizedRole] === true;

    const evalContext = {
      user: {
        ...user,
        role: normalizedRole,
        uid: user?.uid,
        email: user?.email,
      },
      permissionKey,
      ...extraContext
    };

    const { decision, matchedRule, log } = evaluateRules(screenRules, evalContext);

    return {
      permissionKey,
      normalizedRole,
      rbacDecision,
      ruleDecision: decision,
      finalDecision: decision === 'allow' ? true : (decision === 'deny' ? false : rbacDecision),
      matchedRule,
      log,
      context: evalContext
    };
  }, [user, normalizedRole, rolePermissions, screenRules]);

  return {
    canAccessScreen,
    can,
    getDebugTrace,
    aclLoading
  };
}
