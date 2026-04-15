/**
 * Utilitários centralizados de role para o GestorADM.
 *
 * Roles canônicos:
 *   'Admin'             – administrador do sistema
 *   'Gerente de Projeto' – gerencia projetos e entregas
 *   'Líder de Equipe'   – lidera uma equipe operacional
 *   'Colaborador'       – membro / operador
 */

/**
 * Normaliza qualquer string de role para um dos quatro valores canônicos.
 * @param {string|undefined} role
 * @returns {'Admin'|'Gerente de Projeto'|'Líder de Equipe'|'Colaborador'}
 */
export function normalizeRole(role) {
  const r = (role || '').toLowerCase().trim();

  if (r === 'admin' || r === 'administrador') return 'Admin';

  if (
    r === 'gerente de projeto' ||
    r === 'project manager' ||
    r === 'pm'
  ) return 'Gerente de Projeto';

  if (
    r === 'líder de equipe' ||
    r === 'lider de equipe' ||
    r === 'gerente' ||
    r === 'gestor' ||
    r === 'manager' ||
    r === 'team leader' ||
    r === 'team lead'
  ) return 'Líder de Equipe';

  if (
    r === 'colaborador' ||
    r === 'membro' ||
    r === 'member' ||
    r === 'user' ||
    r === 'usuario' ||
    r === 'usuário'
  ) return 'Colaborador';

  return 'Colaborador';
}

/**
 * Verifica se o role corresponde a Admin.
 * @param {string|undefined} role
 */
export const isAdmin = (role) => normalizeRole(role) === 'Admin';

/**
 * Verifica se o role corresponde a Gerente de Projeto.
 * @param {string|undefined} role
 */
export const isProjectManager = (role) => normalizeRole(role) === 'Gerente de Projeto';

/**
 * Verifica se o role corresponde a Líder de Equipe.
 * @param {string|undefined} role
 */
export const isTeamLeader = (role) => normalizeRole(role) === 'Líder de Equipe';

/**
 * Verifica se tem permissão de escrita em projetos
 * (Admin ou Gerente de Projeto).
 * @param {string|undefined} role
 */
export const canWriteProjects = (role) => isAdmin(role) || isProjectManager(role);

/**
 * Verifica se tem permissão administrativa geral
 * (Admin ou Líder de Equipe).
 * @param {string|undefined} role
 */
export const hasAdminAccess = (role) => isAdmin(role) || isTeamLeader(role);
