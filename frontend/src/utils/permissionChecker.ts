/**
 * Permission Checker Utility
 * 
 * A simple utility to check user permissions in the frontend
 * based on PersonNo and permission type.
 */

// Permission types that can be checked
export type PermissionType = 
  | 'admin'
  | 'manager'
  | 'user'
  | 'viewer'
  | 'editor'
  | 'approver'
  | 'ticket_create'
  | 'ticket_edit'
  | 'ticket_delete'
  | 'ticket_approve'
  | 'user_management'
  | 'settings_access'
  | string; // Allow custom permission strings

// Result interface for permission check
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// ============================================
// HARDCODED ADMIN USERS
// ============================================
const ADMIN_USERS: number[] = [517,550, 548, 521, 133,526];

// ============================================
// HARDCODED MANAGER USERS
// ============================================
const MANAGER_USERS: number[] = []; // Add manager PersonNos here

// ============================================
// HARDCODED REGULAR USERS
// ============================================
const REGULAR_USERS: number[] = []; // Add regular user PersonNos here

/**
 * Check if a user has a specific permission
 * 
 * @param personNo - The PersonNo of the user to check
 * @param permission - The permission type to check (e.g., 'admin', 'manager')
 * @returns PermissionCheckResult - Object with allowed boolean and optional reason
 * 
 * @example
 * const result = checkPermission(541, 'admin');
 * if (result.allowed) {
 *   // User has admin permission
 * }
 * 
 * @example
 * // Simple boolean check
 * if (checkPermission(541, 'admin').allowed) {
 *   // User has admin permission
 * }
 */
export function checkPermission(
  personNo: number | undefined | null,
  permission: PermissionType
): PermissionCheckResult {
  // Guard: Check if personNo is valid
  if (!personNo || personNo <= 0) {
    return {
      allowed: false,
      reason: 'Invalid PersonNo'
    };
  }

  // Check permission based on type
  switch (permission.toLowerCase()) {
    case 'admin':
      // Check if user is in hardcoded admin list
      if (ADMIN_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User is not an admin'
      };
      
    case 'manager':
      // Admins also have manager permissions
      if (ADMIN_USERS.includes(personNo) || MANAGER_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User is not a manager'
      };
      
    case 'user':
      // Admins, managers, and regular users all have user permissions
      if (ADMIN_USERS.includes(personNo) || 
          MANAGER_USERS.includes(personNo) || 
          REGULAR_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User not found in permission list'
      };
      
    case 'viewer':
      // All authenticated users can view
      return {
        allowed: true
      };
      
    case 'ticket_create':
      // Admins, managers, and regular users can create tickets
      if (ADMIN_USERS.includes(personNo) || 
          MANAGER_USERS.includes(personNo) || 
          REGULAR_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot create tickets'
      };
      
    case 'ticket_edit':
      // Admins and managers can edit tickets
      if (ADMIN_USERS.includes(personNo) || MANAGER_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot edit tickets'
      };
      
    case 'ticket_delete':
      // Only admins can delete tickets
      if (ADMIN_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot delete tickets'
      };
      
    case 'ticket_approve':
      // Admins and managers can approve tickets
      if (ADMIN_USERS.includes(personNo) || MANAGER_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot approve tickets'
      };
      
    case 'user_management':
      // Only admins can manage users
      if (ADMIN_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot manage users'
      };
      
    case 'settings_access':
      // Admins and managers can access settings
      if (ADMIN_USERS.includes(personNo) || MANAGER_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: 'User cannot access settings'
      };
      
    default:
      // For any custom permission, default to admin only
      if (ADMIN_USERS.includes(personNo)) {
        return {
          allowed: true
        };
      }
      return {
        allowed: false,
        reason: `Permission type '${permission}' requires admin access`
      };
  }
}

/**
 * Check if user has ANY of the specified permissions
 * 
 * @param personNo - The PersonNo of the user to check
 * @param permissions - Array of permission types to check
 * @returns boolean - True if user has at least one of the permissions
 * 
 * @example
 * if (hasAnyPermission(541, ['admin', 'manager'])) {
 *   // User has either admin or manager permission
 * }
 */
