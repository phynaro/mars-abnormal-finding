import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Building, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DepartmentUserKPISummary, DepartmentUserKPIUserData } from "@/types/departmentUserKPI";

export type DepartmentUserKPISummaryCardsProps = {
  summary: DepartmentUserKPISummary | null;
  userData: DepartmentUserKPIUserData[];
  kpiType: 'created' | 'assigned' | 'closure';
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
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

  const isClosure = kpiType === 'closure';
  const totalTickets = userData.reduce((sum, user) =>
    sum + user.periods.reduce((periodSum, period) => periodSum + period.tickets, 0), 0
  );
  const avgTicketsPerUser = userData.length > 0 ? totalTickets / userData.length : 0;
  const avgClosureRatePct = isClosure && userData.length > 0
    ? userData.reduce((sum, user) => {
        const userAvg = user.periods.length > 0
          ? user.periods.reduce((s, p) => s + p.tickets, 0) / user.periods.length
          : 0;
        return sum + userAvg;
      }, 0) / userData.length
    : 0;

  const tiles = [
    {
      key: 'department',
      title: t("dashboard.departmentUserKPI.department"),
      value: summary.deptName,
      description: `${t("dashboard.departmentUserKPI.deptCode")}: ${summary.deptNo}`,
      icon: <Building className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'users',
      title: t("dashboard.departmentUserKPI.users"),
      value: summary.totalUsers,
      description: t("dashboard.departmentUserKPI.activeUsers"),
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'year',
      title: t("dashboard.departmentUserKPI.year"),
      value: summary.year,
      description: t("dashboard.departmentUserKPI.companyYear"),
      icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
    },
    {
      key: 'total',
      title: isClosure
        ? t("dashboard.departmentUserKPI.closureRate")
        : kpiType === 'created'
          ? t("dashboard.departmentUserKPI.totalCreated")
          : t("dashboard.departmentUserKPI.totalAssigned"),
      value: isClosure ? `${avgClosureRatePct.toFixed(1)}%` : totalTickets,
      description: isClosure
        ? t("dashboard.departmentUserKPI.avgClosureRate")
        : `${t("dashboard.departmentUserKPI.avgPerUser")}: ${avgTicketsPerUser.toFixed(1)}`,
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {tiles.map((tile) => (
        <Card key={tile.key}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{tile.title}</p>
                <p className="text-2xl font-bold truncate">{tile.value}</p>
                <p className="text-xs text-muted-foreground truncate">{tile.description}</p>
              </div>
              {tile.icon}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DepartmentUserKPISummaryCards;
