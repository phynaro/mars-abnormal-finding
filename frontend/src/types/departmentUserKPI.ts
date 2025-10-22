export interface DepartmentUserKPIPeriodData {
  period: string; // "P1", "P2", etc.
  tickets: number;
  target: number;
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
