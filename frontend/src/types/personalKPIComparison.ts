export interface PersonalKPIComparisonDataPoint {
  personno: number;
  personName: string;
  deptNo: number | null;
  deptCode: string | null;
  deptName: string | null;
  avatarUrl: string;
  initials: string;
  bgColor: string;
  ticketCountCreated: number;
  ticketCountClosed: number;
  downtimeSavedCreated: number;
  downtimeSavedAssigned: number;
  costSavedCreated: number;
  costSavedAssigned: number;
  ontimePercentage: number;
  avgResolutionHours: number;
  /** Total assigned tickets across plants (populated for ticketCountAssigned KPI) */
  ticketCountAssigned?: number;
}

export interface Department {
  DEPTNO: number;
  DEPTCODE: string;
  DEPTNAME: string;
}

export interface PersonalKPIComparisonResponse {
  success: boolean;
  data: {
    users: PersonalKPIComparisonDataPoint[];
    departments: Department[];
    summary: {
      totalUsers: number;
      dateRange: {
        startDate: string;
        endDate: string;
      };
    };
  };
}

/** One assignee × plant breakdown row for the stacked assigned chart */
export interface AssignedBreakdownRow {
  personno: number;
  personName: string;
  deptNo: number | null;
  deptCode: string | null;
  deptName: string | null;
  avatarUrl: string;
  initials: string;
  bgColor: string;
  plant: string;
  closedOnTime: number;
  closedDelay: number;
  openNotDue: number;
  openOverdue: number;
}

export interface UnassignedByPlant {
  plant: string;
  count: number;
}

export interface PersonalKPIAssignedBreakdownResponse {
  success: boolean;
  data: {
    rows: AssignedBreakdownRow[];
    unassigned: UnassignedByPlant[];
  };
  message?: string;
}

/** Chart row used by AssignedTicketStackedChart */
export interface AssignedChartBarRow {
  key: string;
  personno: number | null;
  personName: string;
  avatarUrl: string;
  initials: string;
  bgColor: string;
  plant?: string | null;
  closedOnTime: number;
  closedDelay: number;
  openNotDue: number;
  openOverdue: number;
  unassigned: number;
  total: number;
  isUnassigned: boolean;
}
