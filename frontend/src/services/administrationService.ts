import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== TYPES ====================

export interface TicketApproval {
  id?: number;
  personno: number;
  plant_code: string;
  area_code?: string;
  line_code?: string;
  machine_code?: string;
  approval_level: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  person_name?: string;
  FIRSTNAME?: string;
  LASTNAME?: string;
  PERSONCODE?: string;
  location_scope?: string;
  approval_level_name?: string;
}

export interface TicketApprovalSummary {
  personno: number;
  approval_level: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  person_name: string;
  FIRSTNAME: string;
  LASTNAME: string;
  PERSONCODE: string;
  approval_level_name: string;
  total_approvals: number;
}

export interface Person {
  PERSONNO: number;
  PERSON_NAME: string;
  FIRSTNAME: string;
  LASTNAME: string;
  PERSONCODE: string;
  EMAIL?: string;
  PHONE?: string;
}

export interface Plant {
  id: number;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: number;
  plant_id: number;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plant_name?: string;
}

export interface Line {
  id: number;
  plant_id: number;
  area_id: number;
  name: string;
  description?: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plant_name?: string;
  area_name?: string;
}

export interface Machine {
  id: number;
  line_id: number;
  name: string;
  description?: string;
  code: string;
  machine_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  line_name?: string;
  area_name?: string;
  plant_name?: string;
}

export interface CreateTicketApprovalRequest {
  personno: number;
  plant_code: string;
  area_code?: string;
  line_code?: string;
  machine_code?: string;
  approval_level: number;
  is_active?: boolean;
}

export interface LookupData {
  plants: Array<{
    id: number;
    name: string;
    code: string;
  }>;
  areas: Array<{
    id: number;
    name: string;
    code: string;
    plant_code: string;
    plant_id: number;
    plant_name: string;
  }>;
  lines: Array<{
    id: number;
    name: string;
    code: string;
    plant_code: string;
    area_code: string;
    plant_id: number;
    area_id: number;
    plant_name: string;
    area_name: string;
  }>;
}

export interface HierarchyItem {
  code: string;
  name: string;
  description?: string;
  puno: number;
  pucode: string;
  machine_number?: string;
}

export interface HierarchyData {
  plants: Record<string, {
    code: string;
    name: string;
    description?: string;
    puno: number;
    pucode: string;
    areas: Record<string, {
      code: string;
      name: string;
      description?: string;
      puno: number;
      pucode: string;
      lines: Record<string, {
        code: string;
        name: string;
        description?: string;
        puno: number;
        pucode: string;
        machines: Record<string, HierarchyItem>;
      }>;
    }>;
  }>;
}


export interface BulkApprovalCreateData {
  approvals: TicketApproval[];
}

