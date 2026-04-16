import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MessageSquare, CheckCircle2, AlertTriangle, Loader2, Send, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { logAction } from '../utils/audit';
import Toast from '../components/Toast';

const MOODS = [
  { value: 5, label: '😄 Ótimo', color: 'var(--success)' },
  { value: 4, label: '😊 Bem', color: '#22d3ee' },
  { value: 3, label: '😐 Neutro', color: 'var(--warning)' },
  { value: 2, label: '😔 Difícil', color: '#f97316' },
  { value: 1, label: '😫 Péssimo', color: 'var(--danger)' },
];

export default function Checkins() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const [form, setForm] = useState({
    mood: 0,
    accomplished: '',
    planned: '',
    blockers: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'checkins'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCheckins(data);

      // Check if user already submitted today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const uid = auth.currentUser?.uid;
      const alreadyDone = data.some(c => {
        if (c.userId !== uid) return false;
        if (!c.created_at) return false;
        const ts = c.created_at.toDate ? c.created_at.toDate() : new Date(c.created_at);
        return ts >= todayStart;
      });
      setTodayDone(alreadyDone);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.mood || !form.accomplished.trim()) return;
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'checkins'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        userPhoto: user.photoURL || null,
        mood: form.mood,
        accomplished: form.accomplished,
        planned: form.planned,
        blockers: form.blockers,
        created_at: serverTimestamp(),
      });
      logAction(user.email, 'CREATE', 'CHECKIN', `Realizou o check-in diário com humor "${MOODS.find(m => m.value === form.mood)?.label}"`);
      setForm({ mood: 0, accomplished: '', planned: '', blockers: '' });
      setTodayDone(true);
      setToast({ msg: 'Check-in registrado com sucesso!', type: 'success' });
    } catch (err) {
      setToast({ msg: 'Erro ao registrar check-in: ' + err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Group by date label
  const groupedCheckins = checkins.reduce((acc, c) => {
    const dateStr = c.created_at?.toDate
      ? c.created_at.toDate().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
      : 'Recente';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(c);
    return acc;
  }, {});

  const moodColor = (val) => MOODS.find(m => m.value === val)?.color || 'white';
  const moodLabel = (val) => MOODS.find(m => m.value === val)?.label || '—';

  return (
    <div className="flex-col gap-6" style={{ height: '100%' }}>
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-smartlab-primary font-headline m-0 leading-none">Check-ins da Equipe</h1>
          <p className="text-smartlab-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] opacity-60">Acompanhamento diário de humor e produtividade</p>
        </div>
      </header>

      {/* Form Section */}
      {!todayDone ? (
        <div className="glass-panel p-6 flex-col gap-4" style={{ borderTop: '3px solid var(--accent-primary)' }}>
          <h2 className="flex items-center gap-2"><MessageSquare size={20} /> Seu Check-in de Hoje</h2>
          <p className="text-sm text-muted">Leva menos de 2 minutos. Compartilhe o seu andamento com a equipe de forma assíncrona.</p>

          <form onSubmit={handleSubmit} className="flex-col gap-4">
            {/* Mood selector */}
            <div>
              <label className="text-sm text-muted mb-3 block">Como você está hoje?</label>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, mood: m.value })}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '20px',
                      border: `2px solid ${form.mood === m.value ? m.color : 'transparent'}`,
                      background: form.mood === m.value ? `${m.color}20` : 'rgba(255,255,255,0.05)',
                      color: form.mood === m.value ? m.color : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.9rem'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted mb-2 block">✅ O que você realizou hoje / ontem?</label>
              <textarea required rows={2} value={form.accomplished} onChange={e => setForm({ ...form, accomplished: e.target.value })}
                placeholder="Ex: Finalizei o relatório de vendas e revisei o código do módulo X..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }} />
            </div>

            <div>
              <label className="text-sm text-muted mb-2 block">📋 O que você planeja fazer hoje?</label>
              <textarea rows={2} value={form.planned} onChange={e => setForm({ ...form, planned: e.target.value })}
                placeholder="Ex: Terminar a integração com a API e revisar os testes..."
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }} />
            </div>

            <div>
              <label className="text-sm text-muted mb-2 block flex items-center gap-2">
                <AlertTriangle size={14} color="var(--warning)" /> Tem algum impedimento ou bloqueio?
              </label>
              <textarea rows={2} value={form.blockers} onChange={e => setForm({ ...form, blockers: e.target.value })}
                placeholder="Ex: Aguardando aprovação do cliente para avançar / Nenhum"
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', resize: 'vertical' }} />
            </div>

            <button type="submit" disabled={submitting || !form.mood} className="btn" style={{ alignSelf: 'flex-start', opacity: (!form.mood) ? 0.5 : 1 }}>
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {submitting ? 'Enviando...' : 'Registrar Check-in'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-panel p-6 flex items-center gap-4" style={{ borderTop: '3px solid var(--success)', background: 'rgba(34, 197, 94, 0.05)' }}>
          <CheckCircle2 size={32} color="var(--success)" />
          <div>
            <h3 style={{ color: 'var(--success)', marginBottom: '0.3rem' }}>Check-in do dia concluído!</h3>
            <p className="text-sm text-muted">Você já registrou seu andamento hoje. Volte amanhã para o próximo check-in.</p>
          </div>
        </div>
      )}

      {/* Feed Section */}
      <div className="flex-col gap-6">
        <h2 className="flex items-center gap-2"><Calendar size={18} /> Feed da Equipe</h2>

        {loading ? (
          <div className="flex items-center gap-2 text-muted"><Loader2 size={18} className="animate-spin" /> Carregando check-ins...</div>
        ) : Object.keys(groupedCheckins).length === 0 ? (
          <div className="glass-panel p-8 text-center text-muted">Nenhum check-in registrado ainda. Seja o primeiro!</div>
        ) : (
          Object.entries(groupedCheckins).map(([date, items]) => (
            <div key={date}>
              <div className="text-muted text-sm mb-3" style={{ textTransform: 'capitalize', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {date}
              </div>
              <div className="flex-col gap-3">
                {items.map(c => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <div key={c.id} className="glass-panel p-4" style={{ borderLeft: `3px solid ${moodColor(c.mood)}`, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {c.userPhoto
                            ? <img src={c.userPhoto} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>{c.userName?.charAt(0)}</div>
                          }
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.userName}</div>
                            <div style={{ fontSize: '0.75rem', color: moodColor(c.mood) }}>{moodLabel(c.mood)}</div>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                      </div>

                      {isExpanded && (
                        <div className="flex-col gap-3 mt-4" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                          {c.accomplished && (
                            <div>
                              <div className="text-xs text-muted mb-1">✅ Realizou</div>
                              <div className="text-sm">{c.accomplished}</div>
                            </div>
                          )}
                          {c.planned && (
                            <div>
                              <div className="text-xs text-muted mb-1">📋 Planeja</div>
                              <div className="text-sm">{c.planned}</div>
                            </div>
                          )}
                          {c.blockers && (
                            <div>
                              <div className="text-xs text-muted mb-1">🚧 Bloqueios</div>
                              <div className="text-sm" style={{ color: c.blockers.toLowerCase().includes('nenhum') ? 'inherit' : 'var(--warning)' }}>{c.blockers}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
    </div>
  );
}
