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
 * Aceita apenas as strings exatas (independente de caixa) sem mapear aliases legados.
 * @param {string|undefined} role
 * @returns {'Admin'|'Gerente de Projeto'|'Líder de Equipe'|'Colaborador'}
 */
export function normalizeRole(role) {
  const r = (role || '').trim().toLowerCase();

  if (r === 'admin') return 'Admin';
  if (r === 'gerente de projeto') return 'Gerente de Projeto';
  if (r === 'líder de equipe' || r === 'lider de equipe') return 'Líder de Equipe';
  if (r === 'colaborador') return 'Colaborador';

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
