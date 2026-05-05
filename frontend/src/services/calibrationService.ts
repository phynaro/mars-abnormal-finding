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

// --- PM schedule calibration (PMCODE contains -CAL)
export interface PmScheduleEquipmentTypeCount {
  typeKey: string;
  count: number;
  displayLabel: string;
}

export interface PmScheduleKpiResponse {
  success: boolean;
  data: {
    totalCalibrationJobs: number;
    totalCompleted: number;
    startDate?: string;
    endDate?: string;
    equipmentTypes: PmScheduleEquipmentTypeCount[];
  };
}

export interface PmScheduleListItem {
  PMSchNo: number;
  PMNO: number;
  DUEDATE: string;
  WONo: number | null;
  schedWOStatusNo: number | null;
  PMCODE: string;
  PMNAME: string;
  DEPTNO: number | null;
  assigneeId: number | null;
  assigneeName: string | null;
  WOCODE: string | null;
  woStatusNo: number | null;
  EQCODE: string | null;
  eqTypeKey: string | null;
}

export interface PmScheduleListResponse {
  success: boolean;
  data: {
    items: PmScheduleListItem[];
    pagination: CalibrationPagination;
  };
}

export interface PmScheduleDetail extends PmScheduleListItem {
  DEPTCODE: string | null;
  DEPTNAME: string | null;
  plantCode: string | null;
  plantLabel: string | null;
  EQNAME: string | null;
  eqTypeDisplayLabel: string | null;
  woDateRaw: string | null;
  woFinishDateRaw: string | null;
  woDate: string | null;
  woFinishDate: string | null;
  derivedStatus: 'done' | 'in-progress' | 'pending';
  derivedStatusLabel: string;
}

export interface PmScheduleDetailResponse {
  success: boolean;
  data: PmScheduleDetail;
}

export type PmCalendarView = 'month' | 'week' | 'agenda';

export interface PmScheduleQueryParams {
  startDate: string;
  endDate: string;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
  /** Filter schedule rows by parsed EQ equipment type key (e.g. TE) or _UNPARSED */
  eqType?: string;
  page?: number;
  limit?: number;
}

export interface PmScheduleCalendarRangeParams {
  viewStartDate: string;
  viewEndDate: string;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
  eqType?: string;
}

export interface PmScheduleCalendarRangeResponse {
  success: boolean;
  data: {
    items: PmScheduleListItem[];
    rangeStart: string;
    rangeEnd: string;
    count: number;
  };
}

export interface PmScheduleAssigneesResponse {
  success: boolean;
  data: {
    users: Array<{ id: number; name: string }>;
  };
}

export interface PmScheduleTeamMember {
  assigneeId: number;
  assigneeName: string;
  totalScheduled: number;
  totalCompleted: number;
  totalRemaining: number;
}

export interface PmScheduleTeamKpiResponse {
  success: boolean;
  data: {
    members: PmScheduleTeamMember[];
  };
}

export type CalibrationUserEventCategory =
  | 'shutdown'
  | 'cleaning'
  | 'inspection'
  | 'holiday'
  | 'other';

export interface CalibrationUserEvent {
  id: number;
  title: string;
  description: string | null;
  category: CalibrationUserEventCategory;
  categoryLabel: string;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  plant_code: string | null;
  plant_label: string | null;
  dept_no: number | null;
  dept_code: string | null;
  dept_name: string | null;
  assignee_id: number | null;
  assignee_name: string | null;
  color_hex: string | null;
  is_active: boolean;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  updated_by: number | null;
  updated_by_name: string | null;
  updated_at: string | null;
  deleted_by: number | null;
  deleted_at: string | null;
}

export interface CalibrationUserEventCategoryOption {
  value: CalibrationUserEventCategory;
  label: string;
}

export interface CalibrationUserEventPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CalibrationUserEventListResponse {
  success: boolean;
  data: {
    items: CalibrationUserEvent[];
    categories: CalibrationUserEventCategoryOption[];
    pagination: CalibrationUserEventPagination;
  };
}

export interface CalibrationUserEventCalendarRangeResponse {
  success: boolean;
  data: {
    items: CalibrationUserEvent[];
    rangeStart: string;
    rangeEnd: string;
    count: number;
  };
}

export interface CalibrationUserEventDetailResponse {
  success: boolean;
  data: CalibrationUserEvent;
}

export interface CalibrationUserEventQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: CalibrationUserEventCategory;
  isActive?: boolean;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
}

export interface CalibrationUserEventCalendarRangeParams {
  viewStartDate: string;
  viewEndDate: string;
  plant?: string;
  dept?: string;
  assigneeIds?: string;
}

export interface CalibrationUserEventUpsertPayload {
  title: string;
  description?: string | null;
  category: CalibrationUserEventCategory;
  start_at: string;
  end_at: string;
  is_all_day?: boolean;
  plant_code?: string | null;
  dept_no?: number | null;
  assignee_id?: number | null;
  color_hex?: string | null;
  is_active?: boolean;
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

