import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Building, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DepartmentUserKPISummary, DepartmentUserKPIUserData } from "@/types/departmentUserKPI";

export type DepartmentUserKPISummaryCardsProps = {
  summary: DepartmentUserKPISummary | null;
  userData: DepartmentUserKPIUserData[];
  kpiType: 'created' | 'assigned';
  loading: boolean;
};

const DepartmentUserKPISummaryCards: React.FC<DepartmentUserKPISummaryCardsProps> = ({
  summary,
  userData,
  kpiType,
  loading,
}) => {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm animate-pulse bg-gray-200 h-4 rounded"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Calculate total tickets from userData instead of summary.users
  const totalTickets = userData.reduce((sum, user) => 
    sum + user.periods.reduce((periodSum, period) => periodSum + period.tickets, 0), 0
  );

  const avgTicketsPerUser = userData.length > 0 ? totalTickets / userData.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Department */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>{t("dashboard.departmentUserKPI.department")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.deptName}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.departmentUserKPI.deptCode")}: {summary.deptNo}
          </p>
        </CardContent>
      </Card>

      {/* Users Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>{t("dashboard.departmentUserKPI.users")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.departmentUserKPI.activeUsers")}
          </p>
        </CardContent>
      </Card>

      {/* Year */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{t("dashboard.departmentUserKPI.year")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.year}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.departmentUserKPI.companyYear")}
          </p>
        </CardContent>
      </Card>

      {/* Total Tickets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>
              {kpiType === 'created' 
                ? t("dashboard.departmentUserKPI.totalCreated") 
                : t("dashboard.departmentUserKPI.totalAssigned")
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTickets}</div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.departmentUserKPI.avgPerUser")}: {avgTicketsPerUser.toFixed(1)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepartmentUserKPISummaryCards;
