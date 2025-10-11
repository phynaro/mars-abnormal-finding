import authService from './authService';
import { getAuthHeaders } from '../utils/authHeaders';
import type { HierarchySiteOverview, HierarchyDepartmentDetailsResponse } from '@/types/hierarchy';

export interface PUCritical {
  PUCRITICALNO: number;
  PUCRITICALNAME: string;
  PUCRITICALCODE?: string;
}

class HierarchyService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/assets`;

  private headers() {
    return getAuthHeaders();
  }

  async getHierarchyOverview(siteNo?: number): Promise<HierarchySiteOverview[]> {
    const url = siteNo ? `${this.baseURL}/hierarchy?siteNo=${siteNo}` : `${this.baseURL}/hierarchy`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to load hierarchy overview');
    const json = await res.json();
    // API returns { data: { [siteNo]: siteObj } }
    const data = json?.data || {};
    return Object.values(data) as HierarchySiteOverview[];
  }

  async getDepartmentDetails(deptNo: string | number, siteNo: number, page = 1, limit = 50, includeEquipment = true): Promise<HierarchyDepartmentDetailsResponse> {
    const url = `${this.baseURL}/hierarchy/department/${deptNo}?siteNo=${siteNo}&page=${page}&limit=${limit}&includeEquipment=${includeEquipment ? 'true' : 'false'}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error('Failed to load department details'), { status: res.status, body: text });
    }
    return res.json();
  }

  async getPUCriticalLevels(): Promise<{success: boolean; data: PUCritical[]}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/pucritical`, {
      headers: this.headers()
    });
    return await response.json();
  }
}

export const hierarchyService = new HierarchyService();
export default hierarchyService;

