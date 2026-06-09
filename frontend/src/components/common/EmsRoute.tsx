import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEmsAccess } from '@/contexts/EmsAccessContext';
import { checkEmsAccess } from '@/utils/permissionChecker';
import Loading from '@/components/common/Loading';
import { AccessDenied } from './AccessDenied';

interface EmsRouteProps {
  children: React.ReactNode;
}

/**
 * EMS module gate: L2+ engineers or any EMS role.
 */
const EmsRoute: React.FC<EmsRouteProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { loading, canAccess, emsRoles } = useEmsAccess();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <Loading message="Loading EMS..." />;
  }

  const allowed =
    canAccess ||
    checkEmsAccess({ levelReport: user?.permissionLevel, emsRoles }).allowed;

  if (!allowed) {
    return (
      <AccessDenied message="EMS access requires engineer level (L2+) or an EMS role." />
    );
  }

  return <>{children}</>;
};

export default EmsRoute;
