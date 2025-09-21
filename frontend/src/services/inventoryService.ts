import authService from './authService';

export interface InventoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: number | string;
  typeId?: number | string;
  vendorId?: number | string;
  activeOnly?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class InventoryService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/inventory`;

  private headers() {
    return authService.getAuthHeaders();
  }

  async getCatalog(filters: InventoryFilters = {}) {
    const params = new URLSearchParams({
      page: String(filters.page ?? 1),
      limit: String(filters.limit ?? 20),
    });
    if (filters.search) params.set('search', filters.search);
    if (filters.groupId) params.set('groupId', String(filters.groupId));
    if (filters.typeId) params.set('typeId', String(filters.typeId));
    if (filters.vendorId) params.set('vendorId', String(filters.vendorId));
    if (typeof filters.activeOnly === 'boolean') params.set('activeOnly', String(filters.activeOnly));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    const res = await fetch(`${this.baseURL}/catalog?${params.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load catalog');
    return res.json();
  }

  async getStores(filters: { page?: number; limit?: number; search?: string; activeOnly?: boolean } = {}) {
    const params = new URLSearchParams({ page: String(filters.page ?? 1), limit: String(filters.limit ?? 20) });
    if (filters.search) params.set('search', filters.search);
    if (typeof filters.activeOnly === 'boolean') params.set('activeOnly', String(filters.activeOnly));
    const res = await fetch(`${this.baseURL}/stores?${params.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load stores');
    return res.json();
  }

  async getCatalogItem(id: number | string) {
    const res = await fetch(`${this.baseURL}/catalog/${id}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load catalog item');
    return res.json();
  }

  async getVendors(page = 1, limit = 20, search?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const res = await fetch(`${this.baseURL}/vendors?${params.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load vendors');
    return res.json();
  }

  async getStatsOverview() {
    const res = await fetch(`${this.baseURL}/stats/overview`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load inventory stats');
    return res.json();
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
