import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Shield, Clock, Search, Edit2, History, X, UserPlus, FileText, Crown, Users as UsersIcon, User, ChevronRight, Lock, Briefcase } from 'lucide-react';
import { cn } from '../utils/cn';
import { normalizeRole, isAdmin as _isAdmin, isProjectManager, isTeamLeader } from '../utils/roles';

// Hierarquia e estilos por nível
const HIERARCHY = [
  {
    role: 'Admin',
    label: 'Administradores',
    icon: Crown,
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  {
    role: 'Gerente de Projeto',
    label: 'Gerentes de Projeto',
    icon: Briefcase,
    accent: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
  },
  {
    role: 'Líder de Equipe',
    label: 'Líderes de Equipe',
    icon: UsersIcon,
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    role: 'Colaborador',
    label: 'Colaboradores',
    icon: User,
    accent: 'text-smartlab-on-surface-variant',
    bg: 'bg-smartlab-surface-low',
    border: 'border-smartlab-border',
    badge: 'bg-smartlab-surface text-smartlab-on-surface-variant border-smartlab-border',
    dot: 'bg-smartlab-on-surface-variant',
  },
];


export default function Users({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('Colaborador');
  const [editingUser, setEditingUser] = useState(null);
  const [newUserProjectId, setNewUserProjectId] = useState('');
  const [historyUser, setHistoryUser] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q,
      (snapshot) => { setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); clearTimeout(timer); },
      () => { setLoading(false); clearTimeout(timer); }
    );
    const unsubTeams = onSnapshot(collection(db, 'teams'), (s) => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { clearTimeout(timer); unsub(); unsubTeams(); unsubProjects(); };
  }, []);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    const email = newUserEmail.trim().toLowerCase();
    if (!email) return;
    try {
      await setDoc(doc(db, 'users', email), {
        email, name: 'Aguardando Login', role: newUserRole,
        projectIds: newUserProjectId ? [newUserProjectId] : [],
        invitedAt: serverTimestamp()
      }, { merge: true });
      setIsInviteModalOpen(false);
      setNewUserEmail('');
      setNewUserProjectId('');
    } catch (error) { alert('Erro ao convidar: ' + error.message); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        role: editingUser.role,
        expiresAt: editingUser.expiresAt || null,
        status: editingUser.status,
        teamIds: editingUser.teamIds || [],
        projectIds: editingUser.projectIds || []
      });
      setEditingUser(null);
    } catch (error) { alert('Erro ao atualizar: ' + error.message); }
  };

  const loadUserHistory = async (email) => {
    setHistoryUser(email);
    setAuditLogs([]);
    try {
      const q = query(collection(db, 'audit_logs'), where('user', '==', email));
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0));
      setAuditLogs(logs);
    } catch (e) { alert('Erro ao ler logs: ' + e.message); }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm ||
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 1. Admin vê todos
    if (_isAdmin(user?.role)) return true;

    // 2. Gerente de Projeto vê usuários vinculados aos mesmos projetos
    if (isProjectManager(user?.role) && (u.projectIds || []).some(pid => (user.projectIds || []).includes(pid))) return true;

    // 3. Líder de Equipe vê usuários das mesmas equipes
    if (isTeamLeader(user?.role) && (u.teamIds || []).some(tid => (user.teamIds || []).includes(tid))) return true;

    // 4. Outros veem apenas a si mesmos
    return u.id === user?.id || u.email === (user?.email || auth.currentUser?.email);
  });

  // Agrupa por hierarquia normalizada e ordena alfabeticamente
  const grouped = HIERARCHY.map(h => ({
    ...h,
    members: filteredUsers
      .filter(u => normalizeRole(u.role) === h.role)
      .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'pt-BR')),
  })).filter(g => g.members.length > 0);

  const totalUsers = filteredUsers.length;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Gestão de Usuários</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            {totalUsers} {totalUsers === 1 ? 'usuário cadastrado' : 'usuários cadastrados'} · controle de acessos e permissões
          </p>
        </div>
        <button
          className="flex items-center gap-3 px-8 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95 group"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <UserPlus size={18} className="text-accent group-hover:scale-110 transition-transform" />
          Cadastrar / Convidar
        </button>
      </header>

      {/* Search */}
      <div className="bg-smartlab-surface p-5 rounded-2xl border-2 border-smartlab-border shadow-sm flex items-center gap-4 mb-8 group focus-within:border-smartlab-on-surface transition-all">
        <Search size={18} className="text-smartlab-on-surface-variant group-focus-within:text-smartlab-on-surface transition-colors shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="flex-1 bg-transparent border-none text-smartlab-on-surface font-bold placeholder:text-smartlab-on-surface-variant placeholder:opacity-40 text-sm outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-smartlab-on-surface-variant hover:text-smartlab-on-surface transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">
          Carregando usuários...
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <UsersIcon size={48} className="text-smartlab-border" />
          <p className="text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">
            {searchTerm ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
          </p>
        </div>
      )}

      {/* Grouped user list */}
      <div className="flex flex-col gap-10">
        {grouped.map(group => (
          <section key={group.role}>
            {/* Group header */}
            <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border-2 mb-4', group.bg, group.border)}>
              <group.icon size={18} className={group.accent} />
              <span className={cn('font-black text-xs uppercase tracking-[0.2em]', group.accent)}>
                {group.label}
              </span>
              <span className={cn('ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-black border', group.badge)}>
                {group.members.length}
              </span>
            </div>

            {/* User cards */}
            <div className="flex flex-col gap-2 pl-2">
              {group.members.map((u, idx) => {
                const isExpired = u.expiresAt && new Date(u.expiresAt) < new Date();
                const isBlocked = u.status === 'blocked';
                const statusColor = isBlocked ? 'bg-red-100 text-red-600 border-red-200'
                  : isExpired ? 'bg-amber-100 text-amber-600 border-amber-200'
                  : 'bg-emerald-100 text-emerald-600 border-emerald-200';
                const statusText = isBlocked ? 'Bloqueado' : isExpired ? 'Expirado' : 'Ativo';
                const initials = (u.name || u.email || '?').charAt(0).toUpperCase();
                const userProjects = (u.projectIds || []).map(pid => projects.find(p => p.id === pid)).filter(Boolean);

                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 px-5 py-4 bg-smartlab-surface rounded-2xl border-2 border-smartlab-border hover:border-smartlab-on-surface-variant hover:shadow-md transition-all group"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-smartlab-on-surface flex items-center justify-center text-smartlab-surface font-black text-sm overflow-hidden">
                        {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : initials}
                      </div>
                      <span className={cn('absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-smartlab-surface', group.dot)} />
                    </div>

                    {/* Name & email */}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-smartlab-on-surface text-sm tracking-tight truncate">
                        {u.name && u.name !== 'Aguardando Login' ? u.name : (
                          <span className="italic text-smartlab-on-surface-variant opacity-60">{u.name || 'Sem Nome'}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-smartlab-on-surface-variant opacity-60 uppercase tracking-widest truncate">
                        {u.email}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="hidden md:flex flex-wrap gap-1.5 max-w-[200px]">
                      {userProjects.length > 0 ? (
                        userProjects.slice(0, 3).map(p => (
                          <span key={p.id} className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tight">
                            {p.name || p.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] font-black text-smartlab-on-surface-variant opacity-40 italic">Sem projetos</span>
                      )}
                      {userProjects.length > 3 && (
                        <span className="text-[9px] font-black text-smartlab-on-surface-variant bg-smartlab-surface-low px-2 py-0.5 rounded-lg border border-smartlab-border">
                          +{userProjects.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Expiry */}
                    <div className="hidden lg:block text-[10px] font-bold text-smartlab-on-surface-variant opacity-60 shrink-0">
                      {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('pt-BR') : '∞ Vitalício'}
                    </div>

                    {/* Status badge */}
                    <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0', statusColor)}>
                      {statusText}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Permissions shortcut */}
                      <button
                        type="button"
                        title="Permissões e Acessos"
                        onClick={() => setEditingUser(u)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-smartlab-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 shadow-sm active:scale-95 group/btn"
                      >
                        <Lock size={13} className="group-hover/btn:rotate-12 transition-transform" />
                        <span className="hidden sm:inline">Permissões</span>
                        <ChevronRight size={12} />
                      </button>
                      {/* Audit log */}
                      <button
                        type="button"
                        title="Trilha de Auditoria"
                        onClick={() => loadUserHistory(u.email)}
                        className="p-2.5 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-xl border-2 border-smartlab-border hover:border-smartlab-on-surface hover:text-smartlab-on-surface transition-all"
                      >
                        <History size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* =========== MODAL: Convidar usuário =========== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-smartlab-on-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form className="bg-smartlab-surface rounded-[32px] p-10 border-2 border-smartlab-border shadow-2xl w-full max-w-[440px] relative animate-in fade-in zoom-in duration-300" onSubmit={handleInviteUser}>
            <button type="button" onClick={() => setIsInviteModalOpen(false)} className="absolute top-8 right-8 text-smartlab-on-surface-variant hover:text-smartlab-on-surface transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic mb-2">Novo Usuário</h2>
            <p className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mb-8 leading-relaxed opacity-60">Pré-cadastro para acesso ao sistema via Google Auth.</p>

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">E-mail Corporativo</label>
                <input required type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all placeholder:text-smartlab-on-surface-variant placeholder:opacity-40"
                  placeholder="usuario@empresa.com" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Nível de Acesso</label>
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black uppercase tracking-widest text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all appearance-none cursor-pointer">
                  <option value="Colaborador">Colaborador</option>
                  <option value="Líder de Equipe">Líder de Equipe</option>
                  <option value="Gerente de Projeto">Gerente de Projeto</option>
                  <option value="Admin">Administrador Global</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Projeto Inicial</label>
                <select value={newUserProjectId} onChange={e => setNewUserProjectId(e.target.value)}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black uppercase tracking-widest text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all appearance-none cursor-pointer">
                  <option value="">Selecione um projeto...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
                </select>
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" className="flex-1 py-4 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-smartlab-border transition-all border-2 border-smartlab-border"
                  onClick={() => setIsInviteModalOpen(false)}>Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">
                  Registrar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========== MODAL: Editar permissões =========== */}
      {editingUser && (
        <div className="fixed inset-0 bg-smartlab-on-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form className="bg-smartlab-surface rounded-[32px] p-10 border-2 border-smartlab-border shadow-2xl w-full max-w-[500px] relative animate-in fade-in zoom-in duration-300" onSubmit={handleUpdateUser}>
            <button type="button" onClick={() => setEditingUser(null)} className="absolute top-8 right-8 text-smartlab-on-surface-variant hover:text-smartlab-on-surface transition-colors">
              <X size={24} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-smartlab-on-surface flex items-center justify-center text-smartlab-surface font-black text-xl overflow-hidden shrink-0">
                {editingUser.photo ? <img src={editingUser.photo} alt="" className="w-full h-full object-cover" /> : (editingUser.name || editingUser.email || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic">Permissões</h2>
                <p className="text-[10px] font-bold text-smartlab-on-surface-variant opacity-60 uppercase tracking-widest">{editingUser.name || editingUser.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Nível de Acesso</label>
                  <select value={editingUser.role || 'Colaborador'} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black uppercase tracking-widest text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer">
                    <option value="Colaborador">Colaborador</option>
                    <option value="Líder de Equipe">Líder de Equipe</option>
                    <option value="Gerente de Projeto">Gerente de Projeto</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Status</label>
                  <select value={editingUser.status || 'active'} onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black uppercase tracking-widest text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer">
                    <option value="active">🟢 Ativo</option>
                    <option value="blocked">🔴 Bloqueado</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-2">
                  <Clock size={14} /> Validade da Licença
                </label>
                <input type="date" value={editingUser.expiresAt || ''}
                  onChange={e => setEditingUser({ ...editingUser, expiresAt: e.target.value })}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-2 block">Equipes</label>
                  <div className="flex flex-col gap-2 overflow-y-auto p-4 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border" style={{ maxHeight: '130px' }}>
                    {teams.map(t => (
                      <label key={t.id} className="flex items-center gap-3 text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-tight cursor-pointer hover:text-smartlab-on-surface transition-colors">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded"
                          checked={(editingUser.teamIds || []).includes(t.id)}
                          onChange={e => {
                            const ids = editingUser.teamIds || [];
                            setEditingUser({ ...editingUser, teamIds: e.target.checked ? [...ids, t.id] : ids.filter(id => id !== t.id) });
                          }} />
                        {t.name}
                      </label>
                    ))}
                    {teams.length === 0 && <span className="text-[10px] opacity-40 italic">Nenhuma equipe</span>}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-2 block">Projetos *</label>
                  <div className="flex flex-col gap-2 overflow-y-auto p-4 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border" style={{ maxHeight: '130px' }}>
                    {projects.map(p => (
                      <label key={p.id} className="flex items-center gap-3 text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-tight cursor-pointer hover:text-smartlab-on-surface transition-colors">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded"
                          checked={(editingUser.projectIds || []).includes(p.id)}
                          onChange={e => {
                            const ids = editingUser.projectIds || [];
                            setEditingUser({ ...editingUser, projectIds: e.target.checked ? [...ids, p.id] : ids.filter(id => id !== p.id) });
                          }} />
                        {p.name || p.title}
                      </label>
                    ))}
                    {projects.length === 0 && <span className="text-[10px] opacity-40 italic">Nenhum projeto</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <button type="button" className="flex-1 py-4 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-smartlab-border transition-all border-2 border-smartlab-border"
                  onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">
                  Salvar Permissões
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========== DRAWER: Auditoria =========== */}
      {historyUser && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-smartlab-on-surface/20 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="w-full max-w-[480px] bg-smartlab-surface h-full shadow-2xl border-l-4 border-smartlab-on-surface p-10 overflow-y-auto animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic flex items-center gap-3">
                  <FileText size={24} /> Trilha de Auditoria
                </h2>
                <p className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-[0.2em] mt-2 opacity-60">
                  Atividade: <span className="text-smartlab-on-surface opacity-100 border-b border-smartlab-on-surface">{historyUser}</span>
                </p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="p-3 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-2xl border-2 border-smartlab-border hover:bg-smartlab-on-surface hover:text-smartlab-surface transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-6">
              {auditLogs.length === 0 ? (
                <div className="text-center py-20 bg-smartlab-surface-low rounded-[32px] border-2 border-smartlab-border border-dashed">
                  <History size={48} className="mx-auto mb-4 text-smartlab-border" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60">Nenhuma ação registrada.</p>
                </div>
              ) : auditLogs.map((log, index) => {
                const logDate = log.created_at?.toDate ? log.created_at.toDate().toLocaleString('pt-BR') : '...';
                return (
                  <div key={log.id} className="relative pl-8 group">
                    {index !== auditLogs.length - 1 && <div className="absolute left-[3px] top-8 bottom-[-24px] w-0.5 bg-smartlab-border" />}
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-smartlab-on-surface ring-4 ring-smartlab-surface-low" />
                    <div className="flex flex-col gap-1 mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-smartlab-on-surface-variant opacity-60 italic">{logDate}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-smartlab-on-surface text-smartlab-surface rounded text-[8px] font-black uppercase tracking-tighter italic">{log.target_type}</span>
                        <span className="text-[11px] font-black text-smartlab-on-surface uppercase tracking-tight">{log.action}</span>
                      </div>
                    </div>
                    <div className="bg-smartlab-surface-low p-4 rounded-xl border-2 border-smartlab-border text-xs font-bold text-smartlab-on-surface-variant leading-relaxed italic border-dashed group-hover:border-smartlab-on-surface-variant transition-all">
                      "{log.details}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
