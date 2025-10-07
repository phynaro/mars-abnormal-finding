import authService from './authService';
import { getAuthHeaders } from '../utils/authHeaders';

export interface BacklogItem {
  woStatusName: string;
  woStatusNo: number;
  deptCode?: string;
  personName?: string;
  count: number;
  total: number;
}

export interface BacklogWOTypeDeptItem {
  deptNo: number;
  deptCode: string;
  woTypeNo: number;
  woTypeCode: string;
  woStatusNo: number;
  woStatusCode: string;
  total: number;
}

export interface BacklogDetailItem {
  wono: number;
  woCode: string;
  deptNo: number;
  wrDate: string;
  dfr: number;
  woStatusNo: number;
  woStatusCode: string;
  woStatusName: string;
  woDate: string;
  deptCode: string;
  deptName: string;
  woTypeCode: string;
  woTypeName: string;
  priorityNo: number;
  priorityCode: string;
  priorityName: string;
  wrNo: number;
  refWrCode: string;
  pmNo: number;
  refPmCode: string;
  puNo: number;
  puCode: string;
  puName: string;
  eqNo: number;
  eqCode: string;
  eqName: string;
  symptom: string;
  flagPuDown: string;
  aiFlagPuDown: number;
  puNoEffected: number;
  puEffectedCode: string;
  puEffectedName: string;
  adSymptomDtsDate: string;
  asSymptomDtsDate: string;
  asSymptomDtsTime: string;
  adSymptomDtfDate: string;
  asSymptomDtfDate: string;
  asSymptomDtfTime: string;
  dtDuration: number;
  adSchSDate: string;
  schSDate: string;
  adSchFDate: string;
  schFDate: string;
  waitForShutDown: number;
  waitForMaterial: number;
  waitForOther: number;
  assign: number;
  planCode: string;
  planFirstName: string;
  schDuration: number;
  siteNo: number;
  manHour: number;
  wrUrgentCode: string;
  wrUrgentName: string;
  wfStatusCode: string;
  puLocTypeName: string;
}

export interface BacklogResponse {
  success: boolean;
  data: {
    backlog: BacklogItem[];
    summary: {
      totalWorkOrders: number;
      totalDepartments?: number;
      totalUsers?: number;
      siteNo: number;
    };
  };
}

export interface BacklogWOTypeDeptResponse {
  success: boolean;
  data: {
    backlog: BacklogWOTypeDeptItem[];
    summary: {
      totalWorkOrders: number;
      totalDepartments: number;
      totalWOTypes: number;
      totalStatuses: number;
      siteNo: number;
    };
  };
}

export interface BacklogDetailResponse {
  success: boolean;
  data: {
    details: BacklogDetailItem[];
    summary: {
      totalWorkOrders: number;
      department?: string;
      personName?: string;
      siteNo: number;
      statusBreakdown: Record<string, number>;
    };
  };
}

class BacklogService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/backlog`;

  private headers() { return getAuthHeaders(); }

  /**
   * Get backlog by department
   */
  async getBacklogAssign(params: {
    siteNo?: number;
  } = {}): Promise<BacklogResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        queryParams.set(k, String(v));
      }
    });
    const url = `${this.baseURL}/assign?${queryParams.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch backlog by department');
    return res.json();
  }

  /**
   * Get backlog by department - Level 1 detail
   */
  async getBacklogAssignLv1(params: {
    siteNo?: number;
    deptCode: string;
  }): Promise<BacklogDetailResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        queryParams.set(k, String(v));
      }
    });
    const url = `${this.baseURL}/assign/lv1?${queryParams.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch backlog detail by department');
    return res.json();
  }

  /**
   * Get backlog by user
   */
  async getBacklogAssignTo(params: {
    siteNo?: number;
  } = {}): Promise<BacklogResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        queryParams.set(k, String(v));
      }
    });
    const url = `${this.baseURL}/assignto?${queryParams.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch backlog by user');
    return res.json();
  }

  /**
   * Get backlog by user - Level 1 detail
   */
  async getBacklogAssignToLv1(params: {
    siteNo?: number;
    personName: string;
  }): Promise<BacklogDetailResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        queryParams.set(k, String(v));
      }
    });
    const url = `${this.baseURL}/assignto/lv1?${queryParams.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch backlog detail by user');
    return res.json();
  }

  /**
   * Get backlog by work order type and department
   */
  async getBacklogByWOTypeAndDept(params: {
    siteNo?: number;
  } = {}): Promise<BacklogWOTypeDeptResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        queryParams.set(k, String(v));
      }
    });
    const url = `${this.baseURL}/wotype-dept?${queryParams.toString()}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch backlog by work order type and department');
    return res.json();
  }
}

export const backlogService = new BacklogService();
export default backlogService;
