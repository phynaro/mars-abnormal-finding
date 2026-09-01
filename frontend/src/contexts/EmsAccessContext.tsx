import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;
  const [loading, setLoading] = useState(true);
  const [emsRoles, setEmsRoles] = useState<EmsRole[]>([]);
  const [canAccess, setCanAccess] = useState(false);
  const [canAdmin, setCanAdmin] = useState(false);

  const refresh = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const currentUser = userRef.current;
    if (!isAuthenticated || userId == null || !currentUser) {
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
      const fallbackAccess = checkEmsAccess({
        levelReport: currentUser.permissionLevel,
        emsRoles: [],
      });
      const fallbackAdmin = checkEmsAdmin({
        levelReport: currentUser.permissionLevel,
        emsRoles: [],
      });
      setEmsRoles([]);
      setCanAccess(fallbackAccess.allowed);
      setCanAdmin(fallbackAdmin.allowed);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, userId]);

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
