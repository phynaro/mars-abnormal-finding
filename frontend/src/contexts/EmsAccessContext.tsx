import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/useAuth';
import emsService from '@/services/emsService';
import type { EmsRole } from '@/utils/permissionChecker';
import { checkEmsAccess, checkEmsAdmin } from '@/utils/permissionChecker';

interface EmsAccessState {
  loading: boolean;
  emsRoles: EmsRole[];
  canAccess: boolean;
  canAdmin: boolean;
  refresh: () => Promise<void>;
}

const EmsAccessContext = createContext<EmsAccessState | undefined>(undefined);

export const EmsAccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emsRoles, setEmsRoles] = useState<EmsRole[]>([]);
  const [canAccess, setCanAccess] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setEmsRoles([]);
      setCanAccess(false);
      setCanAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await emsService.getMe();
      setEmsRoles(data.emsRoles || []);
      setCanAccess(data.canAccess);
      setCanAdmin(data.canAdmin);
    } catch {
      const fallbackAccess = checkEmsAccess({ levelReport: user.permissionLevel, emsRoles: [] });
      const fallbackAdmin = checkEmsAdmin({ levelReport: user.permissionLevel, emsRoles: [] });
      setEmsRoles([]);
      setCanAccess(fallbackAccess.allowed);
      setCanAdmin(fallbackAdmin.allowed);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <EmsAccessContext.Provider value={{ loading, emsRoles, canAccess, canAdmin, refresh }}>
      {children}
    </EmsAccessContext.Provider>
  );
};

// Provider and hook intentionally stay together because the hook consumes this module's private state shape.
// eslint-disable-next-line react-refresh/only-export-components
export function useEmsAccess() {
  const ctx = useContext(EmsAccessContext);
  if (!ctx) {
    throw new Error('useEmsAccess must be used within EmsAccessProvider');
  }
  return ctx;
}
