import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, Trash2 } from 'lucide-react';
import Toggle from '../../components/Toggle';

function SecuritySection({ onSave }) {
  const [settings, setSettings] = useState({ twoFa: false, sessionTimeout: '60', allowGoogleOnly: true });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'security')).then(d => { 
      if (d.exists()) setSettings(s => ({ ...s, ...d.data() })); 
    });
  }, []);

  const save = async () => {
    await setDoc(doc(db, 'settings', 'security'), settings);
    setSaved(true); 
    setTimeout(() => setSaved(false), 2500);
    onSave('Configurações de segurança salvas!');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Autenticação em Duas Etapas (2FA)</h3>
          <p className="text-sm text-slate-500 mt-0.5">Exigir código no login de administradores.</p>
        </div>
        <Toggle checked={settings.twoFa} onChange={e => setSettings(s => ({ ...s, twoFa: e.target.checked }))} />
      </div>

      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Apenas Login Google</h3>
          <p className="text-sm text-slate-500 mt-0.5">Bloquear login por e-mail/senha, exigir conta Google.</p>
        </div>
        <Toggle checked={settings.allowGoogleOnly} onChange={e => setSettings(s => ({ ...s, allowGoogleOnly: e.target.checked }))} />
      </div>

      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Tempo de Sessão Inativa</h3>
          <p className="text-sm text-slate-500 mt-0.5">Desconectar automaticamente após inatividade.</p>
        </div>
        <select value={settings.sessionTimeout} onChange={e => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))} className="border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:border-primary outline-none">
          <option value="15">15 Minutos</option>
          <option value="30">30 Minutos</option>
          <option value="60">1 Hora</option>
          <option value="480">8 Horas</option>
          <option value="0">Nunca</option>
        </select>
      </div>

      <div className="flex items-center justify-between py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-red-600">Apagar Log de Acesso</h3>
          <p className="text-sm text-slate-500 mt-0.5">Limpa permanentemente o histórico de IPs e conexões.</p>
        </div>
        <button onClick={() => { if(window.confirm('Confirma apagar todos os logs?')) onSave('Logs apagados!'); }} className="bg-red-50 text-red-600 border-2 border-red-200 font-bold px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2">
          <Trash2 size={16} /> Limpar Logs
        </button>
      </div>

      <button onClick={save} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
        <Save size={18} /> {saved ? 'Salvo!' : 'Salvar Configurações'}
      </button>
    </div>
  );
}

export default SecuritySection;
