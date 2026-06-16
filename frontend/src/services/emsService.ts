import { getAuthHeaders, getAuthHeadersNoContentType } from '@/utils/authHeaders';
import type { EmsRole } from '@/utils/permissionChecker';
import type {
  CalibrationUserEvent,
  CalibrationUserEventCalendarRangeParams,
  CalibrationUserEventCategoryOption,
  CalibrationUserEventPagination,
  CalibrationUserEventQueryParams,
  CalibrationUserEventUpsertPayload,
  PmScheduleListItem,
} from '@/services/calibrationService';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const BASE_URL = `${API_BASE}/ems`;

export interface EmsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface EmsMeResponse {
  success: boolean;
  data: {
    emsRoles: EmsRole[];
    canAccess: boolean;
    canAdmin: boolean;
  };
}

export interface EmsKpiData {
  totalEquipment: number;
  overdue: number;
  dueThisWeek: number;
  dueSoon: number;
  ok: number;
  noWo: number;
}

export interface EmsDashboardItem {
  tagNo: string;
  description: string;
  area: string;
  plant: string;
  daysOverdue?: number | null;
  daysUntilDue?: number | null;
  dueDate?: string | null;
  woNo?: number | null;
  woCode?: string | null;
  assigneeId?: number | null;
  assigneeName?: string | null;
  pmSchNo?: string | null;
}

export type EmsEquipmentListSortBy = 'tagNo' | 'ccpCode' | 'description' | 'area' | 'equipmentType' | 'nextDue';
export type EmsEquipmentListSortOrder = 'ASC' | 'DESC';

export interface EmsEquipmentListItem {
  tagNo: string;
  eqNo: number;
  description: string;
  plant: string;
  area: string;
  manufacturer?: string;
  model?: string;
  equipmentType?: string;
  calInterval?: string;
  ccpCode?: string | null;
  status: string;
  nextDue?: string | null;
  assigneeName?: string | null;
}

export interface EmsRangeSpec {
  min?: number | null;
  max?: number | null;
  unit?: string | null;
  points?: number | null;
  raw?: string | null;
  type?: string | null;
}

export interface EmsMpeSpec {
  type?: string | null;
  value?: number | null;
  unit?: string | null;
  condition?: string | null;
  raw?: string | null;
}

export interface EmsEquipmentIdentity {
  tagNo: string;
  eqNo: number;
  description: string;
  plant: string;
  area: string;
  manufacturer?: string;
  model?: string;
  serialNo?: string;
  equipmentType?: string;
  status: string;
  workingRange?: EmsRangeSpec;
  calRange?: EmsRangeSpec;
  mpe?: EmsMpeSpec;
  ccpCode?: string;
  calRefWi?: string;
  calRefForm?: string;
  calInterval?: string;
  calIntervalWeeks?: number | null;
  imageUrl?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  updatedByName?: string | null;
}

export interface EmsEquipmentSpecifications {
  workingRange: EmsRangeSpec;
  calRange: EmsRangeSpec;
  mpe: EmsMpeSpec;
  calInterval?: string;
  calIntervalWeeks?: number | null;
  ccpCode?: string;
  calRefWi?: string;
  calRefForm?: string;
}

export interface EmsCurrentWo {
  woNo?: number | null;
  woCode?: string | null;
  dueDate?: string | null;
  woStatusNo?: number | null;
  assignedCalibrator?: string | null;
  assigneeId?: number | null;
}

export interface EmsPmHistoryItem {
  woNo: number;
  woCode?: string | null;
  completedDate?: string | null;
  performedBy?: string | null;
}

export interface EmsEquipmentDetail {
  identity: EmsEquipmentIdentity;
  specifications: EmsEquipmentSpecifications;
  currentWo: EmsCurrentWo | null;
  pmHistory: EmsPmHistoryItem[];
}

export interface EmsEquipmentUpdatePayload {
  description?: string | null;
  area?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNo?: string | null;
  equipmentType?: string | null;
  workingRangeMin?: number | null;
  workingRangeMax?: number | null;
  workingRangeUnit?: string | null;
  workingRangePoints?: number | null;
  calRangeMin?: number | null;
  calRangeMax?: number | null;
  calRangeUnit?: string | null;
  calRangePoints?: number | null;
  mpeType?: string | null;
  mpeValue?: number | null;
  mpeUnit?: string | null;
  mpeCondition?: string | null;
  ccpCode?: string | null;
  calRefWi?: string | null;
  calRefForm?: string | null;
  calInterval?: string | null;
  calIntervalWeeks?: number | null;
}

