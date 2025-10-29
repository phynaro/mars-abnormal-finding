import authService from './authService';
import { getAuthHeaders } from '../utils/authHeaders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  personCode?: string;
  phone?: string;
  title?: string;
  department?: number;
  departmentCode?: string;
  departmentName?: string;
  craft?: number;
  crew?: number;
  siteNo?: number;
  siteCode?: string;
  siteName?: string;
  groupNo: number;
  groupCode: string;
  groupName: string;
  levelReport?: number;
  permissionLevel: number;
  storeRoom?: number;
  dbNo?: number;
  lineId?: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface CreateUserData {
  userId: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  personCode?: string;
  department?: number;
  craft?: number;
  crew?: number;
  siteNo?: number;
  groupNo: number;
  levelReport?: number;
  storeRoom?: number;
  dbNo?: number;
  lineId?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: number;
  craft?: number;
  crew?: number;
  siteNo?: number;
  groupNo?: number;
  levelReport?: number;
  storeRoom?: number;
  dbNo?: number;
  lineId?: string;
  isActive?: boolean;
}

export interface Group {
  groupNo: number;
  groupCode: string;
  groupName: string;
}

export interface Department {
  deptNo: number;
  deptCode: string;
  deptName: string;
}

export interface UserManagementResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface AvailableGroup {
  groupNo: number;
  groupCode: string;
  groupName: string;
}

class UserManagementService {

  // Get all users (L3 only)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/all`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      return result.users || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch users');
    }
  }

  // Get user by ID
  async getUserById(userId: number | string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch user');
      }

      return result.user;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch user');
    }
  }

  // Create new user
  async createUser(userData: CreateUserData): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create user');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create user');
    }
  }

  // Update user
  async updateUser(userId: number | string, userData: UpdateUserData): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user');
    }
  }

  // Delete user (soft delete by setting isActive to false)
  async deleteUser(userId: number | string): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete user');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  }

  // Update user role
  async updateUserRole(userId: number | string, role: string, permissionLevel: number): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role, permissionLevel }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update user role');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  }

  // Get available groups
  async getGroups(): Promise<Group[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/groups`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch groups');
      }

      return result.groups || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch groups');
    }
  }

  // Get available departments
  async getDepartments(): Promise<Department[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/departments`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch departments');
      }

      return result.departments || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch departments');
    }
  }

  // Reset user password
  async resetUserPassword(userId: number | string, newPassword: string): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset password');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to reset password');
    }
  }

  // Get user activity logs
  async getUserActivityLogs(userId: number | string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/activity?limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch user activity');
      }

      return result.logs || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch user activity');
    }
  }

  // Bulk update users
  async bulkUpdateUsers(updates: Array<{ userId: number; updates: UpdateUserData }>): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/bulk-update`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to bulk update users');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to bulk update users');
    }
  }

}

export const userManagementService = new UserManagementService();
export default userManagementService;
