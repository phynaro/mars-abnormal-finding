/**
 * PermissionRoute Component
 * 
 * A wrapper component for protecting routes based on user permissions
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { checkPermission, type PermissionType } from '@/utils/permissionChecker';
import { AccessDenied } from './AccessDenied';

interface PermissionRouteProps {
  children: React.ReactNode;
  requiredPermission: PermissionType;
  redirectTo?: string;
  showAccessDenied?: boolean;
}

/**
 * PermissionRoute - Protects routes based on user permissions
 * 
 * @param children - The component to render if user has permission
 * @param requiredPermission - The permission type required to access this route
 * @param redirectTo - Optional path to redirect if no permission (default: /home)
 * @param showAccessDenied - Show AccessDenied component instead of redirecting (default: true)
 * 
 * @example
 * <PermissionRoute requiredPermission="admin">
 *   <UserManagementPage />
 * </PermissionRoute>
 * 
 * @example
 * <PermissionRoute requiredPermission="settings_access" redirectTo="/home" showAccessDenied={false}>
 *   <SettingsPage />
 * </PermissionRoute>
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  requiredPermission,
  redirectTo = '/home',
  showAccessDenied = true,
}) => {
  const { user } = useAuth();

  // Check if user has the required permission
  const permissionCheck = checkPermission(user?.id, requiredPermission);

  // If user has permission, render children
  if (permissionCheck.allowed) {
    return <>{children}</>;
  }

  // If user doesn't have permission
  if (showAccessDenied) {
    // Show access denied page
    return (
      <AccessDenied 
        message={permissionCheck.reason || `You don't have permission to access this page. Required: ${requiredPermission}`} 
      />
    );
  } else {
    // Redirect to specified path
    return <Navigate to={redirectTo} replace />;
  }
};

export default PermissionRoute;

