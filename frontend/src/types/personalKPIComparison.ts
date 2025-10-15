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
