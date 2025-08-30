import authService from './authService';

export interface Machine {
  MachineID: number;
  MachineName: string;
  MachineCode: string;
  MachineType: string;
  Manufacturer?: string;
  Model?: string;
  SerialNumber?: string;
  Location?: string;
  Department?: string;
  InstallationDate?: string;
  LastMaintenanceDate?: string;
  NextMaintenanceDate?: string;
  Status: string;
  Capacity?: string;
  PowerRating?: string;
  OperatingHours: number;
  Criticality: string;
  AssetTag?: string;
  PurchasePrice?: number;
  CurrentValue?: number;
  WarrantyExpiryDate?: string;
  Notes?: string;
  CreatedBy?: string;
  CreatedDate?: string;
  ModifiedBy?: string;
  ModifiedDate?: string;
  IsActive?: boolean;
}

export interface MachineFilters {
  search?: string;
  department?: string;
  status?: string;
  machineType?: string;
  criticality?: string;
}

export interface MachineStats {
  totalMachines: number;
  activeMachines: number;
  maintenanceMachines: number;
  inactiveMachines: number;
  criticalMachines: number;
  highPriorityMachines: number;
  maintenanceDueSoon: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class MachineService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  private async getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllMachines(
    page: number = 1,
    limit: number = 10,
    filters?: MachineFilters
  ): Promise<PaginatedResponse<Machine>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.department && { department: filters.department }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.machineType && { machineType: filters.machineType }),
      ...(filters?.criticality && { criticality: filters.criticality }),
    });

    const response = await fetch(`${this.baseURL}/machines?${params}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machines');
    }

    return response.json();
  }

  async getMachineById(id: number): Promise<Machine> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machine');
    }

    const result = await response.json();
    return result.data;
  }

  async createMachine(machineData: Partial<Machine>): Promise<{ MachineID: number }> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(machineData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create machine');
    }

    const result = await response.json();
    return result.data;
  }

  async updateMachine(id: number, machineData: Partial<Machine>): Promise<void> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify(machineData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update machine');
    }
  }

  async deleteMachine(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete machine');
    }
  }

  async getMachineStats(): Promise<MachineStats> {
    const response = await fetch(`${this.baseURL}/stats`, {
      headers: await this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machine statistics');
    }

    const result = await response.json();
    return result.data;
  }
}

export const machineService = new MachineService();
