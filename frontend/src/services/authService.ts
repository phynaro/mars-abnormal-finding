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
  lineId?: string;
  avatarUrl?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeID?: string;
  department?: string;
  shift?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

class AuthService {
  private token: string | null = localStorage.getItem('token');
  private user: User | null = JSON.parse(localStorage.getItem('user') || 'null');

  // Get current token
  getToken(): string | null {
    return this.token;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    return this.user?.role === role;
  }

  // Check if user has minimum permission level
  hasPermissionLevel(minLevel: number): boolean {
    return (this.user?.permissionLevel || 0) >= minLevel;
  }

  // Set authentication data
  private setAuth(token: string, user: User): void {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Clear authentication data
  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // User registration
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  }

  // User login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      if (result.success && result.token && result.user) {
        this.setAuth(result.token, result.user);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  // User logout
  async logout(): Promise<AuthResponse> {
    try {
      if (!this.token) {
        this.clearAuth();
        return { success: true, message: 'Logged out successfully' };
      }

      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      this.clearAuth();

      return result;
    } catch (error) {
      // Even if the API call fails, clear local auth
      this.clearAuth();
      throw new Error(error instanceof Error ? error.message : 'Logout failed');
    }
  }

  // Change password
  async changePassword(data: ChangePasswordData): Promise<AuthResponse> {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Password change failed');
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Password change failed');
    }
  }

  // Get user profile
  async getProfile(): Promise<AuthResponse> {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get profile');
      }

      if (result.success && result.user) {
        this.user = result.user;
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get profile');
    }
  }

  // Refresh user data (useful after profile updates)
  async refreshUserData(): Promise<void> {
    try {
      await this.getProfile();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }

  // Get auth headers for API calls
  getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}

export const authService = new AuthService();
export default authService;
