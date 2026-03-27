import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Save, Sliders, ToggleRight, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

function BusinessLogicSection({ onSave }) {
  const [settings, setSettings] = useState({
    requireAdminValidation: true,
    allowUserTaskCreation: true,
    enableEmailNotifications: false,
    strictProjectVisibility: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'businessLogic')).then(d => {
      if (d.exists()) {
        setSettings(prev => ({ ...prev, ...d.data() }));
      }
      setLoading(false);
    });
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    await setDoc(doc(db, 'settings', 'businessLogic'), settings);
    onSave('Regras de Negócio salvas com sucesso!');
  };

  const ConfigItem = ({ title, description, stateKey }) => (
    <div className="flex items-center justify-between p-5 border-2 border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-slate-50/50 transition-all group">
      <div>
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          {title}
        </h4>
        <p className="text-sm text-slate-500 mt-1 max-w-lg">{description}</p>
      </div>
      <button 
        onClick={() => handleToggle(stateKey)}
        className={cn(
          "w-14 h-8 rounded-full relative transition-colors duration-300",
          settings[stateKey] ? "bg-primary" : "bg-slate-200"
        )}
      >
        <div className={cn(
          "w-6 h-6 rounded-full bg-white absolute top-1 transition-transform duration-300 shadow-sm",
          settings[stateKey] ? "translate-x-7" : "translate-x-1"
        )} />
      </button>
    </div>
  );

  if (loading) return <div className="text-slate-400 text-sm italic">Carregando permissões...</div>;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800">
        <Sliders className="shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <p className="font-bold">Motor Lógico da Plataforma</p>
          <p className="mt-1 opacity-90">Estas chaves controlam comportamentos estruturais e fluxos de aprovação de toda a plataforma GestorADM. Alterações aqui impactam todos os usuários instantaneamente.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ConfigItem 
          title="Exigir Validação de Admin (UNDER_REVIEW)" 
          description="Se ativo, usuários normais não podem finalizar tarefas direto para DONE. Elas irão para UNDER_REVIEW e um Gerente ou Admin precisará aprovar."
          stateKey="requireAdminValidation"
        />
        <ConfigItem 
          title="Permitir Usuários Criarem Tarefas" 
          description="Se ativo, usuários de nível 'User' poderão criar tarefas livremente usando o painel Minhas Tarefas. Se inativo, apenas Gerentes e Admins poderão designar tarefas."
          stateKey="allowUserTaskCreation"
        />
        <ConfigItem 
          title="Visibilidade Estrita de Projetos" 
          description="Se ativo, membros só enxergarão projetos na qual estejam explicitamente alocados. Se desativado, todos os usuários da empresa poderão ver todos os projetos ativos."
          stateKey="strictProjectVisibility"
        />
        <ConfigItem 
          title="Notificações por E-mail (Futuro)" 
          description="Integração SendGrid: Se habilitado, envia e-mails diários de resumo de tarefas pendentes e avaliações de UNDER_REVIEW."
          stateKey="enableEmailNotifications"
        />
      </div>

      <div className="flex justify-end mt-4 pt-6 border-t border-slate-100">
        <button 
          onClick={handleSave}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3"
        >
          <Save size={18} />
          Salvar Regras de Negócio
        </button>
      </div>
    </div>
  );
}

export default BusinessLogicSection;
