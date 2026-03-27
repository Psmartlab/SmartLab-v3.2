import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, Users, UserCheck, UserCog, RefreshCcw } from 'lucide-react';
import { ALL_PERMISSIONS, ROLES } from '../../constants/permissions';

function PermissionsSection({ onSave }) {
  const [activeTab, setActiveTab] = useState('roles');
  const [rolePerms, setRolePerms] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOverrides, setUserOverrides] = useState({});

  useEffect(() => {
    const initial = {};
    Object.values(ALL_PERMISSIONS).flat().forEach(p => { initial[p.id] = { ...p.default }; });
    getDoc(doc(db, 'settings', 'rolePermissions')).then(d => {
      setRolePerms(d.exists() ? { ...initial, ...d.data() } : initial);
    });
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.name !== 'Aguardando Login'));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    getDoc(doc(db, 'users', selectedUser.id)).then(d => {
      setUserOverrides(d.exists() ? (d.data().permissionOverrides || {}) : {});
    });
  }, [selectedUser]);

  const saveRolePerms = async () => {
    await setDoc(doc(db, 'settings', 'rolePermissions'), rolePerms);
    onSave('Permissões por cargo salvas!');
  };

  const saveUserOverrides = async () => {
    if (!selectedUser) return;
    await updateDoc(doc(db, 'users', selectedUser.id), { permissionOverrides: userOverrides });
    onSave(`Permissões de ${selectedUser.name || selectedUser.email} salvas!`);
  };

  const toggleRole = (permId, role) => {
    setRolePerms(prev => ({ ...prev, [permId]: { ...prev[permId], [role]: !prev[permId]?.[role] } }));
  };

  const cycleOverride = (permId) => {
    setUserOverrides(prev => {
      const cur = prev[permId];
      if (cur === undefined || cur === null) return { ...prev, [permId]: true };
      if (cur === true) return { ...prev, [permId]: false };
      return { ...prev, [permId]: null };
    });
  };

  const getOverrideLabel = (v) => {
    if (v === true) return { label: '✅ Permitido', cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
    if (v === false) return { label: '🚫 Bloqueado', cls: 'bg-red-100 text-red-700 border-red-300' };
    return { label: '🔁 Padrão do Cargo', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab('roles')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'roles' ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
          <Users size={16} className="inline mr-1.5" />Por Cargo
        </button>
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}>
          <UserCheck size={16} className="inline mr-1.5" />Por Usuário
        </button>
      </div>

      {activeTab === 'roles' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">Define o acesso <strong>padrão</strong> para cada nível hierárquico.</p>
          {Object.entries(ALL_PERMISSIONS).map(([group, perms]) => (
            <div key={group} className="border-2 border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
                <span className="font-black text-xs text-slate-600 uppercase tracking-widest">{group}</span>
                <div className="flex gap-6 text-[11px] font-black text-slate-400 uppercase tracking-widest pr-2">
                  {ROLES.map(r => <span key={r} className="w-14 text-center">{r}</span>)}
                </div>
              </div>
              {perms.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <span className="text-sm font-medium text-slate-700">{p.label}</span>
                  <div className="flex gap-6">
                    {ROLES.map(role => (
                      <div key={role} className="w-14 flex justify-center">
                        <input
                          type="checkbox"
                          checked={rolePerms[p.id]?.[role] ?? p.default[role]}
                          onChange={() => toggleRole(p.id, role)}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={saveRolePerms} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
            <Save size={18} /> Salvar Permissões por Cargo
          </button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)} className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${selectedUser?.id === u.id ? 'bg-primary text-white border-primary shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'}`}>
                <span className="inline-block w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black mr-1.5 text-center leading-6">{(u.name || u.email).charAt(0).toUpperCase()}</span>
                {u.name || u.email}
              </button>
            ))}
          </div>

          {selectedUser && (
            <>
              <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <UserCog size={20} className="text-primary shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{selectedUser.name || selectedUser.email}</p>
                  <p className="text-xs text-slate-500">Cargo: <strong>{selectedUser.role}</strong></p>
                </div>
                <button onClick={() => setUserOverrides({})} className="ml-auto text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"><RefreshCcw size={13} /> Resetar</button>
              </div>

              <div className="flex flex-col gap-3">
                {Object.entries(ALL_PERMISSIONS).map(([group, perms]) => (
                  <div key={group} className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                      <span className="font-black text-xs text-slate-600 uppercase tracking-widest">{group}</span>
                    </div>
                    {perms.map(p => {
                      const ov = userOverrides[p.id];
                      const { label, cls } = getOverrideLabel(ov);
                      const roleDefault = rolePerms[p.id]?.[selectedUser.role] ?? p.default[selectedUser.role];
                      return (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <div>
                            <span className="text-sm font-medium text-slate-700">{p.label}</span>
                            <span className="ml-2 text-[10px] text-slate-400">(padrão {roleDefault ? '✅' : '🚫'})</span>
                          </div>
                          <button onClick={() => cycleOverride(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all hover:shadow-sm ${cls}`}>
                            {label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <button onClick={saveUserOverrides} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                <Save size={18} /> Salvar Overrides
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PermissionsSection;
