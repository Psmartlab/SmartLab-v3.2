import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { Plus, Trash2, Edit2, Users, FolderOpen, X, Check, Crown, Shield, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../utils/cn';

const statusConfig = {
  active:    { label: 'Ativo',     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  paused:    { label: 'Pausado',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  completed: { label: 'Concluído', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelado', color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-400' },
};
const DEFAULT_STATUS = statusConfig.active;
const getStatus = (s) => statusConfig[(s || '').toLowerCase()] || DEFAULT_STATUS;

const Projects = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProject, setCurrentProject] = useState({ name: '', description: '', status: 'active', owners: [], teamIds: [], userIds: [] });
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);

  const isAdmin = ['admin', 'gerente', 'manager'].includes((user?.role || '').toLowerCase());

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 4000);
    const unsub = onSnapshot(query(collection(db, 'projects')),
      s => { setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))); setLoading(false); clearTimeout(timer); },
      () => { setLoading(false); clearTimeout(timer); });
    const unsubTeams = onSnapshot(collection(db, 'teams'), s => setTeams(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const unsubUsers = onSnapshot(collection(db, 'users'), s => setAllUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { clearTimeout(timer); unsub(); unsubTeams(); unsubUsers(); };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentProject.name) return;
    try {
      if (currentProject.id) {
        await updateDoc(doc(db, 'projects', currentProject.id), { ...currentProject, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'projects'), { ...currentProject, createdAt: new Date(), updatedAt: new Date() });
      }
      setIsEditing(false);
      setCurrentProject({ name: '', description: '', status: 'active', owners: [], teamIds: [], userIds: [] });
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este projeto?')) await deleteDoc(doc(db, 'projects', id));
  };

  const toggle = (field, id) => {
    const arr = currentProject[field] || [];
    setCurrentProject({ ...currentProject, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] });
  };

  const getUserById = (id) => allUsers.find(u => u.id === id || u.email === id);
  const getUserByEmail = (email) => allUsers.find(u => u.email === email);
  const getTeamById = (id) => teams.find(t => t.id === id);

  if (loading) return (
    <div className="p-8 text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">Carregando projetos...</div>
  );

  return (
    <div className="p-6 md:p-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Projetos</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">
            {projects.length} projeto{projects.length !== 1 ? 's' : ''} cadastrado{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-3 px-8 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl active:scale-95 group"
            onClick={() => { setIsEditing(true); setCurrentProject({ name: '', description: '', status: 'active', owners: [], teamIds: [], userIds: [] }); }}>
            <Plus size={18} className="text-accent group-hover:rotate-90 transition-transform" /> Novo Projeto
          </button>
        )}
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total', value: projects.length, color: 'text-smartlab-primary', bg: 'bg-smartlab-surface', border: 'border-smartlab-border' },
          { label: 'Ativos', value: projects.filter(p => (p.status || 'active') === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Equipes', value: teams.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Colaboradores', value: allUsers.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map(s => (
          <div key={s.label} className={cn('flex flex-col items-center justify-center p-5 rounded-2xl border-2', s.bg, s.border)}>
            <span className={cn('text-3xl font-black', s.color)}>{s.value}</span>
            <span className={cn('text-[10px] font-black uppercase tracking-[0.15em] mt-1 opacity-70', s.color)}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Edit form (inline slide-in) */}
      {isEditing && (
        <div className="bg-smartlab-surface rounded-[28px] border-2 border-smartlab-border shadow-lg mb-8 animate-in slide-in-from-top-4 duration-300 overflow-hidden">
          <div className="flex justify-between items-center px-8 pt-8 pb-4 border-b-2 border-smartlab-border">
            <h3 className="text-lg font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic">
              {currentProject.id ? 'Editar Projeto' : 'Novo Projeto'}
            </h3>
            <button className="p-2 text-smartlab-on-surface-variant hover:text-smartlab-on-surface border-2 border-smartlab-border rounded-xl transition-all" onClick={() => setIsEditing(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Nome do Projeto *</label>
                <input className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                  value={currentProject.name} onChange={e => setCurrentProject({ ...currentProject, name: e.target.value })} placeholder="Nome do projeto..." required />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Descrição</label>
                <input className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-bold text-smartlab-on-surface focus:border-smartlab-on-surface outline-none transition-all"
                  value={currentProject.description} onChange={e => setCurrentProject({ ...currentProject, description: e.target.value })} placeholder="Objetivo ou escopo..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1 flex items-center gap-1.5"><Crown size={12} /> Proprietários (Admins)</label>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[140px] p-2 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                  {allUsers.filter(u => u.role === 'Admin').map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-2 bg-smartlab-surface rounded-xl border border-smartlab-border cursor-pointer hover:border-smartlab-primary transition-all">
                      <input type="checkbox" className="w-4 h-4 rounded" checked={(currentProject.owners || []).includes(u.email)} onChange={() => toggle('owners', u.email)} />
                      <span className="font-bold text-xs text-smartlab-on-surface">{u.name || u.email}</span>
                    </label>
                  ))}
                  {allUsers.filter(u => u.role === 'Admin').length === 0 && <span className="text-[10px] opacity-40 italic p-2">Nenhum administrador</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant pl-1">Status</label>
                <select className="bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 font-black text-xs text-smartlab-on-surface focus:border-smartlab-on-surface outline-none appearance-none cursor-pointer"
                  value={currentProject.status || 'active'} onChange={e => setCurrentProject({ ...currentProject, status: e.target.value })}>
                  <option value="active">🟢 Ativo</option>
                  <option value="paused">🟡 Pausado</option>
                  <option value="completed">🔵 Concluído</option>
                  <option value="cancelled">🔴 Cancelado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-2 block flex items-center gap-1.5"><Users size={12} /> Equipes vinculadas</label>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[180px] p-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-3 p-3 bg-smartlab-surface rounded-xl border border-smartlab-border cursor-pointer hover:border-smartlab-primary transition-all">
                      <input type="checkbox" className="w-4 h-4 rounded"
                        checked={(currentProject.teamIds || []).includes(t.id)} onChange={() => toggle('teamIds', t.id)} />
                      <span className="font-bold text-sm text-smartlab-on-surface">{t.name}</span>
                    </label>
                  ))}
                  {teams.length === 0 && <span className="text-[10px] opacity-40 italic p-2">Nenhuma equipe</span>}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-2 block flex items-center gap-1.5"><Shield size={12} /> Colaboradores</label>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[180px] p-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                  {allUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-3 bg-smartlab-surface rounded-xl border border-smartlab-border cursor-pointer hover:border-smartlab-primary transition-all">
                      <input type="checkbox" className="w-4 h-4 rounded"
                        checked={(currentProject.userIds || []).includes(u.id)} onChange={() => toggle('userIds', u.id)} />
                      <span className="font-bold text-sm text-smartlab-on-surface">{u.name || u.email}</span>
                    </label>
                  ))}
                  {allUsers.length === 0 && <span className="text-[10px] opacity-40 italic p-2">Nenhum usuário</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setIsEditing(false)}
                className="flex-1 py-4 bg-smartlab-surface-low border-2 border-smartlab-border text-smartlab-on-surface-variant rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-smartlab-border transition-all">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 py-4 bg-smartlab-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <Check size={16} /> {currentProject.id ? 'Salvar Alterações' : 'Criar Projeto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !isEditing && (
        <div className="text-center py-24 bg-smartlab-surface rounded-[32px] border-2 border-smartlab-border border-dashed">
          <FolderOpen size={48} className="mx-auto mb-4 text-smartlab-border" />
          <p className="text-smartlab-on-surface-variant text-xs font-black uppercase tracking-[0.2em]">Nenhum projeto cadastrado ainda.</p>
        </div>
      )}

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map(project => {
          const status = getStatus(project.status);
          const projectOwners = (project.owners || []).map(email => getUserByEmail(email) || getUserById(email)).filter(Boolean);
          const projectTeams = (project.teamIds || []).map(id => getTeamById(id)).filter(Boolean);
          const projectMembers = (project.userIds || []).map(id => getUserById(id)).filter(Boolean);
          const isExpanded = expandedProject === project.id;

          return (
            <div key={project.id} className="bg-smartlab-surface rounded-[28px] border-2 border-smartlab-border shadow-sm hover:shadow-lg transition-all flex flex-col overflow-hidden">
              {/* Status bar */}
              <div className={cn('px-6 py-2 flex items-center gap-2', status.bg)}>
                <span className={cn('w-2 h-2 rounded-full', status.dot)} />
                <span className={cn('text-[10px] font-black uppercase tracking-widest', status.color)}>{status.label}</span>
              </div>

              {/* Main card content */}
              <div className="p-6 flex-1">
                {/* Title + actions */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-tight mb-1 truncate">{project.name}</h3>
                    <p className="text-[11px] text-smartlab-on-surface-variant opacity-60 italic leading-relaxed line-clamp-2">{project.description || 'Sem descrição'}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { setIsEditing(true); setCurrentProject(project); }}
                        className="p-2 bg-smartlab-surface-low text-smartlab-on-surface-variant hover:bg-smartlab-on-surface hover:text-smartlab-surface rounded-xl transition-all border-2 border-smartlab-border hover:border-smartlab-on-surface">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(project.id)}
                        className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border-2 border-red-100 hover:border-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Owners */}
                <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border-2 border-amber-100 rounded-2xl mb-4">
                  <Crown size={13} className="text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 opacity-70">Proprietários</div>
                    <div className="text-xs font-black text-amber-700">
                      {projectOwners.length > 0 ? projectOwners.map(o => o.name || o.email).join(', ') : <span className="italic opacity-50">Não atribuído</span>}
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex flex-col items-center py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                    <span className="text-xl font-black text-smartlab-on-surface">{projectTeams.length}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60 mt-0.5">Equipes</span>
                  </div>
                  <div className="flex flex-col items-center py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                    <span className="text-xl font-black text-smartlab-on-surface">{projectMembers.length}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60 mt-0.5">Pessoas</span>
                  </div>
                  <div className="flex flex-col items-center py-3 bg-smartlab-surface-low rounded-2xl border-2 border-smartlab-border">
                    <span className="text-[10px] font-black text-smartlab-on-surface leading-tight text-center">{project.createdAt?.toDate?.().toLocaleDateString('pt-BR') || '—'}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant opacity-60 mt-0.5">Criado</span>
                  </div>
                </div>

                {/* Expandable details */}
                <button onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-smartlab-surface-low hover:bg-smartlab-border/30 rounded-2xl border-2 border-smartlab-border transition-all text-[10px] font-black uppercase tracking-widest text-smartlab-on-surface-variant">
                  <span className="flex items-center gap-2"><Settings size={13} /> Detalhes</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Teams list */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-1.5 opacity-60 flex items-center gap-1.5"><Users size={10} /> Equipes vinculadas</div>
                      {projectTeams.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {projectTeams.map(t => (
                            <span key={t.id} className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[9px] font-black uppercase tracking-tight">{t.name}</span>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-smartlab-on-surface-variant opacity-40 italic">Nenhuma equipe vinculada</span>}
                    </div>
                    {/* Members list */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-smartlab-on-surface-variant mb-1.5 opacity-60 flex items-center gap-1.5"><Shield size={10} /> Colaboradores</div>
                      {projectMembers.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {projectMembers.map(m => (
                            <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-smartlab-surface-low rounded-xl border border-smartlab-border">
                              <div className="w-6 h-6 rounded-md bg-smartlab-on-surface flex items-center justify-center text-smartlab-surface text-[9px] font-black shrink-0 overflow-hidden">
                                {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : (m.name || m.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[10px] font-bold text-smartlab-on-surface truncate">{m.name || m.email}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-smartlab-on-surface-variant opacity-40 italic">Nenhum colaborador alocado</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Projects;
