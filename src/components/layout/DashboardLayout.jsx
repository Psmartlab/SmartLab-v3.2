import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, Bell, Settings, Plus, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useAccessControl } from '../../hooks/useAccessControl';
import {
  SCREEN_REGISTRY,
  getSidebarScreens,
  getMobileScreens,
} from '../../constants/screenPermissions';

const DashboardLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { canAccessScreen, aclLoading } = useAccessControl(user);

  const isActive = (path) => location.pathname === path;

  // Fechar notifcações ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Telas visíveis na sidebar (já filtradas pelo ACL)
  const sidebarScreens = getSidebarScreens((screenId) => canAccessScreen(screenId));

  // Telas visíveis no mobile (já filtradas pelo ACL)
  const mobileScreens = getMobileScreens((screenId) => canAccessScreen(screenId));

  // Verifica se o usuário pode ver a tela de Gestão para o botão FAB mobile
  const canAccessControl = canAccessScreen('screen:control');

  return (
    <div className="min-h-screen bg-smartlab-bg text-smartlab-on-surface antialiased flex flex-col md:flex-row overflow-x-hidden w-full">
      {/* ─── TopNavBar ──────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full flex justify-between items-center px-4 md:px-10 py-4 md:py-5 bg-smartlab-surface/80 backdrop-blur-2xl border-b-2 border-smartlab-border shadow-[var(--glass-shadow)] z-[60]">
        <div className="flex items-center gap-4 md:gap-10">
          <div
            className="flex items-center gap-3 md:gap-4 group cursor-pointer"
            onClick={() => (window.location.href = '/')}
          >
            <div className="w-8 h-8 md:w-10 md:h-10 bg-smartlab-primary rounded-xl md:rounded-2xl flex items-center justify-center transition-transform shadow-lg group-hover:rotate-6">
              <span className="text-white font-black text-xl md:text-2xl italic font-headline">S</span>
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-smartlab-on-surface font-headline uppercase italic leading-none hidden sm:block">
              SmartLab
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          {/* Configurações (apenas para quem tem acesso) */}
          {canAccessScreen('screen:settings') && (
            <Link
              to="/settings"
              className="p-2.5 md:p-3 bg-smartlab-surface-low text-smartlab-on-surface-variant border-2 border-smartlab-border rounded-2xl hover:border-smartlab-on-surface hover:text-smartlab-on-surface transition-all"
            >
              <Settings size={20} />
            </Link>
          )}

          {/* Notificações */}
          <div className="relative flex items-center" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={cn(
                'p-3 rounded-2xl transition-all relative outline-none flex items-center justify-center border-2',
                showNotifs
                  ? 'bg-smartlab-surface border-smartlab-on-surface text-smartlab-on-surface'
                  : 'bg-smartlab-surface-low border-smartlab-border text-smartlab-on-surface-variant hover:border-smartlab-on-surface-variant'
              )}
            >
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-smartlab-surface shadow-sm" />
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-16 w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] bg-smartlab-surface/95 backdrop-blur-xl rounded-[32px] shadow-[var(--glass-shadow)] border-2 border-smartlab-border overflow-hidden z-[70] animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-8 border-b-2 border-smartlab-border flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-none">
                      Alertas
                    </h3>
                    <p className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest mt-2">
                      Atividade recente
                    </p>
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifs(false)}
                    className="text-[10px] font-black text-smartlab-on-surface-variant hover:text-smartlab-on-surface uppercase tracking-widest border-b-2 border-transparent hover:border-smartlab-on-surface transition-all pb-1"
                  >
                    Board Completo
                  </Link>
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                  <div className="p-6 border-b-2 border-smartlab-border hover:bg-smartlab-surface-low cursor-pointer transition-all flex gap-4 pr-10">
                    <div className="w-1.5 h-10 bg-indigo-500 rounded-full shrink-0" />
                    <div>
                      <p className="text-xs font-black text-smartlab-on-surface uppercase tracking-tight leading-tight">
                        Reunião Start-up
                      </p>
                      <p className="text-[11px] font-bold text-smartlab-on-surface-variant mt-1 leading-relaxed">
                        Em 15 minutos na sala principal.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 border-b-2 border-smartlab-border hover:bg-red-500/5 cursor-pointer transition-all flex gap-4 pr-10">
                    <div className="w-1.5 h-10 bg-red-500 rounded-full shrink-0 animate-pulse" />
                    <div>
                      <p className="text-xs font-black text-red-600 uppercase tracking-tight leading-tight">
                        Alerta: Atraso Crítico
                      </p>
                      <p className="text-[11px] font-bold text-smartlab-on-surface-variant mt-1 leading-relaxed italic">
                        Projeto H2N2 com pendências.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-smartlab-surface-low text-center">
                  <button
                    onClick={() => setShowNotifs(false)}
                    className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest hover:text-smartlab-on-surface transition-colors"
                  >
                    Limpar Central
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => onLogout()}
            className="p-2.5 md:p-3 bg-red-500/10 text-red-500 border-2 border-red-500/20 rounded-2xl hover:border-red-500 hover:text-white hover:bg-red-500 transition-all"
          >
            <LogOut size={20} />
          </button>

          {/* Avatar */}
          <Link
            to="/profile"
            className="ml-2 flex items-center gap-3 pl-1 pr-4 py-1.5 bg-smartlab-on-surface rounded-full border-2 border-transparent hover:scale-105 transition-all shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-smartlab-surface flex items-center justify-center font-black text-smartlab-on-surface text-xs overflow-hidden border-2 border-smartlab-border">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.email?.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-[11px] font-black text-smartlab-surface uppercase tracking-widest hidden lg:block">
              {user?.displayName?.split(' ')[0] || 'Usuário'}
            </span>
          </Link>
        </div>
      </nav>

      {/* ─── Sidebar Desktop ─────────────────────────────────────── */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 h-screen flex flex-col p-8 bg-smartlab-surface/95 backdrop-blur-xl w-[280px] pt-32 border-r-2 border-smartlab-border shadow-[var(--glass-shadow)] z-50">
          <nav className="flex-1 flex flex-col gap-2">
            {aclLoading ? (
              // Skeleton enquanto as regras carregam
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[52px] rounded-2xl bg-smartlab-surface-low animate-pulse"
                />
              ))
            ) : (
              sidebarScreens.map(([screenId, screen]) => {
                const Icon = screen.icon;
                const active = isActive(screen.path);
                return (
                  <React.Fragment key={screenId}>
                    {screen.dividerBefore && (
                      <div className="h-px bg-smartlab-border my-3 mx-2" />
                    )}
                    <Link
                      to={screen.path}
                      className={cn(
                        'flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all duration-300 relative group',
                        active
                          ? 'bg-smartlab-on-surface text-smartlab-surface shadow-[0_10px_30px_rgba(0,0,0,0.15)] translate-x-1'
                          : 'text-smartlab-on-surface-variant hover:bg-smartlab-on-surface/5 hover:text-smartlab-on-surface'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                          active
                            ? 'bg-accent text-white shadow-lg'
                            : 'bg-smartlab-surface-low text-smartlab-on-surface-variant group-hover:text-accent'
                        )}
                      >
                        <Icon size={18} className={cn(active && 'stroke-[2.5px]')} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] italic font-headline">
                        {screen.label}
                      </span>
                    </Link>
                  </React.Fragment>
                );
              })
            )}
          </nav>
        </aside>
      )}

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main
        className={cn(
          'flex-1 pt-32 md:pt-32 px-4 md:px-10 pb-32 md:pb-12 min-h-screen bg-smartlab-bg min-w-0 flex flex-col items-center max-w-[100vw] overflow-x-hidden transition-all duration-300',
          !isMobile && 'ml-[280px]'
        )}
      >
        <div className="w-full max-w-[100vw] md:max-w-[2560px] mx-auto h-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* ─── Bottom Nav Mobile ───────────────────────────────────── */}
      {isMobile && (
        <nav className="fixed bottom-6 left-4 right-4 h-20 bg-smartlab-surface/85 backdrop-blur-[24px] rounded-[32px] shadow-[var(--glass-shadow)] border-2 border-smartlab-border flex justify-between items-center px-8 z-[60] animate-in slide-in-from-bottom-8 duration-500">
          {mobileScreens.slice(0, 2).map(([screenId, screen]) => {
            const Icon = screen.icon;
            return (
              <Link
                key={screenId}
                to={screen.path}
                className={cn(
                  'flex flex-col items-center gap-1 transition-all duration-300',
                  isActive(screen.path) ? 'text-smartlab-on-surface scale-110' : 'text-smartlab-on-surface-variant'
                )}
              >
                <Icon size={22} className={cn(isActive(screen.path) && 'stroke-[2.5px]')} />
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                  {screen.label}
                </span>
              </Link>
            );
          })}

          {/* FAB central — apenas para quem tem acesso à Gestão */}
          {canAccessControl ? (
            <div className="relative -top-10">
              <Link
                to="/control"
                className="flex items-center justify-center bg-smartlab-on-surface w-16 h-16 rounded-[24px] text-smartlab-surface shadow-2xl border-4 border-smartlab-surface active:scale-90 hover:scale-105 transition-all"
              >
                <Plus size={32} />
              </Link>
            </div>
          ) : (
            <div className="w-16 h-16" />
          )}

          <Link
            to="/profile"
            className={cn(
              'flex flex-col items-center gap-1 transition-all duration-300',
              isActive('/profile') ? 'text-smartlab-on-surface scale-110' : 'text-smartlab-on-surface-variant'
            )}
          >
            <div className="w-6 h-6 rounded-full bg-smartlab-surface-low flex items-center justify-center text-xs font-black">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">Perfil</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default DashboardLayout;
