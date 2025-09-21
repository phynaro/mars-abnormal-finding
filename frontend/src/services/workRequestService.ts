import authService from './authService';

export interface WorkRequestFilters {
  page?: number;
  limit?: number;
  status?: number | string;
  urgency?: number | string;
  requestType?: number | string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface WorkRequestListItem {
  id: number;
  wrCode: string;
  date?: string | null;
  time?: string | null;
  description?: string | null;
  remark?: string | null;
  requester?: { name?: string | null };
  status?: { id?: number; code?: string | null; name?: string | null };
  urgency?: { id?: number; code?: string | null; name?: string | null };
  requestType?: { id?: number; code?: string | null; name?: string | null };
}

class WorkRequestService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/workrequest`;

  private async headers() {
    return authService.getAuthHeaders();
  }

  async getAll(filters: WorkRequestFilters = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 20),
    });
    if (filters.status !== undefined && filters.status !== '') params.set('status', String(filters.status));
    if (filters.urgency !== undefined && filters.urgency !== '') params.set('urgency', String(filters.urgency));
    if (filters.requestType !== undefined && filters.requestType !== '') params.set('requestType', String(filters.requestType));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    const res = await fetch(`${this.baseURL}?${params.toString()}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work requests');
    return res.json();
  }

  async getById(id: number) {
    const res = await fetch(`${this.baseURL}/${id}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work request');
    return res.json();
  }

  async getStats() {
    const res = await fetch(`${this.baseURL}/stats/overview`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work request stats');
    return res.json();
  }

  async getStatuses() {
    const res = await fetch(`${this.baseURL}/statuses/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch WR statuses');
    return res.json();
  }

  async getUrgencies() {
    const res = await fetch(`${this.baseURL}/urgencies/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch WR urgencies');
    return res.json();
  }

  async getCategories() {
    const res = await fetch(`${this.baseURL}/categories/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch WR categories');
    return res.json();
  }

  async getTypes() {
    const res = await fetch(`${this.baseURL}/types/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch WR types');
    return res.json();
  }

  async create(data: {
    description: string;
    equipmentCode?: string;
    productionUnitId?: number;
    equipmentId?: number;
    costCenterId?: number;
    urgencyId?: number;
    requestTypeId?: number;
    requestDate?: string; // YYYY-MM-DD
    requestTime?: string; // HHmm
    scheduledStartDate?: string; // YYYY-MM-DD
    scheduledStartTime?: string; // HHmm
    remark?: string;
    note?: string;
    budgetCost?: number;
    meterNumber?: number;
    meterReading?: number;
    failureModeId?: number;
    symptomId?: number;
    phoneNumber?: string;
    flagPU?: boolean;
    flagTPM?: boolean;
    tpmId?: number;
    sjId?: number;
    taskId?: number;
    // Safety flags
    hotWork?: boolean;
    confineSpace?: boolean;
    workAtHeight?: boolean;
    lockOutTagOut?: boolean;
    flagSafety?: boolean;
    flagEnvironment?: boolean;
    // Additional fields
    text1?: string;
    eqCompNo?: number;
    flagEQ?: boolean;
    requestor?: number;
  }) {
    const res = await fetch(`${this.baseURL}`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || 'Failed to create work request');
    }
    return res.json();
  }
}

export const workRequestService = new WorkRequestService();
export default workRequestService;