export interface BulkApprovalResponse {
  success: boolean;
  data?: {
    ids: number[];
    count: number;
  };
  message?: string;
  errors?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

// ==================== TYPES ====================

export type ActionType = 'create' | 'approve-review' | 'reopen' | 'accept' | 'reject' | 'escalate' | 'complete' | 'reassign' | 'approve-close';

// ==================== HELPER FUNCTIONS ====================

export const getApprovalLevelName = (level: number): string => {
  switch (level) {
    case 1:
      return 'L1 - Create/Review/Reopen';
    case 2:
      return 'L2 - Accept/Reject/Escalate/Complete';
    case 3:
      return 'L3 - Reassign/Reject Final';
    case 4:
      return 'L4 - Approve Close';
    default:
      return 'Unknown Level';
  }
};

export const getActionsForLevel = (level: number): ActionType[] => {
  switch (level) {
    case 1:
      return ['create', 'approve-review', 'reopen'];
    case 2:
      return ['accept', 'reject', 'escalate', 'complete'];
    case 3:
      return ['reassign', 'reject'];
    case 4:
      return ['approve-close'];
    default:
      return [];
  }
};

export const canUserPerformAction = (
  userLevel: number,
  action: ActionType,
  ticketLevel?: number
): boolean => {
  const userActions = getActionsForLevel(userLevel);
  return userActions.includes(action);
};

const getAuthHeaders = (): HeadersInit => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleApiResponse = async (response: Response): Promise<any> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ==================== TICKET APPROVAL API ====================

export const ticketApprovalService = {
  async getAll(params?: {
    plant_code?: string;
    personno?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<TicketApprovalSummary[]> {
    const url = new URL(`${API_BASE_URL}/administration/ticket-approvals`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApprovalSummary[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<TicketApproval> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApproval> = await handleApiResponse(response);
    return result.data;
  },

  async getByPersonAndLevel(personno: number, approvalLevel: number): Promise<TicketApproval[]> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/person/${personno}/level/${approvalLevel}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApproval[]> = await handleApiResponse(response);
    return result.data;
  },

  async create(approval: Omit<TicketApproval, 'id' | 'created_at' | 'updated_at' | 'person_name' | 'location_scope' | 'approval_level_name'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(approval)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async createBulk(bulkData: BulkApprovalCreateData): Promise<BulkApprovalResponse> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bulkData)
    });
    const result: BulkApprovalResponse = await handleApiResponse(response);
    return result;
  },

  async createMultiple(approvals: CreateTicketApprovalRequest[]): Promise<{ count: number; ids: number[] }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ approvals })
    });
    const result: ApiResponse<{ count: number; ids: number[] }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, approval: Omit<TicketApproval, 'id' | 'created_at' | 'updated_at' | 'person_name' | 'location_scope' | 'approval_level_name'>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(approval)
    });
    await handleApiResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    await handleApiResponse(response);
  },

  async deleteByPersonAndLevel(personno: number, approvalLevel: number): Promise<{ count: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/person/${personno}/level/${approvalLevel}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const result: ApiResponse<{ count: number }> = await handleApiResponse(response);
    return { count: result.data.count };
  },

  async getUsersForNotification(puno: number, approvalLevel: number, excludeUserId?: number): Promise<Person[]> {
    const params = new URLSearchParams();
    params.append('puno', puno.toString());
    params.append('approvalLevel', approvalLevel.toString());
    if (excludeUserId) {
      params.append('excludeUserId', excludeUserId.toString());
    }

    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/notification-users?${params.toString()}`, {
      headers: getAuthHeaders()
    });

    const result: ApiResponse<Person[]> = await handleApiResponse(response);

    return result.data;
  }
};

// ==================== HIERARCHY VIEW API ====================

export const hierarchyService = {
  async getHierarchyView(): Promise<HierarchyViewResponse> {
    const response = await fetch(`${API_BASE_URL}/administration/hierarchy`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<HierarchyViewResponse> = await handleApiResponse(response);
    return result.data;
  }
};

// ==================== LOOKUP DATA API ====================

export const lookupService = {
  async getLookupData(): Promise<LookupData> {
    const response = await fetch(`${API_BASE_URL}/administration/lookup`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<LookupData> = await handleApiResponse(response);
    return result.data;
  }
};

// ==================== PERSON SEARCH API ====================

export const personService = {
  async searchPersons(search?: string, limit?: number): Promise<Person[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/administration/persons/search?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Person[]> = await handleApiResponse(response);

    return result.data;
  }
};

// ==================== TYPES FOR HIERARCHY ====================

export interface HierarchyViewResponse {
  flat: Array<{
    id: number;
    puno: number;
    pucode: string;
    plant: string;
    area: string;
    line: string;
    machine: string;
    number?: string;
    digit_count: number;
    hierarchy_level: string;
    full_path: string;
    puname: string;
    pudescription?: string;
    created_at: string;
    updated_at: string;
  }>;
  hierarchy: HierarchyData;
  summary: {
    totalItems: number;
    plants: number;
    totalAreas: number;
    totalLines: number;
    totalMachines: number;
  };
}

// ==================== EXPORT DEFAULT ====================

const administrationService = {
  hierarchy: hierarchyService,
  ticketApproval: ticketApprovalService,
  lookup: lookupService,
  person: personService
};

export default administrationService;