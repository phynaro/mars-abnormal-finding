import { getAuthHeaders } from '../utils/authHeaders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface WorkGroup {
  id: number;
  name_en: string;
  name_th: string;
  description_en?: string | null;
  description_th?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkGroupResponse {
  success: boolean;
  data: WorkGroup[];
  message?: string;
}

export interface WorkGroupMutationResponse {
  success: boolean;
  data?: WorkGroup;
  message?: string;
}

export interface CreateWorkGroupRequest {
  name_en: string;
  name_th: string;
  description_en?: string | null;
  description_th?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateWorkGroupRequest {
  name_en?: string;
  name_th?: string;
  description_en?: string | null;
  description_th?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

class WorkGroupService {
  async getWorkGroups(): Promise<WorkGroup[]> {
    const response = await fetch(`${API_BASE_URL}/work-groups`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work groups: ${response.statusText}`);
    }

    const data: WorkGroupResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch work groups');
    }

    return data.data || [];
  }

  async getAllWorkGroups(): Promise<WorkGroup[]> {
    const response = await fetch(`${API_BASE_URL}/work-groups/all`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch work groups: ${response.statusText}`);
    }

    const data: WorkGroupResponse = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch work groups');
    }

    return data.data || [];
  }

  async createWorkGroup(payload: CreateWorkGroupRequest): Promise<WorkGroupMutationResponse> {
    const response = await fetch(`${API_BASE_URL}/work-groups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data: WorkGroupMutationResponse = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create work group');
    }

    return data;
  }

  async updateWorkGroup(id: number, payload: UpdateWorkGroupRequest): Promise<WorkGroupMutationResponse> {
    const response = await fetch(`${API_BASE_URL}/work-groups/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data: WorkGroupMutationResponse = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update work group');
    }

    return data;
  }

  async deleteWorkGroup(id: number): Promise<WorkGroupMutationResponse> {
    const response = await fetch(`${API_BASE_URL}/work-groups/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    const data: WorkGroupMutationResponse = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete work group');
    }

    return data;
  }
}

export const workGroupService = new WorkGroupService();
export default workGroupService;
