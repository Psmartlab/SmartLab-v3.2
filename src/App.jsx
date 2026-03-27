import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation, Link } from 'react-router-dom';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { Loader2, AlertCircle, LayoutDashboard, Shield, Users as UsersIcon, ClipboardCheck } from 'lucide-react';
import { cn } from './utils/cn';
import Dashboard from './views/Dashboard';
import Tasks from './views/Tasks/index';
import Teams from './views/Teams';
import UsersPanel from './views/Users';
import Checkins from './views/Checkins';
import TaskControl from './views/TaskControl';
import Projects from './views/Projects';
import SeedData from './views/SeedData';
import Notifications from './views/Notifications';
import SettingsPage from './views/Settings/index';
import Chat from './views/Chat';
import TeamDashboard from './views/TeamDashboard';
import ProjectDashboard from './views/ProjectDashboard';
import UserDashboard from './views/UserDashboard';
import Profile from './views/Profile';
import DashboardLayout from './components/layout/DashboardLayout';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { useAccessControl } from './hooks/useAccessControl';

/**
 * ProtectedRoute — Bloqueia acesso por URL direta se o usuário não tiver permissão.
 * Usa o mesmo sistema ACL (RBAC + Rule Engine) do menu lateral.
 */
const ProtectedRoute = ({ screenId, element, user }) => {
  const { canAccessScreen, aclLoading } = useAccessControl(user);

  if (aclLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
      </div>
    );
  }

  return canAccessScreen(screenId) ? element : <Navigate to="/" replace />;
};

// --- Login Screen ---
const Login = ({ setUser }) => {
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async () => {
    try {
      console.log("Iniciando login (Popup)...");
      setErrorMsg("Carregando (Abrindo Janela)...");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMsg(`Erro: ${error.message}`);
    }
  };

  const handlePopupLogin = async () => {
    try {
      console.log("Iniciando login (Popup)...");
      setErrorMsg("Abrindo janela de login...");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Popup Login Error:", error);
      setErrorMsg(`Erro no Popup: ${error.message}`);
    }
  };

  const handleMockLogin = (role = 'Admin') => {
    const roleConfig = {
      'Admin': {
        uid: 'demo-admin-id',
        email: 'henrique@smartlab.com.br',
        displayName: 'Henrique Admin (Demo)',
      },
      'Gerente': {
        uid: 'demo-manager-id',
        email: 'gerente@smartlab.com.br',
        displayName: 'Carlos Gerente (Demo)',
      },
      'User': {
        uid: 'demo-user-id',
        email: 'usuario@smartlab.com.br',
        displayName: 'Ana Operacional (Demo)',
      }
    };

    const config = roleConfig[role] || roleConfig['Admin'];
    
    const demoUser = {
      ...config,
      role: role,
      isDemo: true,
      photoURL: null
    };
    setUser(demoUser);
    localStorage.setItem('smartlab-user', JSON.stringify(demoUser));
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 w-full min-h-screen bg-smartlab-bg relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--smartlab-on-surface) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className="bg-smartlab-surface rounded-[32px] md:rounded-[40px] p-6 md:p-12 flex flex-col items-center gap-8 w-full max-w-[480px] border-2 border-smartlab-border shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-smartlab-primary rounded-[24px] md:rounded-[28px] flex items-center justify-center shadow-2xl border-4 border-smartlab-surface -mt-14 md:-mt-20 group-hover:rotate-6 transition-transform">
          <LayoutDashboard size={32} className="text-white" />
        </div>
        
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-black text-smartlab-on-surface font-headline tracking-tighter uppercase italic leading-none">SmartLab</h1>
          <p className="text-[9px] md:text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-[0.2em] md:tracking-[0.3em] mt-3">Gestão de Alto Desempenho</p>
        </div>

        {errorMsg && (
          <div className="w-full bg-red-50 dark:bg-red-950/30 border-2 border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600 leading-tight uppercase tracking-tight">{errorMsg}</p>
          </div>
        )}

        <div className="w-full flex flex-col gap-6">
          <button className="w-full py-5 bg-smartlab-on-surface text-smartlab-surface rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-2 border-transparent" onClick={handleLogin}>
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,11.033H12V12c0,0.552,0.448,1,1,1h3.333c-0.34,1.434-1.5,2.542-3.131,2.9 c-1.631,0.358-3.102-0.301-3.921-1.666c-0.126-0.211-0.37-0.32-0.597-0.258c-0.228,0.061-0.372,0.283-0.342,0.517 c0.124,0.966,0.725,1.802,1.6,2.296C10.749,17.293,11.85,17.5,13,17.5c2.481,0,4.5-2.019,4.5-4.5c0-0.552-0.448-1-1-1h-3.955 L16,11.033z"/></svg>
            Entrar com Google
          </button>

          <div className="grid grid-cols-1 gap-3 w-full">
            <p className="text-[9px] md:text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest text-center mb-1">Acesso Demonstração</p>
            <div className="flex flex-col gap-2 w-full">
              <button className="w-full py-4 bg-smartlab-surface text-smartlab-on-surface rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-2 border-smartlab-border hover:border-smartlab-on-surface hover:bg-smartlab-surface-low transition-all flex items-center justify-center gap-2 group shadow-sm" onClick={() => handleMockLogin('Admin')}>
                <Shield size={16} className="text-smartlab-on-surface-variant group-hover:text-smartlab-on-surface" />
                Admin
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="py-4 px-2 bg-smartlab-surface text-smartlab-on-surface rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider md:tracking-[0.15em] border-2 border-smartlab-border hover:border-blue-500 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-1.5 group shadow-sm" onClick={() => handleMockLogin('Gerente')}>
                  <UsersIcon size={14} className="text-smartlab-on-surface-variant group-hover:text-blue-500" />
                  Gerente
                </button>
                <button className="py-4 px-2 bg-smartlab-surface text-smartlab-on-surface rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider md:tracking-[0.15em] border-2 border-smartlab-border hover:border-emerald-500 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-1.5 group shadow-sm" onClick={() => handleMockLogin('User')}>
                  <ClipboardCheck size={16} className="text-smartlab-on-surface-variant group-hover:text-emerald-500" />
                  Equipe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-smartlab-border w-full text-center">
          <button onClick={handlePopupLogin} className="text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest hover:text-smartlab-on-surface transition-colors">
            Problemas? Tente via Popup
          </button>
        </div>
      </div>
      
      <p className="absolute bottom-8 text-[10px] font-black text-smartlab-on-surface-variant uppercase tracking-widest italic">v3.1 // BOARD PERFORMANCE EDITION</p>
    </div>
  );
};


