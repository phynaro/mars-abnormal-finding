import authService from './authService';

export interface WorkOrderFilters {
  page?: number;
  limit?: number;
  status?: number | string;
  type?: number | string;
  priority?: number | string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface WorkOrderListItem {
  id: number;
  woCode: string;
  date?: string | null;
  time?: string | null;
  problem?: string | null;
  plan?: string | null;
  cause?: string | null;
  action?: string | null;
  requester?: { name?: string | null };
  status?: { id?: number; code?: string | null; name?: string | null };
  type?: { id?: number; code?: string | null; name?: string | null };
  priority?: { id?: number; code?: string | null; name?: string | null };
  related?: { wrCode?: string | null; puNo?: number | null; eqNo?: number | null };
  department?: { code?: string | null; name?: string | null };
  site?: { code?: string | null; name?: string | null };
}

export interface PaginatedWorkOrdersResponse {
  success: boolean;
  data: {
    workOrders: WorkOrderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

class WorkOrderService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/workorders`;

  private async headers() {
    return authService.getAuthHeaders();
  }

  async getAll(filters: WorkOrderFilters = {}): Promise<PaginatedWorkOrdersResponse> {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 20),
    });
    if (filters.status !== undefined) params.set('status', String(filters.status));
    if (filters.type !== undefined) params.set('type', String(filters.type));
    if (filters.priority !== undefined) params.set('priority', String(filters.priority));
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    const res = await fetch(`${this.baseURL}?${params.toString()}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work orders');
    return res.json();
  }

  async getById(id: number) {
    const res = await fetch(`${this.baseURL}/${id}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order');
    return res.json();
  }

  async getStats() {
    const res = await fetch(`${this.baseURL}/stats/overview`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order stats');
    return res.json();
  }

  async getTypes() {
    const res = await fetch(`${this.baseURL}/types/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order types');
    return res.json();
  }

  async getStatuses() {
    const res = await fetch(`${this.baseURL}/statuses/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order statuses');
    return res.json();
  }

  async getPriorities() {
    const res = await fetch(`${this.baseURL}/priorities/list`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order priorities');
    return res.json();
  }
}

export const workOrderService = new WorkOrderService();
export default workOrderService;

