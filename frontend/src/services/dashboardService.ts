import authService from './authService';

export type GroupBy = 'daily' | 'weekly' | 'period';

export interface TrendPoint {
  date: string;
  count: number;
  periodStart?: string;
  periodEnd?: string;
  year?: number;
  week?: number;
  month?: number;
}

export interface FilterOption { id: number; code?: string; name?: string }

export interface WorkOrderTrendResponse {
  success: boolean;
  data: {
    trend: TrendPoint[];
    filters: {
      woTypes: FilterOption[];
      departments: FilterOption[];
      sites: FilterOption[];
    };
    periodInfo: Record<string, {
      firstSunday: string;
      periods: Array<{
        period: number;
        startDate: string;
        endDate: string;
        label: string;
      }>;
    }>;
    summary: {
      totalWorkOrders: number;
      dateRange: { start: string | null; end: string | null };
      groupBy: GroupBy;
      appliedFilters: Record<string, any>;
    };
  };
}

export interface TopPerformer {
  personno: number;
  personName: string;
  avatarUrl?: string;
  ticketCount?: number;
  totalSavings?: number;
  totalDowntimeSaved?: number;
}

export interface AreaData {
  id: number;
  name: string;
  code: string;
  description?: string;
  plant_id: number;
  is_active: boolean;
  plant_name?: string;
  plant_code?: string;
}

export interface ComparisonMetric {
  percentage: number;
  type: 'no_change' | 'new_activity' | 'activity_stopped' | 'increase' | 'decrease';
  description: string;
}

export interface AbnormalFindingKPIResponse {
  success: boolean;
  data: {
    kpis: {
      totalTicketsThisPeriod: number;
      totalTicketsLastPeriod: number;
      closedTicketsThisPeriod: number;
      closedTicketsLastPeriod: number;
      pendingTicketsThisPeriod: number;
      pendingTicketsLastPeriod: number;
      totalDowntimeAvoidanceThisPeriod: number;
      totalDowntimeAvoidanceLastPeriod: number;
      totalCostAvoidanceThisPeriod: number;
      totalCostAvoidanceLastPeriod: number;
    };
    topPerformers: {
      topReporter: TopPerformer | null;
      topCostSaver: TopPerformer | null;
      topDowntimeSaver: TopPerformer | null;
    };
    periodInfo: {
      currentPeriod: {
        startDate: string;
        endDate: string;
      };
      lastPeriod: {
        startDate: string;
        endDate: string;
      } | null;
    };
    summary: {
      appliedFilters: {
        startDate: string;
        endDate: string;
        compare_startDate?: string;
        compare_endDate?: string;
        area_id?: number;
      };
      comparisonMetrics: {
        ticketGrowthRate: ComparisonMetric;
        closureRateImprovement: ComparisonMetric;
        costAvoidanceGrowth: ComparisonMetric;
        downtimeAvoidanceGrowth: ComparisonMetric;
      };
    };
  };
}

class DashboardService {
  private baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/dashboard`;
  private hierarchyURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')}/hierarchy`;

  private headers() { return authService.getAuthHeaders(); }

  async getAllAreas(): Promise<{ success: boolean; data: AreaData[] }> {
    const res = await fetch(`${this.hierarchyURL}/areas`, { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch areas');
    return res.json();
  }

  async getWorkOrderVolumeTrend(params: {
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    groupBy?: GroupBy;
    woType?: string | number;
    department?: string | number;
    site?: string | number;
    assign?: string | number;
    year?: string | number;
    fromPeriod?: string | number;
    toPeriod?: string | number;
    fromYear?: string | number;
    toYear?: string | number;
  } = {}): Promise<WorkOrderTrendResponse> {
    const url = new URL(`${this.baseURL}/workorder-volume-trend`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch work order volume trend');
    return res.json();
  }

  async getAbnormalFindingKPIs(params: {
    startDate: string; // YYYY-MM-DD (required)
    endDate: string;   // YYYY-MM-DD (required)
    compare_startDate?: string; // YYYY-MM-DD
    compare_endDate?: string;   // YYYY-MM-DD
    area_id?: number;
  }): Promise<AbnormalFindingKPIResponse> {
    const url = new URL(`${this.baseURL}/af`);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    });
    const res = await fetch(url.toString(), { headers: this.headers() });
    if (!res.ok) throw new Error('Failed to fetch abnormal finding KPIs');
    return res.json();
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;

