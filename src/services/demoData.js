const today = new Date();

const isoDate = (offsetDays = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const statuses = ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE'];
const priorities = ['Baixa', 'Media', 'Alta', 'Critica'];
const moods = [5, 4, 3, 2, 1];

export const isDemoUser = (user) => Boolean(user?.isDemo);
export const makeDemoId = (prefix) => `${prefix}-${Date.now()}`;

export const demoUsers = [
  {
    id: 'henrique@smartlab.com.br',
    uid: 'demo-admin-id',
    name: 'Henrique Admin',
    email: 'henrique@smartlab.com.br',
    role: 'Admin',
    status: 'active',
    teamIds: ['team-growth', 'team-ops', 'team-product'],
    projectIds: ['project-saas', 'project-ops', 'project-mobile'],
  },
  {
    id: 'admin.financeiro@smartlab.com.br',
    uid: 'demo-admin-finance-id',
    name: 'Patricia Financeiro',
    email: 'admin.financeiro@smartlab.com.br',
    role: 'Admin',
    status: 'active',
    teamIds: ['team-finance'],
    projectIds: ['project-finance', 'project-compliance'],
  },
  {
    id: 'pm@smartlab.com.br',
    uid: 'demo-pm-id',
    name: 'Marina Projetos',
    email: 'pm@smartlab.com.br',
    role: 'Gerente de Projeto',
    status: 'active',
    teamIds: ['team-growth', 'team-product'],
    projectIds: ['project-saas', 'project-mobile', 'project-ai'],
  },
  {
    id: 'pm.ops@smartlab.com.br',
    uid: 'demo-pm-ops-id',
    name: 'Rafael Operacoes',
    email: 'pm.ops@smartlab.com.br',
    role: 'Gerente de Projeto',
    status: 'active',
    teamIds: ['team-ops', 'team-support'],
    projectIds: ['project-ops', 'project-customer'],
  },
  {
    id: 'gerente@smartlab.com.br',
    uid: 'demo-leader-id',
    name: 'Carlos Lider',
    email: 'gerente@smartlab.com.br',
    role: 'Lider de Equipe',
    status: 'active',
    teamIds: ['team-ops'],
    projectIds: ['project-ops', 'project-compliance'],
  },
  {
    id: 'lider.produto@smartlab.com.br',
    uid: 'demo-leader-product-id',
    name: 'Bianca Produto',
    email: 'lider.produto@smartlab.com.br',
    role: 'Lider de Equipe',
    status: 'active',
    teamIds: ['team-product'],
    projectIds: ['project-saas', 'project-mobile'],
  },
  {
    id: 'usuario@smartlab.com.br',
    uid: 'demo-user-id',
    name: 'Ana Operacional',
    email: 'usuario@smartlab.com.br',
    role: 'Colaborador',
    status: 'active',
    teamIds: ['team-growth'],
    projectIds: ['project-saas', 'project-ai'],
  },
  {
    id: 'dev.front@smartlab.com.br',
    uid: 'demo-front-id',
    name: 'Lucas Frontend',
    email: 'dev.front@smartlab.com.br',
    role: 'Colaborador',
    status: 'active',
    teamIds: ['team-product'],
    projectIds: ['project-saas', 'project-mobile'],
  },
  {
    id: 'dev.back@smartlab.com.br',
    uid: 'demo-back-id',
    name: 'Joao Backend',
    email: 'dev.back@smartlab.com.br',
    role: 'Colaborador',
    status: 'active',
    teamIds: ['team-product'],
    projectIds: ['project-saas', 'project-ai'],
  },
  {
    id: 'qa@smartlab.com.br',
    uid: 'demo-qa-id',
    name: 'Nina QA',
    email: 'qa@smartlab.com.br',
    role: 'Colaborador',
    status: 'active',
    teamIds: ['team-support', 'team-product'],
    projectIds: ['project-customer', 'project-mobile'],
  },
  {
    id: 'bloqueado@smartlab.com.br',
    uid: 'demo-blocked-id',
    name: 'Conta Bloqueada',
    email: 'bloqueado@smartlab.com.br',
    role: 'Colaborador',
    status: 'blocked',
    teamIds: ['team-support'],
    projectIds: ['project-customer'],
  },
  {
    id: 'expirado@smartlab.com.br',
    uid: 'demo-expired-id',
    name: 'Licenca Expirada',
    email: 'expirado@smartlab.com.br',
    role: 'Colaborador',
    status: 'active',
    expiresAt: isoDate(-15),
    teamIds: ['team-finance'],
    projectIds: ['project-finance'],
  },
];

export const demoTeams = [
  {
    id: 'team-growth',
    name: 'Squad Growth',
    description: 'Comercial, onboarding, ativacao e crescimento.',
    manager: 'gerente@smartlab.com.br',
    members: ['henrique@smartlab.com.br', 'pm@smartlab.com.br', 'usuario@smartlab.com.br'],
    createdAt: isoDate(-90),
    created_at: isoDate(-90),
  },
  {
    id: 'team-ops',
    name: 'Squad Operacoes',
    description: 'Rotinas administrativas, qualidade e gestao operacional.',
    manager: 'gerente@smartlab.com.br',
    members: ['henrique@smartlab.com.br', 'pm.ops@smartlab.com.br', 'gerente@smartlab.com.br'],
    createdAt: isoDate(-84),
    created_at: isoDate(-84),
  },
  {
    id: 'team-product',
    name: 'Squad Produto',
    description: 'Produto, engenharia, design e experiencia do usuario.',
    manager: 'lider.produto@smartlab.com.br',
    members: ['pm@smartlab.com.br', 'lider.produto@smartlab.com.br', 'dev.front@smartlab.com.br', 'dev.back@smartlab.com.br'],
    createdAt: isoDate(-70),
    created_at: isoDate(-70),
  },
  {
    id: 'team-support',
    name: 'Squad Suporte',
    description: 'Atendimento, QA, implantacao e sucesso do cliente.',
    manager: 'pm.ops@smartlab.com.br',
    members: ['pm.ops@smartlab.com.br', 'qa@smartlab.com.br', 'bloqueado@smartlab.com.br'],
    createdAt: isoDate(-55),
    created_at: isoDate(-55),
  },
  {
    id: 'team-finance',
    name: 'Squad Financeiro',
    description: 'Financeiro, contratos, cobranca e compliance.',
    manager: 'admin.financeiro@smartlab.com.br',
    members: ['admin.financeiro@smartlab.com.br', 'expirado@smartlab.com.br'],
    createdAt: isoDate(-40),
    created_at: isoDate(-40),
  },
  {
    id: 'team-ai',
    name: 'Squad IA e Automacao',
    description: 'Automacoes, assistentes internos e analise preditiva.',
    manager: 'pm@smartlab.com.br',
    members: ['pm@smartlab.com.br', 'usuario@smartlab.com.br', 'dev.back@smartlab.com.br'],
    createdAt: isoDate(-25),
    created_at: isoDate(-25),
  },
];

export const demoProjects = [
  {
    id: 'project-saas',
    name: 'Implantacao SaaS Comercial',
    title: 'Implantacao SaaS Comercial',
    area: 'Produto',
    leader: 'Marina Projetos',
    status: 'Ativo',
    progress: 68,
    teamId: 'team-growth',
    owners: ['pm@smartlab.com.br'],
    userIds: ['henrique@smartlab.com.br', 'pm@smartlab.com.br', 'usuario@smartlab.com.br', 'dev.front@smartlab.com.br'],
    createdAt: isoDate(-82),
  },
  {
    id: 'project-ops',
    name: 'Central de Operacoes',
    title: 'Central de Operacoes',
    area: 'Operacoes',
    leader: 'Rafael Operacoes',
    status: 'Ativo',
    progress: 51,
    teamId: 'team-ops',
    owners: ['pm.ops@smartlab.com.br'],
    userIds: ['henrique@smartlab.com.br', 'pm.ops@smartlab.com.br', 'gerente@smartlab.com.br'],
    createdAt: isoDate(-75),
  },
  {
    id: 'project-mobile',
    name: 'Aplicativo Mobile Field Ops',
    title: 'Aplicativo Mobile Field Ops',
    area: 'Mobile',
    leader: 'Bianca Produto',
    status: 'Ativo',
    progress: 39,
    teamId: 'team-product',
    owners: ['pm@smartlab.com.br'],
    userIds: ['pm@smartlab.com.br', 'lider.produto@smartlab.com.br', 'dev.front@smartlab.com.br', 'qa@smartlab.com.br'],
    createdAt: isoDate(-60),
  },
  {
    id: 'project-ai',
    name: 'Automacao com IA',
    title: 'Automacao com IA',
    area: 'IA',
    leader: 'Marina Projetos',
    status: 'Planning',
    progress: 24,
    teamId: 'team-ai',
    owners: ['pm@smartlab.com.br'],
    userIds: ['pm@smartlab.com.br', 'usuario@smartlab.com.br', 'dev.back@smartlab.com.br'],
    createdAt: isoDate(-45),
  },
  {
    id: 'project-finance',
    name: 'Portal Financeiro',
    title: 'Portal Financeiro',
    area: 'Financeiro',
    leader: 'Patricia Financeiro',
    status: 'Ativo',
    progress: 77,
    teamId: 'team-finance',
    owners: ['admin.financeiro@smartlab.com.br'],
    userIds: ['admin.financeiro@smartlab.com.br', 'expirado@smartlab.com.br'],
    createdAt: isoDate(-35),
  },
  {
    id: 'project-customer',
    name: 'Customer Success 360',
    title: 'Customer Success 360',
    area: 'Cliente',
    leader: 'Rafael Operacoes',
    status: 'Ativo',
    progress: 56,
    teamId: 'team-support',
    owners: ['pm.ops@smartlab.com.br'],
    userIds: ['pm.ops@smartlab.com.br', 'qa@smartlab.com.br', 'bloqueado@smartlab.com.br'],
    createdAt: isoDate(-30),
  },
  {
    id: 'project-compliance',
    name: 'Auditoria e Compliance',
    title: 'Auditoria e Compliance',
    area: 'Compliance',
    leader: 'Carlos Lider',
    status: 'Critico',
    progress: 18,
    teamId: 'team-ops',
    owners: ['gerente@smartlab.com.br'],
    userIds: ['gerente@smartlab.com.br', 'admin.financeiro@smartlab.com.br'],
    createdAt: isoDate(-20),
  },
  {
    id: 'project-data',
    name: 'Data Warehouse Executivo',
    title: 'Data Warehouse Executivo',
    area: 'Dados',
    leader: 'Henrique Admin',
    status: 'On Hold',
    progress: 12,
    teamId: 'team-ai',
    owners: ['henrique@smartlab.com.br'],
    userIds: ['henrique@smartlab.com.br', 'dev.back@smartlab.com.br'],
    createdAt: isoDate(-12),
  },
];

const phaseNames = [
  'Descoberta e Planejamento',
  'Arquitetura e Fundacao',
  'Execucao e Integracao',
  'Validacao e Go Live',
];

const deliverables = [
  ['Mapeamento de requisitos', 'Plano operacional'],
  ['Modelo de dados', 'Base de seguranca'],
  ['Interface principal', 'Integracoes criticas'],
  ['Homologacao', 'Treinamento e entrega'],
];

const activityNames = [
  'Levantamento com stakeholders',
  'Prototipacao do fluxo',
  'Implementacao tecnica',
  'Teste e validacao',
  'Documentacao operacional',
  'Ajustes de performance',
  'Revisao de seguranca',
  'Acompanhamento pos-entrega',
];

const statusProgress = {
  TODO: 0,
  IN_PROGRESS: 45,
  UNDER_REVIEW: 88,
  DONE: 100,
};

const assigneePool = demoUsers
  .filter((u) => u.status !== 'blocked')
  .map((u) => u.email);

function makeTask(project, level, parentId, sequence, name, offsets = {}) {
  const status = statuses[sequence % statuses.length];
  const priority = priorities[(sequence + level) % priorities.length];
  const startOffset = offsets.start ?? (-50 + sequence * 2);
  const endOffset = offsets.end ?? (startOffset + 7 + level);
  const done = status === 'DONE';
  const assignee = sequence % 9 === 0 ? null : assigneePool[sequence % assigneePool.length];

  return {
    id: `${project.id}-item-${String(sequence).padStart(3, '0')}`,
    name,
    description: `${name} para ${project.name}. Cenario demo com status ${status}, prioridade ${priority} e nivel WBS ${level}.`,
    level,
    parentId,
    projectId: project.id,
    teamId: project.teamId,
    plannedStart: isoDate(startOffset),
    plannedEnd: isoDate(sequence % 11 === 0 ? -2 - level : endOffset),
    actualStart: status === 'TODO' ? '' : isoDate(startOffset + 1),
    actualEnd: done ? isoDate(endOffset) : '',
    progress: statusProgress[status],
    status,
    priority,
    assignee,
    uploadFolderUrl: sequence % 13 === 0 ? 'https://drive.google.com/demo-folder' : '',
    createdAt: isoDate(startOffset - 3),
    updatedAt: isoDate(Math.min(0, endOffset)),
  };
}

function buildDemoTasks() {
  const tasks = [];
  demoProjects.forEach((project, projectIndex) => {
    const rootStatus = project.status === 'On Hold' ? 'TODO' : (project.status === 'Critico' ? 'IN_PROGRESS' : 'IN_PROGRESS');
    tasks.push({
      id: project.id,
      name: project.name,
      description: `Projeto raiz de ${project.area} para simular portfolio real.`,
      level: 0,
      parentId: null,
      projectId: project.id,
      teamId: project.teamId,
      plannedStart: isoDate(-70 + projectIndex * 6),
      plannedEnd: isoDate(45 + projectIndex * 4),
      actualStart: isoDate(-68 + projectIndex * 6),
      actualEnd: '',
      progress: project.progress,
      status: rootStatus,
      priority: project.status === 'Critico' ? 'Critica' : (projectIndex % 2 ? 'Alta' : 'Media'),
      assignee: project.owners?.[0] || 'henrique@smartlab.com.br',
      createdAt: project.createdAt,
      updatedAt: isoDate(-projectIndex),
    });

    let sequence = 1;
    phaseNames.forEach((phase, phaseIndex) => {
      const phaseId = `${project.id}-phase-${phaseIndex + 1}`;
      const phaseStatus = statuses[(projectIndex + phaseIndex) % statuses.length];
      const phaseStart = -58 + projectIndex * 5 + phaseIndex * 16;
      tasks.push({
        ...makeTask(project, 1, project.id, sequence++, `${phase} - ${project.name}`, {
          start: phaseStart,
          end: phaseStart + 18,
        }),
        id: phaseId,
        status: phaseStatus,
        progress: statusProgress[phaseStatus],
      });

      deliverables[phaseIndex].forEach((deliverable, deliverableIndex) => {
        const deliverableId = `${phaseId}-deliverable-${deliverableIndex + 1}`;
        const deliverableStart = phaseStart + deliverableIndex * 7;
        tasks.push({
          ...makeTask(project, 2, phaseId, sequence++, `${deliverable} - ${project.area}`, {
            start: deliverableStart,
            end: deliverableStart + 10,
          }),
          id: deliverableId,
        });

        for (let i = 0; i < 2; i += 1) {
          const activityId = `${deliverableId}-activity-${i + 1}`;
          const activityName = activityNames[(projectIndex + phaseIndex + deliverableIndex + i) % activityNames.length];
          const activityStart = deliverableStart + i * 4;
          tasks.push({
            ...makeTask(project, 3, deliverableId, sequence++, activityName, {
              start: activityStart,
              end: activityStart + 5,
            }),
            id: activityId,
          });

          tasks.push({
            ...makeTask(project, 4, activityId, sequence++, `Checklist: ${activityName}`, {
              start: activityStart + 1,
              end: activityStart + 3,
            }),
            id: `${activityId}-checklist`,
          });
        }
      });
    });
  });

  tasks.push(
    {
      id: 'orphan-critical-task',
      name: 'Triagem urgente sem projeto',
      description: 'Tarefa orfa para testar visao de nao atribuidas e alertas.',
      level: 1,
      parentId: null,
      projectId: '',
      teamId: 'team-support',
      plannedStart: isoDate(-9),
      plannedEnd: isoDate(-4),
      actualStart: isoDate(-8),
      actualEnd: '',
      progress: 10,
      status: 'TODO',
      priority: 'Critica',
      assignee: null,
      createdAt: isoDate(-10),
      updatedAt: isoDate(-4),
    },
    {
      id: 'orphan-review-task',
      name: 'Validar ajuste emergencial',
      description: 'Tarefa sem projeto em revisao para testar fluxo gerencial.',
      level: 2,
      parentId: null,
      projectId: '',
      teamId: 'team-ops',
      plannedStart: isoDate(-3),
      plannedEnd: isoDate(1),
      actualStart: isoDate(-3),
      actualEnd: '',
      progress: 90,
      status: 'UNDER_REVIEW',
      priority: 'Alta',
      assignee: 'gerente@smartlab.com.br',
      createdAt: isoDate(-4),
      updatedAt: isoDate(0),
    }
  );

  return tasks;
}

export const demoTasks = buildDemoTasks();

export const demoCheckins = Array.from({ length: 24 }, (_, i) => {
  const user = demoUsers[i % demoUsers.length];
  return {
    id: `checkin-${i + 1}`,
    userId: user.uid,
    userEmail: user.email,
    userName: user.name,
    userPhoto: '',
    mood: moods[i % moods.length],
    accomplished: `Conclui atividades operacionais e atualizei ${1 + (i % 5)} itens do meu quadro.`,
    planned: `Priorizar entregas do projeto ${demoProjects[i % demoProjects.length].name}.`,
    blockers: i % 6 === 0 ? 'Aguardando decisao de prioridade.' : (i % 5 === 0 ? 'Dependencia externa em analise.' : ''),
    created_at: isoDate(-(i % 10)),
  };
});

export const demoNotifications = [
  {
    id: 'notif-overdue',
    to: 'henrique@smartlab.com.br',
    from: 'sistema',
    title: 'Tarefas atrasadas detectadas',
    message: 'Existem tarefas criticas fora do prazo no portfolio.',
    type: 'warning',
    read: false,
    createdAt: isoDate(0),
  },
  {
    id: 'notif-review',
    to: 'henrique@smartlab.com.br',
    from: 'usuario@smartlab.com.br',
    title: 'Itens aguardando validacao',
    message: 'Ha entregas em UNDER_REVIEW para aprovacao gerencial.',
    type: 'info',
    read: false,
    createdAt: isoDate(-1),
  },
  {
    id: 'notif-done',
    to: 'pm@smartlab.com.br',
    from: 'sistema',
    title: 'Marco concluido',
    message: 'Um pacote de entregas foi finalizado com sucesso.',
    type: 'success',
    read: true,
    createdAt: isoDate(-2),
  },
  {
    id: 'notif-blocked',
    to: 'admin.financeiro@smartlab.com.br',
    from: 'sistema',
    title: 'Conta bloqueada no ambiente',
    message: 'Usuario de suporte bloqueado mantido para validar controle de acesso.',
    type: 'error',
    read: false,
    createdAt: isoDate(-3),
  },
];

export const demoAuditLogs = Array.from({ length: 48 }, (_, i) => {
  const user = demoUsers[i % demoUsers.length];
  const actions = ['CREATE', 'UPDATE', 'MOVE_STATUS', 'REVIEW', 'LOGIN', 'EXPORT'];
  const targets = ['TASK', 'PROJECT', 'TEAM', 'USER', 'CHECKIN', 'REPORT'];
  return {
    id: `audit-${i + 1}`,
    user: user.email,
    action: actions[i % actions.length],
    target_type: targets[i % targets.length],
    details: `${actions[i % actions.length]} demo em ${targets[i % targets.length]} por ${user.name}.`,
    created_at: isoDate(-(i % 14)),
  };
});

export const demoProfile = (user) => ({
  name: user?.displayName || user?.name || 'Henrique Admin',
  nickname: 'SMARTLAB',
  email: user?.email || 'henrique@smartlab.com.br',
  phone: '(11) 90000-0000',
  whatsapp: '(11) 98888-0000',
  address: 'Unidade SmartLab',
  photo: '',
  bio: 'Perfil de demonstracao para testar dados pessoais, comunicacao e visibilidade operacional.',
});

export const demoSettings = {
  businessLogic: {
    requireAdminValidation: true,
    allowUserTaskCreation: true,
    enableEmailNotifications: true,
    strictProjectVisibility: true,
    autoNotifyLateTasks: true,
    allowUnassignedTasks: true,
    enableAuditLog: true,
  },
  data: {
    autoBackup: true,
    backupFreq: 'daily',
  },
  notifications: {
    taskOverdue: true,
    taskAssigned: true,
    teamUpdate: true,
    projectUpdate: true,
    systemAlerts: true,
    dailyDigest: true,
    digestTime: '08:00',
  },
  security: {
    twoFa: true,
    sessionTimeout: '480',
    allowGoogleOnly: true,
    loginWhitelist: true,
  },
  theme: {
    primaryColor: '#0f172a',
    fontScale: 'normal',
    compactMode: false,
    showAvatars: true,
    darkMode: false,
  },
};

export const demoRules = [
  {
    id: 'rule-demo-admin',
    name: 'Administradores acessam o console',
    description: 'Libera todas as telas administrativas para Admin.',
    active: true,
    priority: 10,
    conditionType: 'AND',
    conditions: [{ field: 'user.role', operator: '==', value: 'Admin' }],
    action: { type: 'allow', target: 'screen' },
  },
  {
    id: 'rule-demo-block-settings',
    name: 'Bloquear configuracoes para colaborador',
    description: 'Cenario de bloqueio explicito no simulador de ACL.',
    active: true,
    priority: 20,
    conditionType: 'AND',
    conditions: [
      { field: 'user.role', operator: '==', value: 'Colaborador' },
      { field: 'screen', operator: '==', value: 'screen:settings' },
    ],
    action: { type: 'deny', target: 'screen' },
  },
  {
    id: 'rule-demo-project-manager',
    name: 'Gerente acessa projetos e controle',
    description: 'Exemplo com operador in para telas operacionais.',
    active: true,
    priority: 30,
    conditionType: 'AND',
    conditions: [
      { field: 'user.role', operator: '==', value: 'Gerente de Projeto' },
      { field: 'screen', operator: 'in', value: ['screen:projects', 'screen:control'] },
    ],
    action: { type: 'allow', target: 'screen' },
  },
];
