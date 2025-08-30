import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeID?: string;
  department?: string;
  shift?: string;
  role: string;
  permissionLevel: number;
  lastLogin?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeID?: string;
  department?: string;
  shift?: string;
  role: string;
  permissionLevel: number;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeID?: string;
  department?: string;
  shift?: string;
  role?: string;
  permissionLevel?: number;
  isActive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissionLevel: number;
  permissions: string[];
}

export interface UserManagementResponse {
  success: boolean;
  message: string;
  data?: any;
}

class UserManagementService {
  private getAuthHeaders(): Record<string, string> {
    return authService.getAuthHeaders();
  }

  // Get all users (L3 only)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/all`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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
  async getUserById(userId: number): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders(),
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
  async updateUser(userId: number, userData: UpdateUserData): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
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
  async deleteUser(userId: number): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
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
  async updateUserRole(userId: number, role: string, permissionLevel: number): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
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

  // Get available roles
  async getRoles(): Promise<Role[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/roles`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch roles');
      }

      return result.roles || [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch roles');
    }
  }

  // Reset user password
  async resetUserPassword(userId: number, newPassword: string): Promise<UserManagementResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
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
  async getUserActivityLogs(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/activity?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
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
        headers: this.getAuthHeaders(),
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
