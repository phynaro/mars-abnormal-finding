import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Department } from "@/services/personnelService";

export type DepartmentUserKPIFilterPanelProps = {
  selectedDeptNo: number | null;
  selectedYear: number;
  selectedKPIType: 'created' | 'assigned' | 'closure';
  departments: Department[];
  years: number[];
  loading: boolean;
  onDeptChange: (deptNo: number | null) => void;
  onYearChange: (year: number) => void;
  onKPITypeChange: (type: 'created' | 'assigned' | 'closure') => void;
  onApply: () => void;
  onReset: () => void;
  onHideFilters: () => void;
};

const DepartmentUserKPIFilterPanel: React.FC<DepartmentUserKPIFilterPanelProps> = ({
  selectedDeptNo,
  selectedYear,
  selectedKPIType,
  departments,
  years,
  loading,
  onDeptChange,
  onYearChange,
  onKPITypeChange,
  onApply,
  onReset,
  onHideFilters,
}) => {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>{t("dashboard.departmentUserKPI.filters")}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onHideFilters}
            className="h-8 w-8 p-0"
            title={t("common.hideFilters")}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Department Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("dashboard.departmentUserKPI.selectDepartment")}</label>
          <Select
            value={selectedDeptNo?.toString() || ""}
            onValueChange={(value) => onDeptChange(value ? parseInt(value) : null)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("dashboard.departmentUserKPI.selectDepartment")} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.DEPTNO} value={dept.DEPTNO.toString()}>
                  {dept.DEPTNAME}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("dashboard.departmentUserKPI.selectYear")}</label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("dashboard.departmentUserKPI.kpiType")}</label>
          <Select
            value={selectedKPIType}
            onValueChange={(value) => onKPITypeChange(value as 'created' | 'assigned' | 'closure')}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">{t("dashboard.departmentUserKPI.ticketsCreated")}</SelectItem>
              <SelectItem value="assigned">{t("dashboard.departmentUserKPI.ticketsAssigned")}</SelectItem>
              <SelectItem value="closure">{t("dashboard.departmentUserKPI.closureRate")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button
            onClick={onApply}
            disabled={!selectedDeptNo || loading}
            className="flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t("common.apply")}
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            disabled={loading}
          >
            {t("common.reset")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentUserKPIFilterPanel;
