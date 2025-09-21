export interface HierarchySiteOverview {
  SiteNo: number;
  SiteName: string;
  type?: 'site';
  departments: Record<string, HierarchyDepartmentOverview>;
  stats: {
    totalDepartments: number;
    totalProductionUnits: number;
    totalEquipment: number;
  };
}

export interface HierarchyDepartmentOverview {
  DEPTNO: number;
  DEPTCODE?: string;
  DEPTNAME: string;
  type?: 'department';
  virtual?: boolean;
  stats: {
    productionUnits: number;
    equipment: number;
  };
}

export interface HierarchyDepartmentDetailsResponse {
  success: boolean;
  data: {
    department: {
      DEPTNO: number;
      DEPTNAME: string;
      virtual?: boolean;
    };
    productionUnits: Record<string, ProductionUnitWithEquipment>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductionUnitWithEquipment {
  PUNO: number;
  PUCODE: string;
  PUNAME: string;
  PUTYPENAME?: string;
  PUSTATUSNAME?: string;
  type?: 'productionUnit';
  equipment: Record<string, EquipmentItem>;
}

export interface EquipmentItem {
  EQNO: number;
  EQCODE: string;
  EQNAME: string;
  EQTYPENAME?: string;
  type?: 'equipment';
}

