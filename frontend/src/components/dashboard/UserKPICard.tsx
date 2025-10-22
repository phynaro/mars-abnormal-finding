import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPeriodDateRange } from "@/utils/periodCalculations";
import type { DepartmentUserKPIUserData } from "@/types/departmentUserKPI";

export type UserKPICardProps = {
  user: DepartmentUserKPIUserData;
  selectedYear: number;
  kpiType: 'created' | 'assigned';
};

const UserKPICard: React.FC<UserKPICardProps> = ({
  user,
  selectedYear,
  kpiType,
}) => {
  const { t } = useLanguage();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const period = dataPoint.period;

      const periodNumber = parseInt(period.replace("P", ""), 10);
      const { startDate, endDate } = getPeriodDateRange(selectedYear, periodNumber);
      
      const dateRange = {
        startDate: startDate.toLocaleDateString(),
        endDate: endDate.toLocaleDateString(),
      };

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{period}</p>
          <p className="text-sm text-muted-foreground mb-2">
            {`${dateRange.startDate} - ${dateRange.endDate}`}
          </p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-brand font-medium">
                {kpiType === 'created' ? t("dashboard.departmentUserKPI.ticketsCreated") : t("dashboard.departmentUserKPI.ticketsAssigned")}:
              </span>{" "}
              {dataPoint.tickets}
            </p>
            <p className="text-sm">
              <span className="text-destructive font-medium">Target:</span>{" "}
              {dataPoint.target}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Sort periods numerically (P1, P2, ..., P13) instead of alphabetically
  const sortedPeriods = [...user.periods].sort((a, b) => {
    const aNum = parseInt(a.period.replace("P", ""), 10);
    const bNum = parseInt(b.period.replace("P", ""), 10);
    return aNum - bNum;
  });

  // Calculate summary stats
  const totalTickets = user.periods.reduce((sum, period) => sum + period.tickets, 0);
  const totalTarget = user.periods.reduce((sum, period) => sum + period.target, 0);
  const avgPerPeriod = totalTickets / 13;
  const targetAchievement = totalTarget > 0 ? (totalTickets / totalTarget) * 100 : 0;

  return (
    <Card className="h-[310px]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          <span className="truncate">{user.personName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chart */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sortedPeriods}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                fontSize={10}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                fontSize={10}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {/* //<Legend /> */}
              <Bar
                dataKey="tickets"
                fill="hsl(var(--primary))"
                name={kpiType === 'created' ? t("dashboard.departmentUserKPI.ticketsCreated") : t("dashboard.departmentUserKPI.ticketsAssigned")}
                radius={[2, 2, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name={t("dashboard.departmentUserKPI.target")}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs ml-10">
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{t("dashboard.departmentUserKPI.totalTickets")}:</span>
            <span className="font-medium">{totalTickets}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{t("dashboard.departmentUserKPI.avgPerPeriod")}:</span>
            <span className="font-medium">{avgPerPeriod.toFixed(1)}</span>
          </div>
          <div className="col-span-2 flex items-center space-x-1">
            <span className="text-muted-foreground">{t("dashboard.departmentUserKPI.targetAchievement")}:</span>
            <span className={`font-medium ${targetAchievement >= 100 ? 'text-green-600' : targetAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {targetAchievement.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserKPICard;
