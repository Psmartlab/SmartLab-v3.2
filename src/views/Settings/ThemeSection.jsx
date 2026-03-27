import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save } from 'lucide-react';
import Toggle from '../../components/Toggle';

function ThemeSection({ onSave }) {
  const [cfg, setCfg] = useState({
    primaryColor: '#00288e', fontScale: 'normal',
    compactMode: false, showAvatars: true, darkMode: false
  });

  useEffect(() => {
    const stored = localStorage.getItem('smartlab-dark') === 'true';
    if (stored) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    getDoc(doc(db, 'settings', 'theme')).then(d => {
      if (d.exists()) {
        setCfg(s => ({ ...s, ...d.data(), darkMode: stored }));
      } else {
        setCfg(s => ({ ...s, darkMode: stored }));
      }
    });
  }, []);

  const toggleDark = () => {
    const next = !cfg.darkMode;
    setCfg(s => ({ ...s, darkMode: next }));
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartlab-dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartlab-dark', 'false');
    }
  };

  const save = async () => {
    await setDoc(doc(db, 'settings', 'theme'), cfg);
    onSave('Preferências de tema salvas!');
  };

  const presets = ['#00288e', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0284c7'];

  return (
    <div className="flex flex-col gap-6">
      <div className={`relative flex items-center justify-between py-5 px-5 rounded-2xl border-2 transition-all ${cfg.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-gradient-to-r from-slate-100 to-blue-50 border-slate-200'}`}>
        <div>
          <h3 className={`font-bold text-lg ${cfg.darkMode ? 'text-white' : 'text-slate-800'}`}>
            {cfg.darkMode ? '🌙 Modo Escuro' : '☀️ Modo Claro'}
          </h3>
          <p className={`text-sm mt-0.5 ${cfg.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Ajuste a aparência da interface.
          </p>
        </div>
        <Toggle checked={cfg.darkMode} onChange={toggleDark} />
      </div>

      <div className="py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 mb-3">Cor Principal</h3>
        <div className="flex gap-3 flex-wrap">
          {presets.map(c => (
            <button key={c} onClick={() => setCfg(s => ({ ...s, primaryColor: c }))} className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${cfg.primaryColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={cfg.primaryColor} onChange={e => setCfg(s => ({ ...s, primaryColor: e.target.value }))} className="w-10 h-10 rounded-full border-2 border-slate-200 cursor-pointer" />
        </div>
      </div>

      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Modo Compacto</h3>
          <p className="text-sm text-slate-500 mt-0.5">Vê mais conteúdo na tela.</p>
        </div>
        <Toggle checked={cfg.compactMode} onChange={e => setCfg(s => ({ ...s, compactMode: e.target.checked }))} />
      </div>

      <button onClick={save} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2">
        <Save size={18} /> Salvar Tema
      </button>
    </div>
  );
}

export default ThemeSection;
