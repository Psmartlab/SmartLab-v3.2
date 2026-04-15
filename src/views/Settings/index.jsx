import React, { useState } from 'react';
import { db } from '../../firebase';
import {
  Settings as SettingsIcon,
  Shield, 
  Lock, 
  Bell, 
  Palette, 
  Users,
  Database,
  Save, 
  Trash2, 
  ChevronRight 
} from 'lucide-react';

import { cn } from '../../utils/cn';
import SectionHeader from '../../components/common/SectionHeader';
import Toast from '../../components/Toast';
import SecuritySection from './SecuritySection';
import PermissionsSection from './PermissionsSection';
import NotificationsSection from './NotificationsSection';
import ThemeSection from './ThemeSection';
import DataSection from './DataSection';
import BusinessLogicSection from './BusinessLogicSection';
import RuleEngineSection from './RuleEngineSection';

const SECTIONS = [
  { id: 'rules',       label: 'Regras de Acesso',  icon: Shield, color: 'text-accent bg-accent/10' },
  { id: 'business',   label: 'Regras de Negócio', icon: SettingsIcon, color: 'text-rose-500 bg-rose-500/10' },
  { id: 'security',   label: 'Segurança',          icon: Lock, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'permissions',label: 'Permissões',         icon: Users, color: 'text-blue-500 bg-blue-500/10' },
  { id: 'notifications',label:'Notificações',      icon: Bell, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'theme',      label: 'Personalização',    icon: Palette, color: 'text-purple-500 bg-purple-500/10' },
  { id: 'data',       label: 'Dados e Backup',     icon: Database, color: 'text-slate-500 bg-slate-500/10' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState('rules');
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'rules':         return <RuleEngineSection onSave={showToast} />;
      case 'business':      return <BusinessLogicSection onSave={showToast} />;
      case 'security':      return <SecuritySection onSave={showToast} />;
      case 'permissions':   return <PermissionsSection onSave={showToast} />;
      case 'notifications': return <NotificationsSection onSave={showToast} />;
      case 'theme':         return <ThemeSection onSave={showToast} />;
      case 'data':          return <DataSection onSave={showToast} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-10 h-full animate-in fade-in duration-500">
      <SectionHeader 
        title="Ajustes do Sistema"
        subtitle="Console de administração e preferências globais de segurança e interface"
      />

      <div className="flex flex-col lg:flex-row gap-8 flex-1">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex lg:flex-col gap-3 p-2 bg-smartlab-surface-low/30 rounded-[32px] h-fit border-2 border-smartlab-border overflow-x-auto no-scrollbar">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button 
                key={s.id} 
                onClick={() => setActiveSection(s.id)} 
                className={cn(
                  "flex-1 lg:flex-none flex items-center justify-between p-5 rounded-2xl transition-all duration-300 relative group truncate",
                  active 
                    ? "bg-smartlab-on-surface text-smartlab-surface shadow-2xl translate-x-1" 
                    : "text-smartlab-on-surface-variant hover:bg-smartlab-on-surface/5"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    active ? "bg-accent text-white" : "bg-smartlab-surface/50 text-smartlab-on-surface-variant group-hover:text-accent"
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className={cn(
                    "font-black text-[11px] uppercase tracking-widest italic font-headline",
                    active ? "text-smartlab-surface" : ""
                  )}>{s.label}</span>
                </div>
                <ChevronRight size={18} className={cn(
                  "hidden lg:block transition-all",
                  active ? "text-accent translate-x-1" : "text-smartlab-on-surface-variant/20 group-hover:text-accent"
                )} />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-smartlab-surface rounded-[40px] border-2 border-smartlab-border shadow-2xl p-10 relative animate-in fade-in slide-in-from-right-8 duration-500 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          
          <div className="max-w-4xl relative">
            <h2 className="font-headline font-black text-3xl text-smartlab-on-surface uppercase italic tracking-tighter mb-10 pb-4 border-b-2 border-smartlab-border/30">
              {SECTIONS.find(s => s.id === activeSection).label}
            </h2>
            <div className="custom-scrollbar">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
