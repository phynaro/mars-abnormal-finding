import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ==================== TYPES ====================

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

export interface Person {
  PERSONNO: number;
  PERSON_NAME: string;
  FIRSTNAME: string;
  LASTNAME: string;
  PERSONCODE: string;
  EMAIL?: string;
  PHONE?: string;
}

// Interfaces for the simplified approval system
export interface CreateTicketApprovalRequest {
  personno: number;
  plant_code: string;
  area_code?: string;
  line_code?: string;
  machine_code?: string;
  approval_level: number;
  is_active?: boolean;
}

export interface TicketApproval {
  id?: number;
  personno: number;
  plant_code?: string;
  area_code?: string;
  line_code?: string;
  machine_code?: string;
  approval_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plant_name?: string;
  area_name?: string;
  line_name?: string;
  machine_name?: string;
  person_name?: string;
  firstname?: string;
  lastname?: string;
  personcode?: string;
  location_scope?: string;
  approval_level_name?: string;
  total_approvals?: number;
}

// Action mapping for approval levels
export const ACTION_MAPPING = {
  L1: ['create', 'approve_review', 'reopen'],
  L2: ['accept', 'reject', 'escalate', 'complete'],
  L3: ['reassign', 'reject_final'],
  L4: ['approve_close']
} as const;

export type ApprovalLevel = 1 | 2 | 3 | 4;
export type ActionType = 'create' | 'approve_review' | 'reopen' | 'accept' | 'reject' | 'escalate' | 'complete' | 'reassign' | 'reject_final' | 'approve_close';

export interface LookupData {
  plants: Plant[];
  areas: Area[];
  lines: Line[];
}

// ==================== API RESPONSE TYPES ====================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

// ==================== HELPER FUNCTIONS ====================

// Helper function to check if user can perform action
export const canUserPerformAction = (userLevel: number, action: ActionType): boolean => {
  const levelKey = `L${userLevel}` as keyof typeof ACTION_MAPPING;
  const actions = ACTION_MAPPING[levelKey];
  return actions ? (actions as readonly ActionType[]).includes(action) : false;
};

// Helper function to get all actions for a level
export const getActionsForLevel = (level: number): ActionType[] => {
  const levelKey = `L${level}` as keyof typeof ACTION_MAPPING;
  const actions = ACTION_MAPPING[levelKey];
  return actions ? [...actions] : [];
};

// Helper function to get approval level name
export const getApprovalLevelName = (level: number): string => {
  switch (level) {
    case 1: return 'L1 - Create/Review/Reopen';
    case 2: return 'L2 - Accept/Reject/Escalate/Complete';
    case 3: return 'L3 - Reassign/Reject Final';
    case 4: return 'L4 - Approve Close';
    default: return 'Unknown Level';
  }
};

