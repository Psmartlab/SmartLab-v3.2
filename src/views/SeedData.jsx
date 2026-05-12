import React, { useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SCREEN_REGISTRY } from '../constants/screenPermissions';
import {
  demoAuditLogs,
  demoCheckins,
  demoNotifications,
  demoProjects,
  demoRules,
  demoSettings,
  demoTasks,
  demoTeams,
  demoUsers,
  isDemoUser,
} from '../services/demoData';

const collectionsToClear = [
  'teams',
  'users',
  'projects',
  'tasks',
  'notifications',
  'checkins',
  'gantt_items',
  'audit_logs',
  'rules',
];

const writeCollection = async (name, rows, addLog) => {
  addLog(`Gravando ${rows.length} registros em ${name}...`);
  for (const row of rows) {
    const { id, ...data } = row;
    await setDoc(doc(db, name, id), {
      ...data,
      seededAt: serverTimestamp(),
    }, { merge: false });
  }
};

const buildRolePermissions = () => {
  const rolePermissionsData = {};

  Object.values(SCREEN_REGISTRY).forEach((screen) => {
    const pk = screen.permissionKey;
    if (!pk) return;

    rolePermissionsData[pk] = {
      Admin: true,
      'Gerente de Projeto': ['nav.dashboard', 'nav.tasks', 'nav.checkins', 'nav.control', 'nav.projects'].includes(pk),
      'Lider de Equipe': ['nav.dashboard', 'nav.tasks', 'nav.checkins', 'nav.control', 'nav.teams'].includes(pk),
      'Líder de Equipe': ['nav.dashboard', 'nav.tasks', 'nav.checkins', 'nav.control', 'nav.teams'].includes(pk),
      Colaborador: ['nav.dashboard', 'nav.tasks', 'nav.checkins', 'nav.projects'].includes(pk),
    };
  });

  return rolePermissionsData;
};

const SeedData = ({ user }) => {
  const [status, setStatus] = useState('idle');
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const summary = useMemo(() => ({
    users: demoUsers.length,
    teams: demoTeams.length,
    projects: demoProjects.length,
    tasks: demoTasks.length,
    checkins: demoCheckins.length,
    notifications: demoNotifications.length,
    auditLogs: demoAuditLogs.length,
    rules: demoRules.length,
  }), []);

  const handleSeed = async () => {
    setStatus('loading');
    setLog([]);

    if (isDemoUser(user)) {
      setLog([
        'Modo demonstracao ativo.',
        `Dataset local pronto: ${summary.users} usuarios, ${summary.teams} equipes, ${summary.projects} projetos, ${summary.tasks} itens WBS/tarefas.`,
        `${summary.checkins} check-ins, ${summary.notifications} notificacoes, ${summary.auditLogs} logs e ${summary.rules} regras de acesso disponiveis para navegacao.`,
        'Nenhuma gravacao foi enviada ao Firebase porque este acesso e demonstrativo.',
      ]);
      setStatus('success');
      return;
    }

    try {
      addLog('Iniciando seed operacional completo...');

      for (const collectionName of collectionsToClear) {
        addLog(`Limpando colecao: ${collectionName}...`);
        const snapshot = await getDocs(collection(db, collectionName));
        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, collectionName, docSnap.id));
        }
      }

      await writeCollection('users', demoUsers, addLog);
      await writeCollection('teams', demoTeams, addLog);
      await writeCollection('projects', demoProjects, addLog);
      await writeCollection('gantt_items', demoTasks, addLog);
      await writeCollection('checkins', demoCheckins, addLog);
      await writeCollection('notifications', demoNotifications, addLog);
      await writeCollection('audit_logs', demoAuditLogs, addLog);
      await writeCollection('rules', demoRules, addLog);

      addLog('Configurando settings/businessLogic...');
      await setDoc(doc(db, 'settings', 'businessLogic'), demoSettings.businessLogic);

      addLog('Configurando settings/security...');
      await setDoc(doc(db, 'settings', 'security'), demoSettings.security);

      addLog('Configurando settings/notifications...');
      await setDoc(doc(db, 'settings', 'notifications'), demoSettings.notifications);

      addLog('Configurando settings/theme...');
      await setDoc(doc(db, 'settings', 'theme'), demoSettings.theme);

      addLog('Configurando settings/data...');
      await setDoc(doc(db, 'settings', 'data'), demoSettings.data);

      addLog('Configurando settings/rolePermissions...');
      await setDoc(doc(db, 'settings', 'rolePermissions'), buildRolePermissions());

      addLog('Seed completo finalizado com sucesso.');
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`Erro: ${error.message}`);
    }
  };

  const handleMigrate = async () => {
    setStatus('loading');
    setLog([]);

    if (isDemoUser(user)) {
      setLog([
        'Modo demonstracao ativo.',
        'Migracao simulada: o dataset atual ja usa gantt_items e WBS de niveis 0 a 4.',
        'Nenhuma gravacao foi enviada ao Firebase.',
      ]);
      setStatus('success');
      return;
    }

    try {
      addLog('Regravando gantt_items com o dataset demo completo...');
      const snapshot = await getDocs(collection(db, 'gantt_items'));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'gantt_items', docSnap.id));
      }
      await writeCollection('gantt_items', demoTasks, addLog);
      addLog(`Migracao concluida: ${demoTasks.length} itens WBS/tarefas ativos.`);
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      addLog(`Erro na migracao: ${error.message}`);
    }
  };

  return (
    <div className="flex-col items-center justify-center p-8 gap-6" style={{ minHeight: '80vh', display: 'flex' }}>
      <div className="glass-panel p-8 w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3 mb-4">
          <Database size={32} color="var(--accent-primary)" />
          <h2 style={{ margin: 0 }}>Gerador de Dados Demo Intensivo</h2>
        </div>

        <p className="text-muted">
          Cria um ambiente completo de simulacao com todos os tipos de usuarios, equipes, projetos, tarefas, status,
          prioridades, check-ins, notificacoes, logs, regras de acesso e configuracoes.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
          {[
            ['Usuarios', summary.users],
            ['Equipes', summary.teams],
            ['Projetos', summary.projects],
            ['Tarefas/WBS', summary.tasks],
            ['Check-ins', summary.checkins],
            ['Notificacoes', summary.notifications],
            ['Logs', summary.auditLogs],
            ['Regras', summary.rules],
          ].map(([label, value]) => (
            <div key={label} className="p-3 rounded-xl border-2 border-smartlab-border bg-smartlab-surface-low text-center">
              <div className="text-2xl font-black text-smartlab-on-surface">{value}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">{label}</div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-primary w-full justify-center p-4"
          onClick={handleSeed}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : <Database size={18} />}
          {status === 'loading' ? 'Semeando...' : 'Semear Ambiente Demo Completo'}
        </button>

        <button
          className="btn w-full justify-center p-4 mt-2"
          style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--on-surface)' }}
          onClick={handleMigrate}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? <Loader2 className="animate-spin" /> : <Database size={18} />}
          Recriar somente gantt_items
        </button>

        {status !== 'idle' && (
          <div
            className={`p-4 rounded-lg mt-4 flex-col gap-2 ${status === 'error' ? 'bg-danger-light' : 'bg-success-light'}`}
            style={{ maxHeight: '260px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem' }}
          >
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
            <span>Dados demo prontos. Va para Dashboard, Projetos, Tarefas, Usuarios e Controle para testar volume real.</span>
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
