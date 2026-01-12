import { getAuthHeaders } from '../utils/authHeaders';
import { getApiBaseUrl } from '../utils/url';

export interface MachineConfig {
  machineName: string;
  puIds: number[];
}

export interface AreaDashboardConfig {
  areaCode: string;
  areaName: string;
  plant: string;
  machines: MachineConfig[];
}

export interface MachineMetrics {
  machineName: string;
  puIds: number[];
  metrics: {
    openTickets: number;
    closedTickets: number;
    percentClosed: number;
    percentClosedByOperator: number;
    percentClosedByReliability: number;
    pendingByOperator: number;
    pendingByReliability: number;
    delayTickets: number;
  };
}

export interface AreaMetrics {
  areaCode: string;
  areaName: string;
  plant: string | null;
  machines: MachineMetrics[];
  areaMetrics: {
    openTickets: number;
    closedTickets: number;
    percentClosed: number;
  };
}

export interface AreaDashboardMetricsResponse {
  success: boolean;
  data: AreaMetrics[];
}

export interface GetAreaMetricsParams {
  startDate: string;
  endDate: string;
  week?: number;
  date?: string;
  areaConfig: AreaDashboardConfig[];
}

class AreaDashboardService {
  private headers() {
    return getAuthHeaders();
  }

  async getAreaMetrics(params: GetAreaMetricsParams): Promise<AreaDashboardMetricsResponse> {
    const response = await fetch(`${getApiBaseUrl()}/dashboard/area/metrics`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch area metrics' }));
      throw new Error(error.message || 'Failed to fetch area metrics');
    }

    return response.json();
  }
}

export default new AreaDashboardService();