export function hasAnyPermission(
  personNo: number | undefined | null,
  permissions: PermissionType[]
): boolean {
  return permissions.some(permission => 
    checkPermission(personNo, permission).allowed
  );
}

/**
 * Check if user has ALL of the specified permissions
 * 
 * @param personNo - The PersonNo of the user to check
 * @param permissions - Array of permission types to check
 * @returns boolean - True if user has all of the permissions
 * 
 * @example
 * if (hasAllPermissions(541, ['user', 'ticket_create'])) {
 *   // User has both user and ticket_create permissions
 * }
 */
export function hasAllPermissions(
  personNo: number | undefined | null,
  permissions: PermissionType[]
): boolean {
  return permissions.every(permission => 
    checkPermission(personNo, permission).allowed
  );
}

/**
 * Get all permissions for a user
 * 
 * @param personNo - The PersonNo of the user
 * @returns Promise<PermissionType[]> - Array of permission types the user has
 * 
 * @example
 * const permissions = await getUserPermissions(541);
 * console.log(permissions); // ['admin', 'user', 'ticket_create']
 */
export async function getUserPermissions(
  personNo: number | undefined | null
): Promise<PermissionType[]> {
  if (!personNo || personNo <= 0) {
    return [];
  }

  // TODO: Implement logic to fetch user's permissions from API or context
  // Example: Call API endpoint to get user's permissions
  
  // Placeholder - Replace with actual API call
  return [];
}

/**
 * Permission configuration object
 * Define your permission rules here
 */
export const PERMISSION_CONFIG = {
  // Admin permissions
  admin: {
    description: 'Full administrative access',
    level: 3,
    groupCodes: ['ADMIN']
  },
  
  // Manager permissions
  manager: {
    description: 'Manager level access',
    level: 2,
    groupCodes: ['ADMIN', 'MANAGER', 'MP']
  },
  
  // User permissions
  user: {
    description: 'Basic user access',
    level: 1,
    groupCodes: ['ADMIN', 'MANAGER', 'MP', 'USER']
  },
  
  // Feature-specific permissions
  ticket_create: {
    description: 'Can create tickets',
    level: 1,
    groupCodes: ['ADMIN', 'MANAGER', 'MP', 'USER']
  },
  
  ticket_approve: {
    description: 'Can approve tickets',
    level: 2,
    groupCodes: ['ADMIN', 'MANAGER', 'MP']
  },
  
  user_management: {
    description: 'Can manage users',
    level: 3,
    groupCodes: ['ADMIN']
  },
  
  settings_access: {
    description: 'Can access settings',
    level: 2,
    groupCodes: ['ADMIN', 'MANAGER', 'MP']
  }
} as const;

/**
 * Check permission by level
 * 
 * @param userLevel - User's permission level
 * @param requiredLevel - Required permission level
 * @returns boolean - True if user level meets or exceeds required level
 * 
 * @example
 * if (checkPermissionByLevel(3, 2)) {
 *   // User with level 3 can access level 2 features
 * }
 */
export function checkPermissionByLevel(
  userLevel: number | undefined | null,
  requiredLevel: number
): boolean {
  if (!userLevel || userLevel < 1) {
    return false;
  }
  
  return userLevel >= requiredLevel;
}

/**
 * Check permission by group code
 * 
 * @param userGroupCode - User's group code
 * @param allowedGroupCodes - Array of allowed group codes
 * @returns boolean - True if user's group code is in allowed list
 * 
 * @example
 * if (checkPermissionByGroupCode('ADMIN', ['ADMIN', 'MANAGER'])) {
 *   // User with ADMIN group has access
 * }
 */
export function checkPermissionByGroupCode(
  userGroupCode: string | undefined | null,
  allowedGroupCodes: string[]
): boolean {
  if (!userGroupCode) {
    return false;
  }
  
  return allowedGroupCodes.includes(userGroupCode);
}

