export interface DepartmentUserKPIPeriodData {
  period: string; // "P1", "P2", etc.
  tickets: number;
  target: number;
  /** Total assigned in period (schedule_finish in period, assigned_to set). Used for closure KPI stacked bar. */
  total?: number;
  /** Closed on time in period. Used for closure KPI stacked bar. */
  on_time_count?: number;
  /** Closed late in period (actual_finish_at >= schedule_finish). Used for closure KPI stacked bar. */
  closed_late_count?: number;
}

export interface DepartmentUserKPIUserData {
  personno: number;
  personName: string;
  deptNo: number;
  deptName: string;
  periods: DepartmentUserKPIPeriodData[];
}

export interface DepartmentUserKPISummary {
  totalUsers: number;
  year: number;
  deptNo: number;
  deptName: string;
}

export interface DepartmentUserKPIResponse {
  success: boolean;
  data: {
    users: DepartmentUserKPIUserData[];
    summary: DepartmentUserKPISummary;
  };
}
