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

  // PUExtension hierarchy methods
  async getDistinctPlants(): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getDistinctAreas(plant: string): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getDistinctLines(plant: string, area: string): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas/${encodeURIComponent(area)}/lines`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getDistinctMachines(plant: string, area: string, line: string): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas/${encodeURIComponent(area)}/lines/${encodeURIComponent(line)}/machines`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getDistinctMachinesWithoutLines(plant: string, area: string): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas/${encodeURIComponent(area)}/machines-without-lines`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getLinesOrMachinesAfterArea(plant: string, area: string): Promise<{success: boolean; data: {lines: Array<{code: string; name: string; type: string}>; machines: Array<{code: string; name: string; type: string}>}}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas/${encodeURIComponent(area)}/lines-or-machines`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getDistinctNumbers(plant: string, area: string, line: string, machine: string): Promise<{success: boolean; data: Array<{code: string; name: string}>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const response = await fetch(`${baseURL}/hierarchy/puextension/plants/${encodeURIComponent(plant)}/areas/${encodeURIComponent(area)}/lines/${encodeURIComponent(line)}/machines/${encodeURIComponent(machine)}/numbers`, {
      headers: this.headers()
    });
    return await response.json();
  }

  async getMachinesByHierarchy(plant: string, area?: string, line?: string, machine?: string, number?: string): Promise<{success: boolean; data: Array<{
    puno: number;
    pucode: string;
    plant: string;
    area: string;
    line: string;
    machine: string;
    number: string;
    puname: string;
    pudescription: string;
    digit_count: number;
  }>}> {
    const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const params = new URLSearchParams({ plant });
    if (area) params.append('area', area);
    if (line) params.append('line', line);
    if (machine) params.append('machine', machine);
    if (number) params.append('number', number);
    
    const response = await fetch(`${baseURL}/hierarchy/puextension/machines?${params.toString()}`, {
      headers: this.headers()
    });
    return await response.json();
  }
}

export const hierarchyService = new HierarchyService();
export default hierarchyService;