export interface EmsScheduleItem {
  tagNo: string;
  description: string;
  area: string;
  plant: string;
  woNo?: number | null;
  woCode?: string | null;
  woStatus: string;
  dueDate?: string | null;
  daysUntilDue?: number | null;
  daysOverdue?: number | null;
  assignedCalibrator?: string | null;
  assigneeId?: number | null;
  pmSchNo?: string | null;
}

export interface EmsScheduleKpi {
  totalSchedules: number;
  completed: number;
  remaining: number;
}

export interface EmsPlantMatrixItem {
  plant: string;
  plantLabel: string;
  total: number;
  done: number;
  inProgress: number;
  noWo: number;
  completionRate: number;
}

export interface EmsPlantMatrixData {
  mode: 'month' | 'period' | 'year';
  year: number;
  month?: number;
  period?: number;
  rangeStart: string;
  rangeEnd: string;
  plants: EmsPlantMatrixItem[];
}

export type EmsKpiBucket = 'overdue' | 'due_this_week' | 'due_soon';

export interface EmsFilterOptions {
  plants: { code: string; label: string }[];
  areas: string[];
  equipmentTypes: string[];
  statuses: string[];
}

export interface EmsRoleAssignment {
  id: number;
  personNo: string;
  personName: string;
  emsRole: EmsRole;
  createdAt?: string;
}

export interface EmsManagerArea {
  id: number;
  personNo: string;
  personName: string;
  plant: string | null;
  area: string | null;
  createdAt?: string;
}

async function emsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `EMS request failed (${res.status})`);
  }
  return body as T;
}

