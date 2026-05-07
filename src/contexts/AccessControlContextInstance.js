import { createContext } from 'react';

export const AccessControlContext = createContext({
  rolePermissions: {},
  screenRules: [],
  aclLoading: true,
});
