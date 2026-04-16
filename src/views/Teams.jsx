import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { UserPlus, Trash2, Loader2, X, Crown, Users as UsersIcon, Mail, Shield, Settings, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { cn } from '../utils/cn';
import { normalizeRole, isAdmin as _isAdmin, isTeamLeader } from '../utils/roles';
import Toast from '../components/Toast';
import { Check } from 'lucide-react';

export default function Teams({ user }) {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamManager, setNewTeamManager] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [activeTeamInvite, setActiveTeamInvite] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);
  const [toast, setToast] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  // Admin e Líder de Equipe têm permissão de gestão de equipes
  const isAdmin = _isAdmin(user?.role) || isTeamLeader(user?.role);


  useEffect(() => {
    const unsubTeams = onSnapshot(query(collection(db, 'teams')), s => {
      setTeams(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubUsers = onSnapshot(collection(db, 'users'), s =>
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubTeams(); unsubUsers(); };
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setIsModalOpen(false);
    await addDoc(collection(db, 'teams'), {
      name: newTeamName,
      description: newTeamDesc,
      manager: newTeamManager || null,
      members: [],
      created_at: serverTimestamp(),
    }).catch(err => setToast({ msg: 'Erro: ' + err.message, type: 'error' }));
    setToast({ msg: 'Equipe criada!', type: 'success' });
    setNewTeamName(''); setNewTeamDesc(''); setNewTeamManager('');
  };

  const deleteTeam = async (id) => {
    await deleteDoc(doc(db, 'teams', id));
    setToast({ msg: 'Equipe removida.', type: 'error' });
    setDelConfirm(null);
  };

  const handleAddMember = async (teamId) => {
    if (!inviteEmail) return;
    await updateDoc(doc(db, 'teams', teamId), { members: arrayUnion(inviteEmail) });
    setInviteEmail(''); setActiveTeamInvite(null);
  };

  const handleRemoveMember = async (teamId, email) => {
    if (window.confirm(`Remover ${email} da equipe?`))
      await updateDoc(doc(db, 'teams', teamId), { members: arrayRemove(email) });
  };

  const handleUpdateManager = async (teamId, managerEmail) => {
    await updateDoc(doc(db, 'teams', teamId), { manager: managerEmail });
    setEditingTeam(null);
  };

  const getUserByEmail = (email) => users.find(u => u.email === email);
  const totalSlots = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);

  if (loading) return (
    <div className="flex items-center gap-3 p-8 text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">
      <Loader2 size={18} className="animate-spin" /> Carregando equipes...
    </div>
  );

  return (
    <div className="p-6 md:p-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Equipes</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            {teams.length} equipe{teams.length !== 1 ? 's' : ''} · {totalSlots} colaboradores alocados
          </p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-3 px-8 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95 group"
            onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="text-accent group-hover:rotate-90 transition-transform" /> Nova Equipe
          </button>
        )}
      </header>


      {/* Empty state */}
      {teams.length === 0 && (
        <div className="text-center py-24 bg-smartlab-surface rounded-[32px] border-2 border-smartlab-border border-dashed">
          <UsersIcon size={48} className="mx-auto mb-4 text-smartlab-border" />
          <p className="text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">Nenhuma equipe criada ainda.</p>
        </div>
      )}

      {/* Team cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.map(team => {
          const manager = team.manager ? getUserByEmail(team.manager) : null;
          const memberObjs = (team.members || []).map(e => getUserByEmail(e) || { email: e, name: null });
          const isExpanded = expandedTeam === team.id;

          return (
            <div key={team.id} className="bg-smartlab-surface rounded-[28px] border-2 border-smartlab-border shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden">
              {/* Card header bar */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-none mb-1 truncate">{team.name}</h3>
                    <p className="text-[11px] text-smartlab-on-surface-variant opacity-60 italic leading-relaxed line-clamp-2">{team.description || 'Sem descrição'}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {delConfirm === team.id ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-right-1 duration-200">
                           <button onClick={() => deleteTeam(team.id)} className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:brightness-110">
                             <Check size={13} />
                           </button>
                           <button onClick={() => setDelConfirm(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl border-2 border-slate-200">
                             <X size={13} />
                           </button>
                        </div>
                      ) : (
                        <button className="shrink-0 p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border-2 border-red-100 hover:border-red-500"
                          onClick={() => setDelConfirm(team.id)} title="Excluir equipe">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manager section */}
              <div className="mx-6 mb-4 px-4 py-3 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Crown size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 opacity-70">Gerente</div>
                    <div className="text-xs font-black text-amber-700 truncate max-w-[140px]">
                      {manager ? (manager.name || manager.email) : <span className="italic opacity-50">Não atribuído</span>}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setEditingTeam(editingTeam === team.id ? null : team.id)}
                    className="text-[9px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-widest border-b border-amber-300 hover:border-amber-600 transition-all">
                    Alterar
                  </button>
                )}
              </div>

              {/* Manager picker */}
              {editingTeam === team.id && (
                <div className="mx-6 mb-4 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                  <select className="flex-1 bg-smartlab-surface-low border-2 border-smartlab-border rounded-xl p-2.5 text-[10px] font-black text-smartlab-on-surface outline-none appearance-none"
                    defaultValue={team.manager || ''}
                    onChange={e => handleUpdateManager(team.id, e.target.value)}>
                    <option value="">Sem gerente</option>
                    {users.map(u => <option key={u.id} value={u.email}>{u.name || u.email}</option>)}
                  </select>
                  <button onClick={() => setEditingTeam(null)} className="p-2.5 text-smartlab-on-surface-variant hover:text-smartlab-on-surface">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Stats */}
              <div className="mx-6 mb-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-4 py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                  <UsersIcon size={14} className="text-smartlab-on-surface-variant shrink-0" />
                  <div>
                    <div className="text-lg font-black text-smartlab-on-surface leading-none">{team.members?.length || 0}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60">Membros</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                  <Shield size={14} className="text-smartlab-on-surface-variant shrink-0" />
                  <div>
                    <div className="text-[11px] font-black text-smartlab-on-surface leading-tight">{team.created_at?.toDate?.().toLocaleDateString('pt-BR') || '—'}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60">Criada em</div>
                  </div>
                </div>
              </div>

              {/* Members collapse */}
              <div className="mx-6 mb-4">
                <button onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-smartlab-surface-low hover:bg-smartlab-border/30 rounded-2xl border-2 border-smartlab-border transition-all text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
                  <span className="flex items-center gap-2"><Mail size={13} /> Membros</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isExpanded && (
                  <div className="mt-2 flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-200">
                    {memberObjs.length === 0 ? (
                      <div className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-40">Nenhum membro</div>
                    ) : memberObjs.map(m => (
                      <div key={m.email} className="flex items-center gap-3 px-4 py-2.5 bg-smartlab-surface-low rounded-xl border border-smartlab-border">
                        <div className="w-7 h-7 rounded-lg bg-smartlab-on-surface flex items-center justify-center text-smartlab-surface font-black text-[10px] shrink-0 overflow-hidden">
                          {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : (m.name || m.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-black text-smartlab-on-surface truncate">{m.name || '—'}</div>
                          <div className="text-[9px] text-smartlab-on-surface-variant opacity-60 truncate">{m.email}</div>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleRemoveMember(team.id, m.email)} className="text-smartlab-on-surface-variant/30 hover:text-red-500 transition-colors shrink-0">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add member */}
              {isAdmin && (
                <div className="mx-6 mb-6">
                  {activeTeamInvite === team.id ? (
                    <div className="flex gap-2 animate-in slide-in-from-bottom-2 duration-200">
                      <select className="flex-1 bg-smartlab-primary text-white p-3 rounded-xl text-[10px] font-black uppercase outline-none appearance-none cursor-pointer"
                        value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}>
                        <option value="" disabled>Selecionar colaborador</option>
                        {users.filter(u => !(team.members || []).includes(u.email)).map(u => (
                          <option key={u.id} value={u.email}>{u.name || u.email}</option>
                        ))}
                      </select>
                      <button className="px-4 py-3 bg-smartlab-primary text-white rounded-xl font-black text-[10px] hover:scale-105 transition-all shadow-sm active:scale-95"
                        onClick={() => handleAddMember(team.id)}>OK</button>
                      <button className="px-3 py-3 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-xl border-2 border-smartlab-border hover:border-smartlab-on-surface transition-all"
                        onClick={() => setActiveTeamInvite(null)}><X size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveTeamInvite(team.id)}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant hover:border-smartlab-primary hover:text-smartlab-primary transition-all">
                      <UserPlus size={14} /> Adicionar Membro
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Nova Equipe */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-smartlab-on-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <form className="bg-smartlab-surface rounded-[32px] p-10 border-2 border-smartlab-border shadow-2xl w-full max-w-[460px] relative animate-in fade-in zoom-in duration-300"
            onSubmit={handleCreateTeam}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-smartlab-on-surface-variant hover:text-smartlab-on-surface transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic mb-2">Nova Equipe</h2>
            <p className="text-[10px] font-bold text-smartlab-on-surface-variant uppercase tracking-widest mb-8 opacity-60">Configure o grupo e atribua um gerente</p>

            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Nome da Equipe *</label>
                <input required autoFocus value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all placeholder:text-smartlab-on-surface-variant placeholder:opacity-30"
                  placeholder="Ex: Desenvolvimento Mobile" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Descrição / Missão</label>
                <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} rows={2}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all resize-none placeholder:text-smartlab-on-surface-variant placeholder:opacity-30"
                  placeholder="Responsabilidade principal da equipe..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1.5"><Crown size={12} /> Gerente Responsável</label>
                <select value={newTeamManager} onChange={e => setNewTeamManager(e.target.value)}
                  className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer">
                  <option value="">Selecione um gerente...</option>
                  {users.filter(u => _isAdmin(u.role) || isProjectManager(u.role) || isTeamLeader(u.role)).map(u => (
                    <option key={u.id} value={u.email}>{u.name || u.email}</option>
                  ))}
                  {users.length > 0 && <option disabled>──────────</option>}
                  {users.map(u => <option key={u.id + '_all'} value={u.email}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div className="flex gap-4 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-smartlab-surface-low text-smartlab-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-smartlab-border hover:bg-smartlab-border transition-all">Cancelar</button>
                <button type="submit"
                  className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95">Criar Equipe</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
