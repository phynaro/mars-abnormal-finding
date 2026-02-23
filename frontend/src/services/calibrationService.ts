import { getAuthHeaders } from '@/utils/authHeaders';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const BASE_URL = `${API_BASE}/dashboard`;

// --- Person period summary (stacked bar: finished vs remaining per period)
export interface CalibrationPeriodData {
  period: string;
  periodNo: number;
  finished: number;
  remaining: number;
}

export interface CalibrationAssigneePeriodSummary {
  assigneeId: number;
  assigneeName: string;
  periods: CalibrationPeriodData[];
}

export interface PersonPeriodSummaryResponse {
  success: boolean;
  data: {
    assignees: CalibrationAssigneePeriodSummary[];
    companyYear: number | null;
  };
}

// --- Incoming / due-soon / overdue (schedule items)
export interface CalibrationScheduleItem {
  PMSchNo: number;
  PMNO: number;
  DUEDATE: string;
  WONo: number | null;
  WOStatusNo: number | null;
  PMCODE: string;
  PMNAME: string;
  WOCODE?: string | null;
  woStatusNo?: number | null;
  daysOverdue?: number;
  /** Late (within grace): days past target date */
  daysPastTarget?: number;
  /** Late (within grace): audit deadline = target + 7 (YYYY-MM-DD) */
  completeBy?: string | null;
}

export interface CalibrationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface IncomingResponse {
  success: boolean;
  data: {
    items: CalibrationScheduleItem[];
    days: number;
    pagination: CalibrationPagination;
  };
}

export interface LateResponse {
  success: boolean;
  data: { items: CalibrationScheduleItem[]; pagination: CalibrationPagination };
}

export interface DueSoonResponse {
  success: boolean;
  data: { items: CalibrationScheduleItem[]; pagination: CalibrationPagination };
}

export interface OverdueResponse {
  success: boolean;
  data: { items: CalibrationScheduleItem[]; pagination: CalibrationPagination };
}

// --- Jobs (paginated WOs)
export interface CalibrationJobItem {
  id: number;
  woCode: string;
  woDate: string | null;
  woStatusNo: number | null;
  PMNO: number | null;
  assigneeId: number | null;
  assigneeName: string | null;
}

export interface CalibrationJobsResponse {
  success: boolean;
  data: {
    workOrders: CalibrationJobItem[];
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

// --- PM plans
export interface CalibrationPmPlanItem {
  PMNO: number;
  PMCODE: string;
  PMNAME: string;
  FREQUENCY: number | null;
  FREQUNITNO: number | null;
  nextDueD: string | null;
  lastDoneD: string | null;
  EQNO: number | null;
  PUNO: number | null;
}

export interface PmPlansResponse {
  success: boolean;
  data: {
    items: CalibrationPmPlanItem[];
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

class CalibrationService {
  private headers() {
    return getAuthHeaders();
  }

  async getPersonPeriodSummary(params: {
    companyYear?: number;
    assigneeId?: number;
  } = {}): Promise<PersonPeriodSummaryResponse> {
    const q = new URLSearchParams();
    if (params.companyYear != null) q.set('companyYear', String(params.companyYear));
    if (params.assigneeId != null) q.set('assigneeId', String(params.assigneeId));
    const res = await fetch(`${BASE_URL}/calibration/person-period-summary?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration person-period summary');
    return res.json();
  }

  async getIncoming(params: { days?: number; page?: number; limit?: number; year?: number | null } = {}): Promise<IncomingResponse> {
    const q = new URLSearchParams();
    if (params.days != null) q.set('days', String(params.days));
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.year != null) q.set('year', String(params.year));
    const res = await fetch(`${BASE_URL}/calibration/incoming?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch incoming calibration');
    return res.json();
  }

  async getLate(params: { page?: number; limit?: number; year?: number | null } = {}): Promise<LateResponse> {
    const q = new URLSearchParams();
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.year != null) q.set('year', String(params.year));
    const res = await fetch(`${BASE_URL}/calibration/late?${q.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch calibration late (within grace)');
    return res.json();
  }

  async getDueSoon(params: { page?: number; limit?: number; year?: number | null } = {}): Promise<DueSoonResponse> {
    const q = new URLSearchParams();
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.year != null) q.set('year', String(params.year));
    const res = await fetch(`${BASE_URL}/calibration/due-soon?${q.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch calibration due soon');
    return res.json();
  }

  async getOverdue(params: { page?: number; limit?: number; year?: number | null } = {}): Promise<OverdueResponse> {
    const q = new URLSearchParams();
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.year != null) q.set('year', String(params.year));
    const res = await fetch(`${BASE_URL}/calibration/overdue?${q.toString()}`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch calibration overdue');
    return res.json();
  }

  async getJobs(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: number | string;
    assignee?: number | string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<CalibrationJobsResponse> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') q.set(k, String(v));
    });
    const res = await fetch(`${BASE_URL}/calibration/jobs?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration jobs');
    return res.json();
  }

  async getPmPlans(params: { page?: number; limit?: number } = {}): Promise<PmPlansResponse> {
    const q = new URLSearchParams();
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    const res = await fetch(`${BASE_URL}/calibration/pm-plans?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration PM plans');
    return res.json();
  }
}

export const calibrationService = new CalibrationService();
export default calibrationService;