const getAuthHeaders = () => {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ==================== PLANT API ====================

export const plantService = {
  async getAll(): Promise<Plant[]> {
    const response = await fetch(`${API_BASE_URL}/administration/plants`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Plant[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<Plant> {
    const response = await fetch(`${API_BASE_URL}/administration/plants/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Plant> = await handleApiResponse(response);
    return result.data;
  },

  async create(plant: Omit<Plant, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/plants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(plant)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, plant: Omit<Plant, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/plants/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(plant)
    });
    await handleApiResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/plants/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    await handleApiResponse(response);
  }
};

// ==================== AREA API ====================

export const areaService = {
  async getAll(plant_id?: number): Promise<Area[]> {
    const url = new URL(`${API_BASE_URL}/administration/areas`);
    if (plant_id) {
      url.searchParams.append('plant_id', plant_id.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Area[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<Area> {
    const response = await fetch(`${API_BASE_URL}/administration/areas/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Area> = await handleApiResponse(response);
    return result.data;
  },

  async create(area: Omit<Area, 'id' | 'created_at' | 'updated_at' | 'plant_name'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/areas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(area)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, area: Omit<Area, 'id' | 'created_at' | 'updated_at' | 'plant_name'>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/areas/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(area)
    });
    await handleApiResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/areas/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    await handleApiResponse(response);
  }
};

// ==================== LINE API ====================

export const lineService = {
  async getAll(plant_id?: number, area_id?: number): Promise<Line[]> {
    const url = new URL(`${API_BASE_URL}/administration/lines`);
    if (plant_id) {
      url.searchParams.append('plant_id', plant_id.toString());
    }
    if (area_id) {
      url.searchParams.append('area_id', area_id.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Line[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<Line> {
    const response = await fetch(`${API_BASE_URL}/administration/lines/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Line> = await handleApiResponse(response);
    return result.data;
  },

  async create(line: Omit<Line, 'id' | 'created_at' | 'updated_at' | 'plant_name' | 'area_name'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/lines`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(line)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, line: Omit<Line, 'id' | 'created_at' | 'updated_at' | 'plant_name' | 'area_name'>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/lines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(line)
    });
    await handleApiResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/lines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    await handleApiResponse(response);
  }
};

// ==================== MACHINE API ====================

export const machineService = {
  async getAll(line_id?: number, plant_id?: number, area_id?: number): Promise<Machine[]> {
    const url = new URL(`${API_BASE_URL}/administration/machines`);
    if (line_id) {
      url.searchParams.append('line_id', line_id.toString());
    }
    if (plant_id) {
      url.searchParams.append('plant_id', plant_id.toString());
    }
    if (area_id) {
      url.searchParams.append('area_id', area_id.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Machine[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<Machine> {
    const response = await fetch(`${API_BASE_URL}/administration/machines/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Machine> = await handleApiResponse(response);
    return result.data;
  },

  async create(machine: Omit<Machine, 'id' | 'created_at' | 'updated_at' | 'line_name' | 'area_name' | 'plant_name'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/machines`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(machine)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, machine: Omit<Machine, 'id' | 'created_at' | 'updated_at' | 'line_name' | 'area_name' | 'plant_name'>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/machines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(machine)
    });
    await handleApiResponse(response);
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/administration/machines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    await handleApiResponse(response);
  }
};

// ==================== TICKET APPROVAL API ====================

export const ticketApprovalService = {
  async getAll(plant_code?: string, personno?: number): Promise<TicketApproval[]> {
    const url = new URL(`${API_BASE_URL}/administration/ticket-approvals`);
    if (plant_code) {
      url.searchParams.append('plant_code', plant_code);
    }
    if (personno) {
      url.searchParams.append('personno', personno.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApproval[]> = await handleApiResponse(response);
    console.log('Ticket approvals:', result.data);
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

  async create(approval: CreateTicketApprovalRequest): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(approval)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async createMultiple(approvals: CreateTicketApprovalRequest[]): Promise<{ ids: number[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ approvals })
    });
    const result: ApiResponse<{ ids: number[]; count: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, approval: Partial<CreateTicketApprovalRequest>): Promise<void> {
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
    return result.data;
  },

  // New methods for the simplified approval system
  async checkUserActionPermission(userId: number, puno: number, action: ActionType): Promise<{ hasPermission: boolean; approvalLevel: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/check-action-permission`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, puno, action })
    });
    const result: ApiResponse<{ hasPermission: boolean; approvalLevel: number }> = await handleApiResponse(response);
    return result.data;
  },

  async getUsersForNotification(puno: number, approvalLevel: number, excludeUserId?: number): Promise<Person[]> {
    const url = new URL(`${API_BASE_URL}/administration/notification-users`);
    url.searchParams.append('puno', puno.toString());
    url.searchParams.append('approval_level', approvalLevel.toString());
    if (excludeUserId) {
      url.searchParams.append('exclude_user_id', excludeUserId.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Person[]> = await handleApiResponse(response);
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
    
    const response = await fetch(`${API_BASE_URL}/administration/persons/search?${params}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<Person[]> = await handleApiResponse(response);
    return result.data;
  }
};

// ==================== EXPORT DEFAULT ====================

const administrationService = {
  plant: plantService,
  area: areaService,
  line: lineService,
  machine: machineService,
  ticketApproval: ticketApprovalService,
  lookup: lookupService,
  person: personService
};

export default administrationService;
