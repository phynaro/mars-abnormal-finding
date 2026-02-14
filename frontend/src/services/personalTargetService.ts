const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface PersonalTarget {
  id: number;
  PERSONNO: number;
  type: 'report' | 'fix' | 'closure';
  period: string;
  year: number;
  target_value: number;
  unit: 'case' | 'THB' | 'percent';
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  PERSON_NAME?: string;
  PERSONCODE?: string;
}

export interface CreatePersonalTargetRequest {
  PERSONNO: number;
  type: 'report' | 'fix' | 'closure';
  year: number;
  target_values: { [period: string]: number };
  unit: 'case' | 'THB' | 'percent';
  created_by?: string;
}

export interface UpdatePersonalTargetRequest {
  target_value?: number;
  unit?: 'case' | 'THB' | 'percent';
  updated_by?: string;
}

export interface PersonalTargetFilters {
  personno?: number;
  year?: number;
  type?: 'report' | 'fix' | 'closure';
}

class PersonalTargetService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/personal-targets${endpoint}`;
    
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

  async getPersonalTargets(filters?: PersonalTargetFilters): Promise<{ success: boolean; data: PersonalTarget[] }> {
    const params = new URLSearchParams();
    
    if (filters?.personno) params.append('personno', filters.personno.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.type) params.append('type', filters.type);
    
    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.request<{ success: boolean; data: PersonalTarget[] }>(endpoint);
  }

  async getPersonalTargetById(id: number): Promise<{ success: boolean; data: PersonalTarget }> {
    return this.request<{ success: boolean; data: PersonalTarget }>(`/${id}`);
  }

  async createPersonalTargets(data: CreatePersonalTargetRequest): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePersonalTarget(id: number, data: UpdatePersonalTargetRequest): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePersonalTargets(data: { PERSONNO: number; type: 'report' | 'fix' | 'closure'; year: number }): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    return this.request<{ success: boolean; message: string; deletedCount?: number }>('', {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async getAvailableYears(): Promise<{ success: boolean; data: number[] }> {
    return this.request<{ success: boolean; data: number[] }>('/years/available');
  }

  // Helper method to get personal targets grouped by type and person
  async getPersonalTargetsGrouped(filters?: PersonalTargetFilters): Promise<{ [key: string]: PersonalTarget[] }> {
    const response = await this.getPersonalTargets(filters);
    const grouped: { [key: string]: PersonalTarget[] } = {};
    
    response.data.forEach(target => {
      const key = `${target.type}-${target.PERSONNO}-${target.year}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(target);
    });
    
    return grouped;
  }

  // Helper method to get personal targets as a matrix (periods x person)
  async getPersonalTargetsMatrix(filters?: PersonalTargetFilters): Promise<{ [period: string]: { [personno: string]: PersonalTarget } }> {
    const response = await this.getPersonalTargets(filters);
    const matrix: { [period: string]: { [personno: string]: PersonalTarget } } = {};
    
    response.data.forEach(target => {
      if (!matrix[target.period]) {
        matrix[target.period] = {};
      }
      matrix[target.period][target.PERSONNO.toString()] = target;
    });
    
    return matrix;
  }

  // Helper method to get personal targets for a specific person and year
  async getPersonalTargetsForPerson(personno: number, year: number): Promise<{ [type: string]: { [period: string]: PersonalTarget } }> {
    const response = await this.getPersonalTargets({ personno, year });
    const grouped: { [type: string]: { [period: string]: PersonalTarget } } = {};
    
    response.data.forEach(target => {
      if (!grouped[target.type]) {
        grouped[target.type] = {};
      }
      grouped[target.type][target.period] = target;
    });
    
    return grouped;
  }
}

export const personalTargetService = new PersonalTargetService();
export default personalTargetService;