function toQuery(params: Record<string, string | number | undefined | null | string[]>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => sp.append(key, v));
    } else {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

const emsService = {
  async getMe(): Promise<EmsMeResponse['data']> {
    const res = await emsFetch<EmsMeResponse>('/me');
    return res.data;
  },

  async getDashboardKpi(params?: { plant?: string; area?: string }): Promise<EmsKpiData> {
    const res = await emsFetch<{ success: boolean; data: EmsKpiData }>(
      `/dashboard/kpi${toQuery(params || {})}`
    );
    return res.data;
  },

  async getOverdue(params?: { plant?: string; area?: string; page?: number; limit?: number }) {
    return emsFetch<{ success: boolean; data: { items: EmsDashboardItem[]; pagination: EmsPagination } }>(
      `/dashboard/overdue${toQuery(params || {})}`
    );
  },

  async getDueThisWeek(params?: { plant?: string; area?: string; page?: number; limit?: number }) {
    return emsFetch<{ success: boolean; data: { items: EmsDashboardItem[]; pagination: EmsPagination } }>(
      `/dashboard/due-this-week${toQuery(params || {})}`
    );
  },

  async getDueSoon(params?: { plant?: string; area?: string; page?: number; limit?: number }) {
    return emsFetch<{ success: boolean; data: { items: EmsDashboardItem[]; pagination: EmsPagination } }>(
      `/dashboard/due-soon${toQuery(params || {})}`
    );
  },

  async getPlantMatrix(params: {
    mode: 'month' | 'period' | 'year';
    year: number;
    month?: number;
    period?: number;
    startDate: string;
    endDate: string;
  }) {
    const res = await emsFetch<{ success: boolean; data: EmsPlantMatrixData }>(
      `/dashboard/plant-matrix${toQuery(params)}`
    );
    return res.data;
  },

  async listEquipment(params?: {
    page?: number;
    limit?: number;
    plant?: string;
    area?: string;
    equipmentType?: string;
    search?: string;
    status?: string[];
    kpiBucket?: EmsKpiBucket | string;
    sortBy?: EmsEquipmentListSortBy;
    sortOrder?: EmsEquipmentListSortOrder;
  }) {
    const { status, ...rest } = params || {};
    const query = toQuery({
      ...rest,
      status: status?.length ? status.join(',') : undefined,
    });
    return emsFetch<{ success: boolean; data: { items: EmsEquipmentListItem[]; pagination: EmsPagination } }>(
      `/equipment${query}`
    );
  },

  async getFilterOptions(plant?: string) {
    return emsFetch<{ success: boolean; data: EmsFilterOptions }>(
      `/equipment/filters${toQuery({ plant })}`
    );
  },

  async getEquipmentDetail(tagNo: string, historyLimit = 5) {
    return emsFetch<{ success: boolean; data: EmsEquipmentDetail }>(
      `/equipment/${encodeURIComponent(tagNo)}${toQuery({ historyLimit })}`
    );
  },

  async updateEquipment(
    tagNo: string,
    payload: EmsEquipmentUpdatePayload,
    imageFile?: File,
    historyLimit = 5,
  ) {
    const form = new FormData();
    form.append('payload', JSON.stringify(payload));
    if (imageFile) {
      form.append('image', imageFile);
    }

    const res = await fetch(
      `${BASE_URL}/equipment/${encodeURIComponent(tagNo)}${toQuery({ historyLimit })}`,
      {
        method: 'PUT',
        headers: getAuthHeadersNoContentType(),
        body: form,
      },
    );

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to update equipment');
    }
    return result as { success: boolean; data: EmsEquipmentDetail; message: string };
  },

  async getScheduleList(params?: {
    page?: number;
    limit?: number;
    plant?: string;
    area?: string;
    woStatus?: string;
    dueFrom?: string;
    dueTo?: string;
  }) {
    return emsFetch<{ success: boolean; data: { items: EmsScheduleItem[]; pagination: EmsPagination } }>(
      `/schedule${toQuery(params || {})}`
    );
  },

  async getScheduleKpi(params?: {
    plant?: string;
    area?: string;
    woStatus?: string;
    dueFrom?: string;
    dueTo?: string;
  }) {
    const res = await emsFetch<{ success: boolean; data: EmsScheduleKpi }>(
      `/schedule/kpi${toQuery(params || {})}`
    );
    return res.data;
  },

  async getScheduleCalendarRange(params: {
    viewStartDate: string;
    viewEndDate: string;
    plant?: string;
    area?: string;
    woStatus?: string;
  }) {
    return emsFetch<{
      success: boolean;
      data: {
        items: PmScheduleListItem[];
        rangeStart: string;
        rangeEnd: string;
        count: number;
      };
    }>(`/schedule/calendar-range${toQuery(params)}`);
  },

  async getScheduleAssignees() {
    return emsFetch<{ success: boolean; data: { users: Array<{ id: number; name: string }> } }>(
      '/schedule/assignees'
    );
  },

  async getUserEvents(params: CalibrationUserEventQueryParams = {}) {
    return emsFetch<{
      success: boolean;
      data: {
        items: CalibrationUserEvent[];
        categories: CalibrationUserEventCategoryOption[];
        pagination: CalibrationUserEventPagination;
      };
    }>(`/user-events${toQuery(params as Record<string, string | number | undefined>)}`);
  },

  async getUserEventsForCalendarRange(params: CalibrationUserEventCalendarRangeParams) {
    return emsFetch<{
      success: boolean;
      data: {
        items: CalibrationUserEvent[];
        rangeStart: string;
        rangeEnd: string;
        count: number;
      };
    }>(`/user-events/calendar-range${toQuery(params as Record<string, string | undefined>)}`);
  },

  async createUserEvent(payload: CalibrationUserEventUpsertPayload) {
    return emsFetch<{ success: boolean; data: CalibrationUserEvent }>('/user-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async updateUserEvent(id: number, payload: CalibrationUserEventUpsertPayload) {
    return emsFetch<{ success: boolean; data: CalibrationUserEvent }>(`/user-events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async deleteUserEvent(id: number) {
    return emsFetch<{ success: boolean; data: { id: number } }>(`/user-events/${id}`, {
      method: 'DELETE',
    });
  },

  async listRoleAssignments() {
    return emsFetch<{ success: boolean; data: { items: EmsRoleAssignment[] } }>('/roles');
  },

  async assignRole(personNo: string, emsRole: EmsRole) {
    return emsFetch<{ success: boolean; data: EmsRoleAssignment }>('/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personNo, emsRole }),
    });
  },

  async removeRole(id: number) {
    return emsFetch<{ success: boolean; message: string }>(`/roles/${id}`, { method: 'DELETE' });
  },

  async listManagerAreas() {
    return emsFetch<{ success: boolean; data: { items: EmsManagerArea[] } }>('/manager-areas');
  },

  async createManagerArea(personNo: string, plant: string, area?: string) {
    return emsFetch<{ success: boolean; data: EmsManagerArea }>('/manager-areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personNo, plant, area: area || null }),
    });
  },

  async deleteManagerArea(id: number) {
    return emsFetch<{ success: boolean; message: string }>(`/manager-areas/${id}`, { method: 'DELETE' });
  },
};

export default emsService;
