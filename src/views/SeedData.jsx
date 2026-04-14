import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const SeedData = () => {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleSeed = async () => {
    setStatus('loading');
    setLog([]);
    try {
      addLog("Iniciando semeadura de dados...");

      // 0. Limpar Coleções Antigas
      const colsToClear = ['teams', 'users', 'projects', 'tasks', 'notifications', 'checkins', 'gantt_items'];
      for (const colName of colsToClear) {
        addLog(`Limpando coleção: ${colName}...`);
        const snapshot = await getDocs(collection(db, colName));
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, colName, docSnap.id));
        }
      }

      // 1. Usuários
      const users = [
        { id: 'henrique@smartlab.com.br', name: 'Henrique Admin (Demo)', email: 'henrique@smartlab.com.br', role: 'Admin', teamIds: ['eng-team', 'design-team'], projectIds: ['proj-gestor', 'proj-x'] },
        { id: 'gerente@smartlab.com.br', name: 'Carlos Gerente (Demo)', email: 'gerente@smartlab.com.br', role: 'Gerente', teamIds: ['eng-team'], projectIds: ['proj-gestor'] },
        { id: 'usuario@smartlab.com.br', name: 'Ana Operacional (Demo)', email: 'usuario@smartlab.com.br', role: 'User', teamIds: ['design-team', 'eng-team'], projectIds: ['proj-gestor', 'proj-x'] },
        { id: 'bruno@test.com', name: 'Bruno Backend', email: 'bruno@test.com', role: 'User', teamIds: ['eng-team'], projectIds: ['proj-gestor'] },
        { id: 'clara@test.com', name: 'Clara Mkt', email: 'clara@test.com', role: 'User', teamIds: ['marketing-team'], projectIds: ['proj-x'] }
      ];

      for (const u of users) {
        await setDoc(doc(db, 'users', u.id), {
          name: u.name,
          email: u.email,
          role: u.role,
          teamIds: u.teamIds || [],
          projectIds: u.projectIds || [],
          createdAt: serverTimestamp()
        });
        addLog(`Usuário ${u.name} criado.`);
      }

      // 2. Equipes
      const teams = [
        { id: 'eng-team', name: 'Engineering', description: 'Desenvolvimento e Infraestrutura', manager: 'gerente@smartlab.com.br', members: ['bruno@test.com', 'usuario@smartlab.com.br', 'henrique@smartlab.com.br'] },
        { id: 'design-team', name: 'Design', description: 'UI/UX e Identidade Visual', manager: 'henrique@smartlab.com.br', members: ['usuario@smartlab.com.br'] },
        { id: 'marketing-team', name: 'Marketing', description: 'Crescimento e Conteúdo', manager: 'henrique@smartlab.com.br', members: ['clara@test.com'] }
      ];

      for (const t of teams) {
        await setDoc(doc(db, 'teams', t.id), {
          name: t.name,
          description: t.description,
          manager: t.manager,
          members: t.members,
          createdAt: serverTimestamp()
        });
        addLog(`Equipe ${t.name} criada.`);
      }

      // 3. Projetos
      const projects = [
        { id: 'proj-gestor', name: 'GestorADM', title: 'GestorADM', status: 'Active', owners: ['henrique@smartlab.com.br'], userIds: ['gerente@smartlab.com.br', 'usuario@smartlab.com.br', 'bruno@test.com'] },
        { id: 'proj-x', name: 'Projeto X (Inovação)', title: 'Projeto X (Inovação)', status: 'Planning', owners: ['henrique@smartlab.com.br'], userIds: ['usuario@smartlab.com.br', 'clara@test.com'] }
      ];

      for (const p of projects) {
        await setDoc(doc(db, 'projects', p.id), {
          name: p.name,
          title: p.name,
          status: p.status,
          owners: p.owners,
          userIds: p.userIds,
          createdAt: serverTimestamp()
        });
        addLog(`Projeto ${p.name} criado.`);
      }

      // 4. Tarefas
      const tasks = [
        { title: 'Refatorar Login', description: 'Otimizar chamadas ao Firebase Auth', status: 'IN_PROGRESS', priority: 'Alta', teamId: 'eng-team', projectId: 'proj-gestor', assignee: 'gerente@smartlab.com.br' },
        { title: 'Criar Landing Page', description: 'Page building on staging', status: 'DONE', priority: 'Media', teamId: 'design-team', projectId: 'proj-gestor', assignee: 'usuario@smartlab.com.br' },
        { title: 'Configurar DB', description: 'Firestore indexes', status: 'TODO', priority: 'Alta', teamId: 'eng-team', projectId: 'proj-gestor', assignee: 'bruno@test.com' },
        { title: 'Validação de Segurança', description: 'Rules and permissions', status: 'UNDER_REVIEW', priority: 'Alta', teamId: 'eng-team', projectId: 'proj-gestor', assignee: 'usuario@smartlab.com.br' },
        { title: 'Campanha Social', description: 'Meta ads prep', status: 'TODO', priority: 'Baixa', teamId: 'marketing-team', projectId: 'proj-x', assignee: 'clara@test.com' },
        { title: 'Ajustar Cores', description: 'Theme colors update', status: 'IN_PROGRESS', priority: 'Media', teamId: 'design-team', projectId: 'proj-x', assignee: 'usuario@smartlab.com.br' }
      ];

      for (const t of tasks) {
        await addDoc(collection(db, 'tasks'), {
          ...t,
          createdAt: serverTimestamp()
        });
        addLog(`Tarefa "${t.title}" criada.`);
      }

      // 5. Check-ins
      const checkins = [
        { userName: 'Ana Operacional (Demo)', email: 'usuario@smartlab.com.br', mood: 'Happy', accomplishment: 'Finalizei o CSS do dashboard', teamwork: 'Discuti com Henrique sobre o design', date: new Date().toISOString() },
        { userName: 'Carlos Gerente (Demo)', email: 'gerente@smartlab.com.br', mood: 'Productive', accomplishment: 'Revisão das aprovações da semana', teamwork: 'Ajudei a Ana na sprint', date: new Date().toISOString() }
      ];

      for (const c of checkins) {
        await addDoc(collection(db, 'checkins'), {
          ...c,
          timestamp: serverTimestamp()
        });
        addLog(`Check-in de ${c.userName} criado.`);
      }

      // 6. Gantt Items — GestorADM v3.2
      addLog('Criando estrutura Gantt: GestorADM v3.2...');

      // Nível 0 — Projeto
      const projRef = await addDoc(collection(db, 'gantt_items'), {
        name: 'GestorADM v3.2',
        level: 0,
        parentId: null,
        projectId: '', // será preenchido logo abaixo
        plannedStart: '2026-03-01',
        plannedEnd:   '2026-06-30',
        actualStart:  '2026-03-01',
        actualEnd:    '',
        progress: 45,
        status: 'in_progress',
        assignee: 'henrique@smartlab.com.br',
        priority: 'Alta',
        description: 'Release completa do GestorADM versão 3.2 com Gantt, ACL e novos roles.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const projId = projRef.id;
      await import('firebase/firestore').then(({ updateDoc, doc: fDoc }) =>
        updateDoc(fDoc(db, 'gantt_items', projId), { projectId: projId })
      );
      addLog(`  Projeto criado: ${projId}`);

      // Helper para criar item e retornar id
      const gi = async (data) => {
        const r = await addDoc(collection(db, 'gantt_items'), {
          ...data,
          projectId: projId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return r.id;
      };

      // ── Nível 1: Fase 1 — Backend ──────────────────────────────────
      const f1 = await gi({
        name: 'Fase 1 - Backend',
        level: 1, parentId: projId,
        plannedStart: '2026-03-01', plannedEnd: '2026-04-30',
        actualStart:  '2026-03-01', actualEnd: '',
        progress: 70, status: 'in_progress',
        assignee: 'gerente@smartlab.com.br', priority: 'Alta',
        description: 'Implementação de APIs, banco de dados e segurança.',
      });
      addLog('  Fase 1 - Backend criada.');

      // Nível 2: Entrega 1.1 — API de Autenticação
      const e11 = await gi({
        name: 'API de Autenticação',
        level: 2, parentId: f1,
        plannedStart: '2026-03-01', plannedEnd: '2026-03-21',
        actualStart:  '2026-03-01', actualEnd: '2026-03-20',
        progress: 100, status: 'completed',
        assignee: 'bruno@test.com', priority: 'Alta',
        description: 'JWT, refresh tokens e integração com Firebase Auth.',
      });
      addLog('    Entrega 1.1 criada.');

      // Nível 3: Atividade 1.1.1
      const a111 = await gi({
        name: 'Configurar Firebase Auth',
        level: 3, parentId: e11,
        plannedStart: '2026-03-01', plannedEnd: '2026-03-10',
        actualStart:  '2026-03-01', actualEnd: '2026-03-09',
        progress: 100, status: 'completed',
        assignee: 'bruno@test.com', priority: 'Alta',
        description: 'Providers, regras e onAuthStateChanged.',
      });
      // Nível 4: Tarefa 1.1.1.1
      await gi({
        name: 'Habilitar Google Sign-In',
        level: 4, parentId: a111,
        plannedStart: '2026-03-01', plannedEnd: '2026-03-05',
        actualStart:  '2026-03-01', actualEnd: '2026-03-04',
        progress: 100, status: 'completed',
        assignee: 'bruno@test.com', priority: 'Alta',
        description: 'Configurar OAuth Google no console Firebase.',
      });
      addLog('    Atividade + Tarefa 1.1.1 criadas.');

      // Nível 2: Entrega 1.2 — Regras de Segurança Firestore
      const e12 = await gi({
        name: 'Regras de Segurança Firestore',
        level: 2, parentId: f1,
        plannedStart: '2026-03-24', plannedEnd: '2026-04-11',
        actualStart:  '2026-03-24', actualEnd: '',
        progress: 55, status: 'in_progress',
        assignee: 'gerente@smartlab.com.br', priority: 'Alta',
        description: 'Regras granulares por role e Rule Engine dinâmico.',
      });
      addLog('    Entrega 1.2 criada.');

      // Nível 3: Atividade 1.2.1
      const a121 = await gi({
        name: 'Implementar Rule Engine',
        level: 3, parentId: e12,
        plannedStart: '2026-03-24', plannedEnd: '2026-04-04',
        actualStart:  '2026-03-24', actualEnd: '',
        progress: 60, status: 'in_progress',
        assignee: 'gerente@smartlab.com.br', priority: 'Alta',
        description: 'Fase 1 RBAC + Fase 2 Rule Engine com Firestore.',
      });
      // Nível 4: Tarefa 1.2.1.1
      await gi({
        name: 'Escrever testes de regras',
        level: 4, parentId: a121,
        plannedStart: '2026-03-31', plannedEnd: '2026-04-04',
        actualStart:  '', actualEnd: '',
        progress: 0, status: 'not_started',
        assignee: 'gerente@smartlab.com.br', priority: 'Média',
        description: 'Unit tests para cada cenário de acesso.',
      });
      addLog('    Atividade + Tarefa 1.2.1 criadas.');

      // ── Nível 1: Fase 2 — Frontend ─────────────────────────────────
      const f2 = await gi({
        name: 'Fase 2 - Frontend',
        level: 1, parentId: projId,
        plannedStart: '2026-04-01', plannedEnd: '2026-06-30',
        actualStart:  '2026-04-07', actualEnd: '',
        progress: 20, status: 'in_progress',
        assignee: 'usuario@smartlab.com.br', priority: 'Alta',
        description: 'Interfaces Gantt, ACL, novos roles e design system.',
      });
      addLog('  Fase 2 - Frontend criada.');

      // Nível 2: Entrega 2.1 — Gantt Chart
      const e21 = await gi({
        name: 'Gantt Chart WBS',
        level: 2, parentId: f2,
        plannedStart: '2026-04-07', plannedEnd: '2026-05-16',
        actualStart:  '2026-04-07', actualEnd: '',
        progress: 35, status: 'in_progress',
        assignee: 'usuario@smartlab.com.br', priority: 'Alta',
        description: 'MS-Project style Gantt com 5 níveis WBS e scroll sincronizado.',
      });
      addLog('    Entrega 2.1 criada.');

      // Nível 3: Atividade 2.1.1
      const a211 = await gi({
        name: 'Layout dual-pane',
        level: 3, parentId: e21,
        plannedStart: '2026-04-07', plannedEnd: '2026-04-25',
        actualStart:  '2026-04-07', actualEnd: '',
        progress: 50, status: 'in_progress',
        assignee: 'usuario@smartlab.com.br', priority: 'Alta',
        description: 'Painel WBS esquerdo + timeline direita com scroll sincronizado.',
      });
      // Nível 4: Tarefa 2.1.1.1
      await gi({
        name: 'Sincronizar scroll vertical',
        level: 4, parentId: a211,
        plannedStart: '2026-04-14', plannedEnd: '2026-04-18',
        actualStart:  '2026-04-14', actualEnd: '',
        progress: 80, status: 'in_progress',
        assignee: 'usuario@smartlab.com.br', priority: 'Alta',
        description: 'Usar refs e evento onScroll para sincronizar ambos os painéis.',
      });
      addLog('    Atividade + Tarefa 2.1.1 criadas.');

      // Nível 2: Entrega 2.2 — Design System & Roles
      const e22 = await gi({
        name: 'Design System & Novos Roles',
        level: 2, parentId: f2,
        plannedStart: '2026-05-19', plannedEnd: '2026-06-30',
        actualStart:  '', actualEnd: '',
        progress: 0, status: 'not_started',
        assignee: 'clara@test.com', priority: 'Média',
        description: 'Gerente de Projeto, Líder de Equipe e temas light/dark.',
      });
      addLog('    Entrega 2.2 criada.');

      // Nível 3: Atividade 2.2.1
      const a221 = await gi({
        name: 'Implementar Gerente de Projeto',
        level: 3, parentId: e22,
        plannedStart: '2026-05-19', plannedEnd: '2026-06-06',
        actualStart:  '', actualEnd: '',
        progress: 0, status: 'not_started',
        assignee: 'clara@test.com', priority: 'Média',
        description: 'Novo role com permissões específicas de tela e mock login.',
      });
      // Nível 4: Tarefa 2.2.1.1
      await gi({
        name: 'Adicionar botão demo na tela de login',
        level: 4, parentId: a221,
        plannedStart: '2026-05-19', plannedEnd: '2026-05-23',
        actualStart:  '', actualEnd: '',
        progress: 0, status: 'not_started',
        assignee: 'clara@test.com', priority: 'Baixa',
        description: 'Botão G. Projeto com ícone Briefcase e cor violet.',
      });
      addLog('    Atividade + Tarefa 2.2.1 criadas.');

      addLog('Estrutura Gantt criada com sucesso (21 itens).');

      setStatus('success');

      addLog("Sucesso! Todos os dados foram semeados.");
    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`Erro: ${error.message}`);
    }
  };

  return (
    <div className="flex-col items-center justify-center p-8 gap-6" style={{ minHeight: '80vh', display: 'flex' }}>
      <div className="glass-panel p-8 w-full max-w-lg flex-col gap-4">
        <div className="flex items-center gap-3 mb-4">
          <Database size={32} color="var(--accent-primary)" />
          <h2 style={{ margin: 0 }}>Gerador de Dados de Exemplo</h2>
        </div>
        
        <p className="text-muted">
          Este utilitário irá criar Equipes, Usuários, Projetos e Tarefas fictícias no seu Firestore para que você possa visualizar o Dashboard completo.
        </p>

        <button 
          className="btn btn-primary w-full justify-center p-4" 
          onClick={handleSeed}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : <Database size={18} />}
          {status === 'loading' ? 'Semeando...' : 'Semear Banco de Dados'}
        </button>

        {status !== 'idle' && (
          <div className={`p-4 rounded-lg mt-4 flex-col gap-2 ${status === 'error' ? 'bg-danger-light' : 'bg-success-light'}`} style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
            {log.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {status === 'success' && i === log.length - 1 ? <CheckCircle size={14} color="var(--success)" /> : null}
                {item}
              </div>
            ))}
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center gap-2 text-success mt-2">
            <CheckCircle size={18} />
            <span>Dados carregados com sucesso! Vá para o Dashboard.</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-danger mt-2">
            <AlertCircle size={18} />
            <span>Ocorreu um erro ao carregar os dados. Verifique o console.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeedData;
