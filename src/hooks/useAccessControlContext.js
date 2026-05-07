import { useContext } from 'react';
import { AccessControlContext } from '../contexts/AccessControlContextInstance';

export function useAccessControlContext() {
  const context = useContext(AccessControlContext);
  if (context === undefined) {
    throw new Error('useAccessControlContext must be used within an AccessControlProvider');
  }
  return context;
}
