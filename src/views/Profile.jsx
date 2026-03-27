import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  User, Mail, Phone, MapPin, Camera, Save, CheckCircle, 
  MessageSquare, UserCircle, Globe, Hash
} from 'lucide-react';

import { cn } from '../utils/cn';
import SectionHeader from '../components/common/SectionHeader';

export default function Profile({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    photo: '',
    bio: ''
  });

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          name: data.name || user.displayName || '',
          nickname: data.nickname || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          address: data.address || '',
          photo: data.photo || user.photoURL || '',
          bio: data.bio || ''
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updatedAt: new Date()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Erro ao salvar perfil: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader 
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais e de contato para a rede SmartLab"
        className="mb-12"
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Avatar e Bio */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-smartlab-surface p-8 rounded-[32px] border-2 border-smartlab-border shadow-xl flex flex-col items-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative group/avatar">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-accent/20 shadow-2xl bg-smartlab-surface-low p-1">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {profileData.photo ? (
                    <img src={profileData.photo} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-black text-accent bg-accent/5">
                      {profileData.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <label className="absolute bottom-0 right-0 p-3 bg-accent text-white rounded-2xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all border-2 border-smartlab-surface">
                <Camera size={20} />
                <input 
                  type="text" 
                  placeholder="URL da Foto" 
                  className="hidden" 
                  onChange={(e) => setProfileData({...profileData, photo: e.target.value})}
                />
              </label>
            </div>
            
            <div className="text-center mt-6">
              <h3 className="font-black text-smartlab-on-surface text-xl uppercase italic tracking-tighter">{profileData.name}</h3>
              <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mt-1 italic">{user?.role || 'Operador Especialista'}</p>
            </div>
            
            <div className="w-full mt-8 pt-8 border-t-2 border-smartlab-border/30 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-[0.2em] px-1 italic">Declaração de Bio</label>
                <textarea 
                  value={profileData.bio}
                  onChange={e => setProfileData({...profileData, bio: e.target.value})}
                  className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl p-4 text-sm font-bold text-smartlab-on-surface focus:border-accent focus:bg-smartlab-surface outline-none transition-all min-h-[140px] resize-none placeholder:text-smartlab-on-surface-variant/20 italic leading-relaxed"
                  placeholder="Descreva sua atuação e especialidades..."
                />
              </div>
            </div>
          </div>
          
          <div className="bg-accent/5 p-8 rounded-[32px] border-2 border-accent/10 shadow-inner group">
             <h4 className="font-black text-accent text-xs uppercase tracking-widest flex items-center gap-3 mb-3 italic">
               <Globe size={18} className="group-hover:rotate-12 transition-transform" /> Visibilidade Operacional
             </h4>
             <p className="text-[11px] text-smartlab-on-surface-variant font-bold leading-relaxed opacity-70 italic">
               Suas informações de contato ficam visíveis para administradores e membros da sua equipe para facilitar a colaboração e tempo de resposta.
             </p>
          </div>
        </div>

        {/* Lado Direito: Campos de Formulário */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-smartlab-surface p-10 rounded-[40px] border-2 border-smartlab-border shadow-2xl space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            {/* Seção: Identificação */}
            <div className="relative">
              <h4 className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <User size={16} />
                </div>
                Identificação de Usuário
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">Nome para Registro</label>
                  <div className="relative group">
                    <User size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text"
                      value={profileData.name}
                      onChange={e => setProfileData({...profileData, name: e.target.value})}
                      className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface uppercase italic tracking-tight focus:border-accent focus:bg-smartlab-surface outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">Identificação (Codinome)</label>
                  <div className="relative group">
                    <Hash size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text"
                      value={profileData.nickname}
                      onChange={e => setProfileData({...profileData, nickname: e.target.value})}
                      className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface uppercase italic tracking-tight focus:border-accent focus:bg-smartlab-surface outline-none transition-all placeholder:text-smartlab-on-surface-variant/20"
                      placeholder="Ex: CALLSIGN"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-smartlab-border/30 w-full" />

            {/* Seção: Contato */}
            <div className="relative">
              <h4 className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-[0.3em] mb-8 flex items-center gap-3 italic">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Phone size={16} />
                </div>
                Comunicação e Redes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">E-mail Operacional (Fixo)</label>
                  <div className="relative opacity-60">
                    <Mail size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant" />
                    <input 
                      type="email"
                      disabled
                      value={profileData.email}
                      className="w-full bg-smartlab-border/10 border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface-variant uppercase italic tracking-tight cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">Linha Direta (VOICE)</label>
                  <div className="relative group">
                    <Phone size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant group-focus-within:text-accent transition-colors" />
                    <input 
                      type="tel"
                      value={profileData.phone}
                      onChange={e => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface uppercase italic tracking-tight focus:border-accent focus:bg-smartlab-surface outline-none transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">Mensageiro Urgente</label>
                  <div className="relative group">
                    <MessageSquare size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant group-focus-within:text-accent transition-colors" />
                    <input 
                      type="tel"
                      value={profileData.whatsapp}
                      onChange={e => setProfileData({...profileData, whatsapp: e.target.value})}
                      className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface uppercase italic tracking-tight focus:border-accent focus:bg-smartlab-surface outline-none transition-all"
                      placeholder="WhatsApp / Telegram"
                    />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest ml-1 italic">Unidade / Base de Operação</label>
                  <div className="relative group">
                    <MapPin size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-smartlab-on-surface-variant group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text"
                      value={profileData.address}
                      onChange={e => setProfileData({...profileData, address: e.target.value})}
                      className="w-full bg-smartlab-surface-low border-2 border-smartlab-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black text-smartlab-on-surface uppercase italic tracking-tight focus:border-accent focus:bg-smartlab-surface outline-none transition-all"
                      placeholder="Identificação de localidade ou escritório"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={saving}
                className="w-full bg-smartlab-on-surface text-smartlab-surface py-5 rounded-[24px] font-black text-lg uppercase tracking-[0.2em] italic shadow-2xl hover:bg-accent hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-smartlab-surface"></div>
                ) : (
                  <>
                    <Save size={24} /> Confirmar Alterações
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
