import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { AccessControlContext } from './AccessControlContextInstance';

export function AccessControlProvider({ children, user }) {
  const [rolePermissions, setRolePermissions] = useState({});
  const [screenRules, setScreenRules] = useState([]);
  const [aclLoading, setAclLoading] = useState(true);

  // Refs para evitar setState em componente desmontado
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (user?.isDemo) {
      const timer = setTimeout(() => {
        if (!mounted.current) return;
        setRolePermissions(prev => (Object.keys(prev).length > 0 ? {} : prev));
        setScreenRules(prev => (prev.length > 0 ? [] : prev));
        setAclLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Só faz subscribe se houver usuário logado
    if (!user) {
      // Using timeout to avoid synchronous setState warning in effect body
      const timer = setTimeout(() => {
        if (!mounted.current) return;
        setRolePermissions(prev => (Object.keys(prev).length > 0 ? {} : prev));
        setScreenRules(prev => (prev.length > 0 ? [] : prev));
        setAclLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let loadedPermissions = false;
    let loadedRules = false;

    const checkDone = () => {
      if (loadedPermissions && loadedRules && mounted.current) {
        setAclLoading(false);
      }
    };

    const loadingTimer = setTimeout(() => {
      if (mounted.current) setAclLoading(true);
    }, 0);

    // Subscribe 1: settings/rolePermissions
    const unsubPermissions = onSnapshot(
      doc(db, 'settings', 'rolePermissions'),
      (snap) => {
        if (!mounted.current) return;
        const data = snap.exists() ? snap.data() : {};
        setRolePermissions(data);
        loadedPermissions = true;
        checkDone();
      },
      (err) => {
        console.error('[ACL] Erro ao carregar rolePermissions:', err);
        loadedPermissions = true;
        checkDone();
      }
    );

    // Subscribe 2: coleção rules/
    const unsubRules = onSnapshot(
      collection(db, 'rules'),
      (snap) => {
        if (!mounted.current) return;
        const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setScreenRules(rules);
        loadedRules = true;
        checkDone();
      },
      (err) => {
        console.error('[ACL] Erro ao carregar rules:', err);
        loadedRules = true;
        checkDone();
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubPermissions();
      unsubRules();
    };
  }, [user]); 

  return (
    <AccessControlContext.Provider value={{ rolePermissions, screenRules, aclLoading }}>
      {children}
    </AccessControlContext.Provider>
  );
}