// --- App Root ---
function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smartlab-user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.isDemo) return parsed;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('smartlab-user');
      setUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  useEffect(() => {
    console.log("App mounted. Checking auth...");
    
    // Timeout de segurança para não ficar travado no loading
    const timer = setTimeout(() => {
      setLoading(false);
      console.warn("Auth timeout: Force loading to false.");
    }, 5000);

    // Captura o resultado do login por redirecionamento
    getRedirectResult(auth).then(async (res) => {
      if (res?.user) {
        console.log("Login por redirecionamento sucesso:", res.user.email);
        const userDoc = await getDoc(doc(db, 'users', res.user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setUser({ ...res.user, role: userData.role || 'User' });
        setLoading(false);
      }
    }).catch(e => {
      if (e.code !== 'auth/redirect-cancelled-by-user') {
        console.error("Erro no redirecionamento:", e);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth State Changed:", currentUser?.email);
      clearTimeout(timer);
      try {
        if (currentUser) {
          // Remove o demo user se um real entrar
          localStorage.removeItem('smartlab-user');
          
          // Recupera o cargo do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          let role = userData.role || 'User';
          
          // Fallback: Se não encontrou cargo pelo UID...
          if (!userData.role && currentUser.email) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const emailDoc = snap.docs[0].data();
                role = emailDoc.role || 'User';
                console.log("Cargo recuperado via Email:", role);
              }
            } catch (e) {
              console.error("Erro ao buscar cargo por email:", e);
            }
          }

          setUser({
            ...currentUser,
            ...userData,
            role: role
          });
          
          setDoc(doc(db, 'users', currentUser.uid), {
            uid: currentUser.uid,
            name: currentUser.displayName || 'Sem Nome',
            email: currentUser.email || '',
            photo: currentUser.photoURL || null
          }, { merge: true }).catch(e => console.error("Erro ao salvar usuário:", e));
        } else {
          // Só limpa o user se NÃO for um demo user
          setUser(prev => (prev?.isDemo ? prev : null));
        }
      } catch (error) {
        console.error("Auth state error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login setUser={setUser} />}
        />
        <Route path="/*" element={
          user ? (
            <AccessControlProvider user={user}>
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Routes>
                  {/* Rotas abertas (sem proteção ACL extra) */}
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/tasks" element={<Tasks user={user} />} />
                  <Route path="/checkins" element={<Checkins user={user} />} />
                  <Route path="/profile" element={<Profile user={user} />} />
                  <Route path="/notifications" element={<Notifications user={user} />} />

                  {/* Rotas legadas — mantidas para compatibilidade de links antigos */}
                  <Route path="/dashboard/teams" element={<TeamDashboard user={user} />} />
                  <Route path="/dashboard/projects" element={<ProjectDashboard user={user} />} />
                  <Route path="/dashboard/users" element={<UserDashboard user={user} />} />

                  {/* Rotas protegidas por ACL — ProtectedRoute redireciona para / se sem acesso */}
                  <Route
                    path="/control"
                    element={<ProtectedRoute screenId="screen:control" element={<TaskControl user={user} />} user={user} />}
                  />
                  <Route
                    path="/teams"
                    element={<ProtectedRoute screenId="screen:teams" element={<Teams user={user} />} user={user} />}
                  />
                  <Route
                    path="/projects"
                    element={<ProtectedRoute screenId="screen:projects" element={<Projects user={user} />} user={user} />}
                  />
                  <Route
                    path="/users"
                    element={<ProtectedRoute screenId="screen:users" element={<UsersPanel user={user} />} user={user} />}
                  />
                  <Route
                    path="/settings"
                    element={<ProtectedRoute screenId="screen:settings" element={<SettingsPage user={user} />} user={user} />}
                  />
                  <Route
                    path="/seed"
                    element={<ProtectedRoute screenId="screen:seed" element={<SeedData user={user} />} user={user} />}
                  />
                </Routes>
              </DashboardLayout>
            </AccessControlProvider>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
