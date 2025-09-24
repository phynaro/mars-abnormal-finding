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

export interface TicketApproval {
  id: number;
  personno: number;
  area_id: number;
  approval_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  area_name?: string;
  plant_name?: string;
  person_name?: string;
  firstname?: string;
  lastname?: string;
  personcode?: string;
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
  async getAll(area_id?: number, personno?: number): Promise<TicketApproval[]> {
    const url = new URL(`${API_BASE_URL}/administration/ticket-approvals`);
    if (area_id) {
      url.searchParams.append('area_id', area_id.toString());
    }
    if (personno) {
      url.searchParams.append('personno', personno.toString());
    }
    
    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApproval[]> = await handleApiResponse(response);
    return result.data;
  },

  async getById(id: number): Promise<TicketApproval> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals/${id}`, {
      headers: getAuthHeaders()
    });
    const result: ApiResponse<TicketApproval> = await handleApiResponse(response);
    return result.data;
  },

  async create(approval: Omit<TicketApproval, 'id' | 'created_at' | 'updated_at' | 'area_name' | 'plant_name'>): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/administration/ticket-approvals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(approval)
    });
    const result: ApiResponse<{ id: number }> = await handleApiResponse(response);
    return result.data;
  },

  async update(id: number, approval: Omit<TicketApproval, 'id' | 'created_at' | 'updated_at' | 'area_name' | 'plant_name'>): Promise<void> {
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
