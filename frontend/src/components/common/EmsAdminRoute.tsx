import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmsAccess } from '@/contexts/EmsAccessContext';
import { checkEmsAdmin } from '@/utils/permissionChecker';
import Loading from '@/components/common/Loading';
import { AccessDenied } from './AccessDenied';

interface EmsAdminRouteProps {
  children: React.ReactNode;
}

const EmsAdminRoute: React.FC<EmsAdminRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const { loading, canAdmin, emsRoles } = useEmsAccess();

  if (loading) {
    return <Loading message="Loading..." />;
  }

  const allowed =
    canAdmin ||
    checkEmsAdmin({ levelReport: user?.permissionLevel, emsRoles }).allowed;

  if (!allowed) {
    return <AccessDenied message="EMS admin access required (L3 or Plant Manager role)." />;
  }

  return <>{children}</>;
};

export default EmsAdminRoute;
