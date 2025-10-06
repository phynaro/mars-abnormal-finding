const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
import authService from './authService';

export interface Target {
  id: number;
  type: 'open case' | 'close case';
  period: string;
  year: number;
  target_value: number;
  unit: 'case' | 'THB' | 'percent';
  plant: string | null;
  area: string | null;
  plant_name?: string;
  area_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateTargetRequest {
  type: 'open case' | 'close case';
  year: number;
  target_value: number;
  unit: 'case' | 'THB' | 'percent';
  plant?: string | null;
  area?: string | null;
  period?: string;
  created_by?: string;
}

export interface UpdateTargetRequest {
  target_value?: number;
  unit?: 'case' | 'THB' | 'percent';
  updated_by?: string;
}

export interface CopyP1Request {
  type: 'open case' | 'close case';
  year: number;
  plant?: string | null;
  area?: string | null;
  updated_by?: string;
}

export interface TargetFilters {
  plant?: string;
  area?: string;
  year?: number;
  type?: 'open case' | 'close case';
}

class TargetService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/targets${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getTargets(filters?: TargetFilters): Promise<{ success: boolean; data: Target[] }> {
    const params = new URLSearchParams();
    
    if (filters?.plant) params.append('plant', filters.plant);
    if (filters?.area) params.append('area', filters.area);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.type) params.append('type', filters.type);
    
    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.request<{ success: boolean; data: Target[] }>(endpoint);
  }

  async getTargetById(id: number): Promise<{ success: boolean; data: Target }> {
    return this.request<{ success: boolean; data: Target }>(`/${id}`);
  }

  async createTarget(data: CreateTargetRequest): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTargets(targets: CreateTargetRequest[]): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/bulk', {
      method: 'POST',
      body: JSON.stringify({ targets }),
    });
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTarget(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/${id}`, {
      method: 'DELETE',
    });
  }

  async copyP1ToAllPeriods(data: CopyP1Request): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/copy-p1', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAvailableYears(): Promise<{ success: boolean; data: number[] }> {
    return this.request<{ success: boolean; data: number[] }>('/meta/years');
  }

  // Get distinct plants from hierarchy
  async getPlants(): Promise<{ success: boolean; data: { code: string; name: string }[] }> {
    const url = `${API_BASE_URL}/hierarchy/distinct/plants`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      }
    });
    return await response.json();
  }

  // Get distinct areas from hierarchy
  async getAreas(plantCode?: string): Promise<{ success: boolean; data: { code: string; name: string; plant: string }[] }> {
    const url = plantCode 
      ? `${API_BASE_URL}/hierarchy/distinct/areas?plant=${plantCode}`
      : `${API_BASE_URL}/hierarchy/distinct/areas`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      }
    });
    return await response.json();
  }

  // Helper method to get targets grouped by type, plant, and area
  async getTargetsGrouped(filters?: TargetFilters): Promise<{ [key: string]: Target[] }> {
    const response = await this.getTargets(filters);
    const grouped: { [key: string]: Target[] } = {};
    
    response.data.forEach(target => {
      const key = `${target.type}-${target.plant || 'all'}-${target.area || 'all'}-${target.year}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(target);
    });
    
    return grouped;
  }

  // Helper method to get targets as a matrix (periods x locations)
  async getTargetsMatrix(filters?: TargetFilters): Promise<{ [period: string]: { [location: string]: Target } }> {
    const response = await this.getTargets(filters);
    const matrix: { [period: string]: { [location: string]: Target } } = {};
    
    response.data.forEach(target => {
      if (!matrix[target.period]) {
        matrix[target.period] = {};
      }
      const locationKey = target.plant && target.area 
        ? `${target.plant}-${target.area}` 
        : target.plant || target.area || 'all';
      matrix[target.period][locationKey] = target;
    });
    
    return matrix;
  }
}

export const targetService = new TargetService();
export default targetService;