  async getPmScheduleKpi(params: PmScheduleQueryParams): Promise<PmScheduleKpiResponse> {
    const q = new URLSearchParams();
    q.set('startDate', params.startDate);
    q.set('endDate', params.endDate);
    if (params.plant) q.set('plant', params.plant);
    if (params.dept) q.set('dept', params.dept);
    if (params.assigneeIds) q.set('assigneeIds', params.assigneeIds);
    if (params.eqType) q.set('eqType', params.eqType);
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule/kpi?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration schedule KPIs');
    return res.json();
  }

  async getPmScheduleTeamKpi(params: PmScheduleQueryParams): Promise<PmScheduleTeamKpiResponse> {
    const q = new URLSearchParams();
    q.set('startDate', params.startDate);
    q.set('endDate', params.endDate);
    if (params.plant) q.set('plant', params.plant);
    if (params.dept) q.set('dept', params.dept);
    if (params.assigneeIds) q.set('assigneeIds', params.assigneeIds);
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule/team-kpi?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration team KPI');
    return res.json();
  }

  async getPmScheduleCalendarRange(
    params: PmScheduleCalendarRangeParams,
  ): Promise<PmScheduleCalendarRangeResponse> {
    const q = new URLSearchParams();
    q.set('viewStartDate', params.viewStartDate);
    q.set('viewEndDate', params.viewEndDate);
    if (params.plant) q.set('plant', params.plant);
    if (params.dept) q.set('dept', params.dept);
    if (params.assigneeIds) q.set('assigneeIds', params.assigneeIds);
    if (params.eqType) q.set('eqType', params.eqType);
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule/calendar-range?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration calendar range');
    return res.json();
  }

  async getPmScheduleDetail(pmSchNo: number): Promise<PmScheduleDetailResponse> {
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule/detail/${pmSchNo}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration schedule detail');
    return res.json();
  }

  async getCalibrationUserEvents(
    params: CalibrationUserEventQueryParams = {},
  ): Promise<CalibrationUserEventListResponse> {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        q.set(k, String(v));
      }
    });
    const res = await fetch(`${BASE_URL}/calibration/user-events?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration user events');
    return res.json();
  }

  async getCalibrationUserEventById(id: number): Promise<CalibrationUserEventDetailResponse> {
    const res = await fetch(`${BASE_URL}/calibration/user-events/${id}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration user event detail');
    return res.json();
  }

  async getCalibrationUserEventsForCalendarRange(
    params: CalibrationUserEventCalendarRangeParams,
  ): Promise<CalibrationUserEventCalendarRangeResponse> {
    const q = new URLSearchParams();
    q.set('viewStartDate', params.viewStartDate);
    q.set('viewEndDate', params.viewEndDate);
    if (params.plant) q.set('plant', params.plant);
    if (params.dept) q.set('dept', params.dept);
    if (params.assigneeIds) q.set('assigneeIds', params.assigneeIds);
    const res = await fetch(`${BASE_URL}/calibration/user-events/calendar-range?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch calibration user events for calendar range');
    return res.json();
  }

  async createCalibrationUserEvent(
    payload: CalibrationUserEventUpsertPayload,
  ): Promise<CalibrationUserEventDetailResponse> {
    const res = await fetch(`${BASE_URL}/calibration/user-events`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create calibration user event');
    return res.json();
  }

  async updateCalibrationUserEvent(
    id: number,
    payload: CalibrationUserEventUpsertPayload,
  ): Promise<CalibrationUserEventDetailResponse> {
    const res = await fetch(`${BASE_URL}/calibration/user-events/${id}`, {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update calibration user event');
    return res.json();
  }

  async deleteCalibrationUserEvent(id: number): Promise<{ success: boolean; data: { id: number } }> {
    const res = await fetch(`${BASE_URL}/calibration/user-events/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to delete calibration user event');
    return res.json();
  }

  async getPmScheduleAssignees(): Promise<PmScheduleAssigneesResponse> {
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule/assignees`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration assignees');
    return res.json();
  }

  async getPmScheduleList(params: PmScheduleQueryParams): Promise<PmScheduleListResponse> {
    const q = new URLSearchParams();
    q.set('startDate', params.startDate);
    q.set('endDate', params.endDate);
    if (params.plant) q.set('plant', params.plant);
    if (params.dept) q.set('dept', params.dept);
    if (params.assigneeIds) q.set('assigneeIds', params.assigneeIds);
    if (params.eqType) q.set('eqType', params.eqType);
    if (params.page != null) q.set('page', String(params.page));
    if (params.limit != null) q.set('limit', String(params.limit));
    const res = await fetch(`${BASE_URL}/calibration/pm-schedule?${q.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to fetch PM calibration schedule list');
    return res.json();
  }
}

export const calibrationService = new CalibrationService();
export default calibrationService;
