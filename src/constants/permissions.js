// ──────────────────────────────────────────────
// PERMISSION DEFINITIONS
// Every capability the system has, grouped by area
// ──────────────────────────────────────────────
export const ALL_PERMISSIONS = {
  'Navegação': [
    { id: 'nav.dashboard',       label: 'Ver Dashboard',             default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'nav.dashboard.teams', label: 'Dashboard → Equipes',       default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'nav.dashboard.projects', label: 'Dashboard → Projetos',   default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'nav.dashboard.users', label: 'Dashboard → Usuários',      default: { Admin: true,  Gerente: false, User: false } },
    { id: 'nav.tasks',           label: 'Minhas Tarefas',            default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'nav.checkins',        label: 'Check-ins',                 default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'nav.control',         label: 'Gestão de Tarefas',         default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'nav.teams',           label: 'Equipes',                   default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'nav.projects',        label: 'Projetos',                  default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'nav.users',           label: 'Usuários',                  default: { Admin: true,  Gerente: false, User: false } },
    { id: 'nav.notifications',   label: 'Central de Notificações',   default: { Admin: true,  Gerente: false, User: false } },
    { id: 'nav.settings',        label: 'Configurações do Sistema',  default: { Admin: true,  Gerente: false, User: false } },
  ],
  'Tarefas': [
    { id: 'tasks.create',        label: 'Criar tarefas',             default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'tasks.edit_own',      label: 'Editar próprias tarefas',   default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'tasks.edit_all',      label: 'Editar qualquer tarefa',    default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'tasks.delete',        label: 'Excluir tarefas',           default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'tasks.assign',        label: 'Atribuir tarefas a outros', default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'tasks.move_status',   label: 'Mover status (Kanban)',     default: { Admin: true,  Gerente: true,  User: true  } },
  ],
  'Equipes': [
    { id: 'teams.view',          label: 'Ver equipes',               default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'teams.create',        label: 'Criar equipes',             default: { Admin: true,  Gerente: false, User: false } },
    { id: 'teams.edit',          label: 'Editar equipes',            default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'teams.delete',        label: 'Excluir equipes',           default: { Admin: true,  Gerente: false, User: false } },
    { id: 'teams.add_member',    label: 'Adicionar membros',         default: { Admin: true,  Gerente: true,  User: false } },
  ],
  'Projetos': [
    { id: 'projects.view',       label: 'Ver projetos',              default: { Admin: true,  Gerente: true,  User: true  } },
    { id: 'projects.create',     label: 'Criar projetos',            default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'projects.edit',       label: 'Editar projetos',           default: { Admin: true,  Gerente: true,  User: false } },
    { id: 'projects.delete',     label: 'Excluir projetos',          default: { Admin: true,  Gerente: false, User: false } },
  ],
  'Usuários': [
    { id: 'users.view',          label: 'Ver lista de usuários',     default: { Admin: true,  Gerente: false, User: false } },
    { id: 'users.create',        label: 'Criar usuários',            default: { Admin: true,  Gerente: false, User: false } },
    { id: 'users.edit_role',     label: 'Alterar cargo/role',        default: { Admin: true,  Gerente: false, User: false } },
    { id: 'users.disable',       label: 'Desativar usuários',        default: { Admin: true,  Gerente: false, User: false } },
  ],
  'Relatórios e Logs': [
    { id: 'logs.view',           label: 'Ver logs de acesso',        default: { Admin: true,  Gerente: false, User: false } },
    { id: 'logs.delete',         label: 'Apagar logs',               default: { Admin: true,  Gerente: false, User: false } },
    { id: 'reports.view',        label: 'Ver relatórios',            default: { Admin: true,  Gerente: true,  User: false } },
  ],
  'Notificações': [
    { id: 'notif.send',          label: 'Enviar notificações',       default: { Admin: true,  Gerente: false, User: false } },
    { id: 'notif.view_all',      label: 'Ver todas as notificações', default: { Admin: true,  Gerente: false, User: false } },
  ],
};

export const ROLES = ['Admin', 'Gerente', 'User'];
