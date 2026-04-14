import {
  LayoutDashboard,
  CheckSquare,
  Shield,
  ClipboardCheck,
  Users,
  FolderOpen,
  UserCog,
  Bell,
  Settings,
  Database,
} from 'lucide-react';

/**
 * SCREEN_REGISTRY
 * Fonte de verdade declarativa de todas as telas do sistema.
 *
 * screenId     — chave única prefixada com "screen:"
 * permissionKey — referência ao mapa roles em settings/rolePermissions
 * sidebar      — aparece na sidebar desktop
 * mobile       — aparece no bottom nav mobile
 * dividerBefore — renderiza separador antes desta tela na sidebar
 */
export const SCREEN_REGISTRY = {
  'screen:dashboard': {
    label: 'Dashboard',
    path: '/',
    permissionKey: 'nav.dashboard',
    icon: LayoutDashboard,
    sidebar: true,
    mobile: true,
    order: 1,
  },
  'screen:tasks': {
    label: 'Minhas Tarefas',
    path: '/tasks',
    permissionKey: 'nav.tasks',
    icon: CheckSquare,
    sidebar: true,
    mobile: true,
    order: 2,
  },
  'screen:checkins': {
    label: 'Check-ins',
    path: '/checkins',
    permissionKey: 'nav.checkins',
    icon: Shield,
    sidebar: true,
    mobile: false,
    order: 3,
  },
  'screen:control': {
    label: 'Gestão de Tarefas',
    path: '/control',
    permissionKey: 'nav.control',
    icon: ClipboardCheck,
    sidebar: true,
    mobile: true,
    order: 4,
    dividerBefore: true,
  },
  'screen:teams': {
    label: 'Equipes',
    path: '/teams',
    permissionKey: 'nav.teams',
    icon: Users,
    sidebar: true,
    mobile: false,
    order: 5,
  },
  'screen:projects': {
    label: 'Projetos',
    path: '/projects',
    permissionKey: 'nav.projects',
    icon: FolderOpen,
    sidebar: true,
    mobile: false,
    order: 6,
  },
  'screen:users': {
    label: 'Usuários',
    path: '/users',
    permissionKey: 'nav.users',
    icon: UserCog,
    sidebar: true,
    mobile: false,
    order: 7,
  },
  'screen:notifications': {
    label: 'Notificações',
    path: '/notifications',
    permissionKey: 'nav.notifications',
    icon: Bell,
    sidebar: false,
    mobile: false,
    order: 8,
  },
  'screen:settings': {
    label: 'Configurações',
    path: '/settings',
    permissionKey: 'nav.settings',
    icon: Settings,
    sidebar: false,
    mobile: false,
    order: 9,
  },
  'screen:seed': {
    label: 'Seed / Dados Demo',
    path: '/seed',
    permissionKey: 'nav.seed',
    icon: Database,
    sidebar: true,
    mobile: false,
    order: 10,
    dividerBefore: true,
  },
};

/**
 * Retorna as telas ordenadas para sidebar, filtradas por um predicado.
 * @param {(screenId: string, screen: object) => boolean} filterFn
 */
export function getSidebarScreens(filterFn) {
  return Object.entries(SCREEN_REGISTRY)
    .filter(([id, screen]) => screen.sidebar && filterFn(id, screen))
    .sort(([, a], [, b]) => a.order - b.order);
}

/**
 * Retorna as telas para o bottom nav mobile.
 * @param {(screenId: string, screen: object) => boolean} filterFn
 */
export function getMobileScreens(filterFn) {
  return Object.entries(SCREEN_REGISTRY)
    .filter(([id, screen]) => screen.mobile && filterFn(id, screen))
    .sort(([, a], [, b]) => a.order - b.order);
}

/**
 * Retorna o screenId para um path dado.
 * @param {string} path
 */
export function getScreenIdByPath(path) {
  const entry = Object.entries(SCREEN_REGISTRY).find(([, s]) => s.path === path);
  return entry ? entry[0] : null;
}
