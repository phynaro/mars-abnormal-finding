import authService from './authService';
import { getAuthHeaders } from '../utils/authHeaders';

export interface Site {
  SiteNo: number;
  SiteCode: string;
  SiteName: string;
  LogoPath?: string;
  MaxNumOfUserLicense?: number;
}

export interface Department {
  DEPTNO: number;
  DEPTCODE: string;
  DEPTNAME: string;
  SiteNo?: number;
}

export interface ProductionUnit {
  PUNO: number;
  PUCODE: string;
  PUNAME: string;
  PUTYPENAME?: string;
  PUSTATUSNAME?: string;
  PULOCATION?: string;
  LATITUDE?: number | null;
  LONGITUDE?: number | null;
  SiteName?: string;
  DEPTNAME?: string;
}

export interface Equipment {
  EQNO: number;
  EQCODE: string;
  EQNAME: string;
  PUCODE?: string;
  PUNAME?: string;
  EQTYPENAME?: string;
  EQSTATUSNAME?: string;
  ASSETNO?: string;
  Location?: string;
  Room?: string;
  OwnerDeptName?: string;
  MaintDeptName?: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AssetService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/assets`;

  private async headers() {
    return getAuthHeaders();
  }

  async getSites(): Promise<{ success: boolean; data: Site[]; count?: number }> {
    const res = await fetch(`${this.baseURL}/sites`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load sites');
    return res.json();
  }

  async getDepartmentsBySite(siteNo: number): Promise<{ success: boolean; data: Department[]; count?: number }> {
    const res = await fetch(`${this.baseURL}/sites/${siteNo}/departments`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load departments');
    return res.json();
  }

  async getProductionUnits(filters: { siteNo?: number; deptNo?: number; search?: string; page?: number; limit?: number }): Promise<Paginated<ProductionUnit>> {
    const params = new URLSearchParams();
    if (filters.siteNo) params.set('siteNo', String(filters.siteNo));
    if (filters.deptNo) params.set('deptNo', String(filters.deptNo));
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 20));
    const res = await fetch(`${this.baseURL}/production-units?${params.toString()}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load production units');
    return res.json();
  }

  async getEquipment(filters: { siteNo?: number; puNo?: number; search?: string; page?: number; limit?: number }): Promise<Paginated<Equipment>> {
    const params = new URLSearchParams();
    if (filters.siteNo) params.set('siteNo', String(filters.siteNo));
    if (filters.puNo) params.set('puNo', String(filters.puNo));
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 20));
    const res = await fetch(`${this.baseURL}/equipment?${params.toString()}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load equipment');
    return res.json();
  }

  async getHierarchy(siteNo?: number) {
    const q = siteNo ? `?siteNo=${siteNo}` : '';
    const res = await fetch(`${this.baseURL}/hierarchy${q}`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load hierarchy');
    return res.json();
  }

  async getLookup() {
    const res = await fetch(`${this.baseURL}/lookup`, { headers: await this.headers() });
    if (!res.ok) throw new Error('Failed to load lookup');
    return res.json();
  }
}

export const assetService = new AssetService();
export default assetService;

