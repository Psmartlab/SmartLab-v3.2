import React, { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, Database, Trash2 } from 'lucide-react';
import Toggle from '../../components/Toggle';

function DataSection({ onSave }) {
  const [stats, setStats] = useState({ gantt_items: 0, users: 0, teams: 0, projects: 0 });
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupFreq, setBackupFreq] = useState('weekly');

  useEffect(() => {
    const cols = ['gantt_items', 'users', 'teams', 'projects'];
    const unsubs = cols.map(col =>
      onSnapshot(collection(db, col), snap =>
        setStats(s => ({ ...s, [col]: snap.size }))
      )
    );
    
    getDoc(doc(db, 'settings', 'data')).then(d => {
      if (d.exists()) { 
        setAutoBackup(d.data().autoBackup || false); 
        setBackupFreq(d.data().backupFreq || 'weekly'); 
      }
    });

    return () => unsubs.forEach(fn => fn());
  }, []);

  const save = async () => {
    await setDoc(doc(db, 'settings', 'data'), { autoBackup, backupFreq });
    onSave('Configurações de backup salvas!');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tarefas', value: stats.gantt_items, color: 'bg-blue-50 text-blue-700' },
          { label: 'Usuários', value: stats.users, color: 'bg-purple-50 text-purple-700' },
          { label: 'Equipes',  value: stats.teams, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Projetos', value: stats.projects, color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 text-center ${s.color} border-2 border-current border-opacity-10`}>
            <p className="text-3xl font-black">{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Backup Automático</h3>
          <p className="text-sm text-slate-500 mt-0.5">Snapshots periódicos via Firebase.</p>
        </div>
        <Toggle checked={autoBackup} onChange={e => setAutoBackup(e.target.checked)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave('Exportando...')} className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary hover:text-white transition-all">
          <Database size={18} /> Exportar JSON
        </button>
        <button onClick={() => { if(window.confirm('Apagar permanentemente?')) onSave('Limpando...'); }} className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-red-300 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all">
          <Trash2 size={18} /> Limpar Tudo
        </button>
      </div>

      <button onClick={save} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2">
        <Save size={18} /> Salvar Configurações
      </button>
    </div>
  );
}

export default DataSection;
