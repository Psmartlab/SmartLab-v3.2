import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  doc,
} from 'firebase/firestore';

/**
 * AccessControlContext
 * Provider que mantém em cache, via onSnapshot, os dados necessários
 * para avaliação de acesso em tempo real:
 *
 *  - rolePermissions: { [permissionKey]: { Admin, Gerente, User } }
 *    Documento: settings/rolePermissions
 *
 *  - screenRules: Rule[]
 *    Coleção: rules/  (cada doc = uma regra)
 *
 * Qualquer edição no Firestore atualiza o contexto sem refresh.
 */

const AccessControlContext = createContext({
  rolePermissions: {},
  screenRules: [],
  aclLoading: true,
});

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
    // Só faz subscribe se houver usuário logado
    if (!user) {
      setRolePermissions({});
      setScreenRules([]);
      setAclLoading(false);
      return;
    }

    let loadedPermissions = false;
    let loadedRules = false;

    const checkDone = () => {
      if (loadedPermissions && loadedRules && mounted.current) {
        setAclLoading(false);
      }
    };

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
      unsubPermissions();
      unsubRules();
    };
  }, [user?.uid]); // re-subscribe apenas se o usuário mudar

  return (
    <AccessControlContext.Provider value={{ rolePermissions, screenRules, aclLoading }}>
      {children}
    </AccessControlContext.Provider>
  );
}

export function useAccessControlContext() {
  return useContext(AccessControlContext);
}
