import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save } from 'lucide-react';
import Toggle from '../../components/Toggle';

function NotificationsSection({ onSave }) {
  const [cfg, setCfg] = useState({
    taskOverdue: true, taskAssigned: true, teamUpdate: true,
    projectUpdate: false, systemAlerts: true, dailyDigest: false,
    digestTime: '08:00'
  });

  useEffect(() => {
    getDoc(doc(db, 'settings', 'notifications')).then(d => { 
      if (d.exists()) setCfg(s => ({ ...s, ...d.data() })); 
    });
  }, []);

  const save = async () => {
    await setDoc(doc(db, 'settings', 'notifications'), cfg);
    onSave('Configurações de notificações salvas!');
  };

  const items = [
    { key: 'taskOverdue',    label: 'Tarefa atrasada',           desc: 'Notificar quando um prazo é ultrapassado.' },
    { key: 'taskAssigned',   label: 'Tarefa atribuída',          desc: 'Notificar quando uma tarefa for designada.' },
    { key: 'teamUpdate',     label: 'Atualização de equipe',     desc: 'Novos membros ou alterações na equipe.' },
    { key: 'projectUpdate',  label: 'Atualização de projeto',    desc: 'Mudanças em projetos vinculados.' },
    { key: 'systemAlerts',   label: 'Alertas do sistema',        desc: 'Erros, atualizações e manutenção.' },
    { key: 'dailyDigest',    label: 'Resumo diário',             desc: 'E-mail com o resumo do dia.' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {items.map(item => (
        <div key={item.key} className="flex items-center justify-between py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">{item.label}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
          </div>
          <Toggle checked={cfg[item.key]} onChange={e => setCfg(s => ({ ...s, [item.key]: e.target.checked }))} />
        </div>
      ))}
      
      {cfg.dailyDigest && (
        <div className="flex items-center justify-between py-3 pl-4 bg-blue-50 rounded-xl border-2 border-blue-100">
          <span className="text-sm font-bold text-slate-700">Horário do Resumo Diário</span>
          <input type="time" value={cfg.digestTime} onChange={e => setCfg(s => ({ ...s, digestTime: e.target.value }))} className="border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none" />
        </div>
      )}

      <button onClick={save} className="self-end bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
        <Save size={18} /> Salvar Configurações
      </button>
    </div>
  );
}

export default NotificationsSection;
