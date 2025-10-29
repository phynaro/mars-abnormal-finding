/**
 * EXAMPLE USAGE OF PERMISSION CHECKER
 * 
 * This file shows how to use the permission checker utility
 * and how to implement the validation logic.
 */

import { checkPermission, hasAnyPermission, hasAllPermissions, PERMISSION_CONFIG } from './permissionChecker';

// ============================================
// EXAMPLE 1: Basic Permission Check
// ============================================

export function Example1_BasicCheck() {
  const personNo = 541;
  
  // Check if user has admin permission
  const result = checkPermission(personNo, 'admin');
  
  if (result.allowed) {
    console.log('User has admin permission');
  } else {
    console.log('Access denied:', result.reason);
  }
}

// ============================================
// EXAMPLE 2: Simple Boolean Check
// ============================================

export function Example2_BooleanCheck() {
  const personNo = 541;
  
  // Direct boolean check
  if (checkPermission(personNo, 'admin').allowed) {
    // Show admin features
    console.log('Showing admin panel');
  }
}

// ============================================
// EXAMPLE 3: Check Multiple Permissions (OR)
// ============================================

export function Example3_AnyPermission() {
  const personNo = 541;
  
  // User needs to have at least one of these permissions
  if (hasAnyPermission(personNo, ['admin', 'manager'])) {
    console.log('User is either admin or manager');
  }
}

// ============================================
// EXAMPLE 4: Check Multiple Permissions (AND)
// ============================================

export function Example4_AllPermissions() {
  const personNo = 541;
  
  // User needs to have ALL of these permissions
  if (hasAllPermissions(personNo, ['user', 'ticket_create'])) {
    console.log('User can create tickets');
  }
}

// ============================================
// EXAMPLE 5: In React Component
// ============================================

/*
import { checkPermission } from '@/utils/permissionChecker';
import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user } = useAuth();
  
  const canEditTicket = checkPermission(user?.id, 'ticket_edit').allowed;
  const canApprove = checkPermission(user?.id, 'ticket_approve').allowed;
  
  return (
    <div>
      {canEditTicket && <button>Edit</button>}
      {canApprove && <button>Approve</button>}
    </div>
  );
}
*/

// ============================================
// EXAMPLE 6: Conditional Rendering
// ============================================

/*
export function AdminPanel() {
  const { user } = useAuth();
  
  if (!checkPermission(user?.id, 'admin').allowed) {
    return <AccessDenied />;
  }
  
  return <AdminDashboard />;
}
*/

// ============================================
// EXAMPLE 7: Route Protection
// ============================================

/*
import { Navigate } from 'react-router-dom';
import { checkPermission } from '@/utils/permissionChecker';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children, requiredPermission }) {
  const { user } = useAuth();
  
  if (!checkPermission(user?.id, requiredPermission).allowed) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
}

// Usage:
<ProtectedRoute requiredPermission="admin">
  <UserManagementPage />
</ProtectedRoute>
*/

// ============================================
// EXAMPLE IMPLEMENTATION OF checkPermission
// ============================================

/*
// Here's how you might implement the actual validation logic:

export function checkPermission(
  personNo: number | undefined | null,
  permission: PermissionType
): PermissionCheckResult {
  if (!personNo || personNo <= 0) {
    return { allowed: false, reason: 'Invalid PersonNo' };
  }

  // Get user data from context or store
  const user = getUserFromContext(personNo);
  
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  // Get permission config
  const config = PERMISSION_CONFIG[permission];
  
  if (!config) {
    return { allowed: false, reason: 'Unknown permission type' };
  }

  // Check by group code
  if (config.groupCodes.includes(user.groupCode)) {
    return { allowed: true };
  }

  // Check by level
  if (user.levelReport >= config.level) {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: `User does not have ${permission} permission` 
  };
}
*/

// ============================================
// EXAMPLE: Integration with API
// ============================================

/*
import authService from '@/services/authService';

export async function checkPermissionWithAPI(
  personNo: number,
  permission: string
): Promise<PermissionCheckResult> {
  try {
    // Call backend API to check permission
    const response = await fetch(`/api/users/${personNo}/permissions/${permission}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    const result = await response.json();
    
    return {
      allowed: result.hasPermission,
      reason: result.message
    };
  } catch (error) {
    return {
      allowed: false,
      reason: 'Error checking permission'
    };
  }
}
*/

