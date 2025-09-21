import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface Person {
  PERSONNO: number;
  PERSONCODE: string;
  FIRSTNAME: string;
  LASTNAME: string;
  PERSON_NAME: string;
  EMAIL?: string;
  DEPTNAME?: string;
  DEPTCODE?: string;
  TITLENAME?: string;
  TITLECODE?: string;
}

export interface Department {
  DEPTNO: number;
  DEPTCODE: string;
  DEPTNAME: string;
  DEPTPARENT?: number;
  PARENT_DEPTNAME?: string;
  PARENT_DEPTCODE?: string;
  USERGROUPNAME?: string;
  USERGROUPCODE?: string;
  PERSON_COUNT?: number;
  HIERARCHYNO?: number;
  FLAGDEL?: string;
}

export interface Title {
  TITLENO: number;
  TITLECODE: string;
  TITLENAME: string;
  TITLEPARENT?: number;
  PARENT_TITLENAME?: string;
  PARENT_TITLECODE?: string;
  PERSON_COUNT?: number;
  FLAGDEL?: string;
}

export interface UserGroup {
  USERGROUPNO: number;
  USERGROUPCODE: string;
  USERGROUPNAME: string;
  MEMBER_COUNT?: number;
  DEPT_COUNT?: number;
}

export interface PersonnelResponse {
  success: boolean;
  data: Person[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class PersonnelService {
  private getAuthHeaders(): Record<string, string> {
    return authService.getAuthHeaders();
  }
  
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/personnel`;
  }

  async getPersons(params: {
    page?: number;
    limit?: number;
    search?: string;
    deptNo?: string | number;
    titleNo?: string | number;
    includeDeleted?: boolean;
  } = {}): Promise<PersonnelResponse> {
    const url = new URL(`${this.baseURL}/persons`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    console.log('🔍 Personnel Service - Request URL:', url.toString());
    console.log('🔍 Personnel Service - Request params:', params);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Personnel Service - Response status:', response.status);
    console.log('🔍 Personnel Service - Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Personnel Service - Error response:', errorText);
      throw new Error(`Failed to fetch persons: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('🔍 Personnel Service - Non-JSON response:', responseText);
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 200)}...`);
    }

    const data = await response.json();
    console.log('🔍 Personnel Service - Response data:', data);
    return data;
  }

  async getDepartments(params: {
    page?: number;
    limit?: number;
    search?: string;
    parentDept?: string | number;
    includeDeleted?: boolean;
  } = {}): Promise<{
    success: boolean;
    data: Department[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const url = new URL(`${this.baseURL}/departments`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    console.log('🔍 Personnel Service - Departments Request URL:', url.toString());
    console.log('🔍 Personnel Service - Departments Request params:', params);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Personnel Service - Departments Response status:', response.status);
    console.log('🔍 Personnel Service - Departments Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Personnel Service - Departments Error response:', errorText);
      throw new Error(`Failed to fetch departments: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('🔍 Personnel Service - Departments Non-JSON response:', responseText);
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 200)}...`);
    }

    const data = await response.json();
    console.log('🔍 Personnel Service - Departments Response data:', data);
    return data;
  }

  async getTitles(params: {
    page?: number;
    limit?: number;
    search?: string;
    parentTitle?: string | number;
    includeDeleted?: boolean;
  } = {}): Promise<{
    success: boolean;
    data: Title[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const url = new URL(`${this.baseURL}/titles`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    console.log('🔍 Personnel Service - Titles Request URL:', url.toString());
    console.log('🔍 Personnel Service - Titles Request params:', params);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 Personnel Service - Titles Response status:', response.status);
    console.log('🔍 Personnel Service - Titles Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 Personnel Service - Titles Error response:', errorText);
      throw new Error(`Failed to fetch titles: ${response.status} ${response.statusText}`);
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('🔍 Personnel Service - Titles Non-JSON response:', responseText);
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 200)}...`);
    }

    const data = await response.json();
    console.log('🔍 Personnel Service - Titles Response data:', data);
    return data;
  }

  async getPerson(id: string | number): Promise<{
    success: boolean;
    data: Person;
  }> {
    const response = await fetch(`${this.baseURL}/persons/${id}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch person: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getDepartment(id: string | number): Promise<{
    success: boolean;
    data: Department;
  }> {
    const response = await fetch(`${this.baseURL}/departments/${id}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch department: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getTitle(id: string | number): Promise<{
    success: boolean;
    data: Title;
  }> {
    const response = await fetch(`${this.baseURL}/titles/${id}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch title: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getUserGroups(params: {
    page?: number;
    limit?: number;
    search?: string;
    includeDeleted?: boolean;
  } = {}): Promise<{
    success: boolean;
    data: UserGroup[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const url = new URL(`${this.baseURL}/usergroups`);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user groups: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getUserGroup(id: string | number): Promise<{
    success: boolean;
    data: UserGroup;
  }> {
    const response = await fetch(`${this.baseURL}/usergroups/${id}`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user group: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getUserGroupMembers(id: string | number, page: number = 1, limit: number = 20): Promise<{
    success: boolean;
    data: Person[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const url = new URL(`${this.baseURL}/usergroups/${id}/members`);
    url.searchParams.append('page', String(page));
    url.searchParams.append('limit', String(limit));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch user group members: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }
}

export default new PersonnelService();

